// Quiz questions: choose-en, reply, order, listen, say.

import { h, shuffle, sample } from '../ui.js';
import { allPhrases } from '../content.js';
import { speak, normalize } from '../speech.js';
import { feedbackSheet, micAvailable, micButton, micVerdict, contextLine } from './flashcards.js';

const WHO = { kid: 'Dziecko mówi', teacher: 'Słyszysz', mom: 'Mówisz' };

function distractors(phrase, pool, field, n = 2) {
  const seen = new Set([phrase[field]]);
  const out = [];
  for (const p of [...shuffle(pool), ...shuffle(allPhrases)]) {
    if (out.length >= n) break;
    if (seen.has(p[field])) continue;
    seen.add(p[field]);
    out.push(p[field]);
  }
  return out;
}

const wordsOf = (en) => en.split(/\s+/).filter(Boolean);

export function availableTypes(phrase) {
  const t = ['choose-en', 'listen'];
  if (phrase.prev && phrase.prev.who !== 'mom') t.push('reply');
  const n = wordsOf(phrase.en).length;
  if (n >= 3 && n <= 9) t.push('order');
  return t;
}

export function makeQuestion(phrase, type, pool) {
  const q = { type, phrase };
  if (type === 'choose-en' || type === 'reply') q.options = shuffle([phrase.en, ...distractors(phrase, pool, 'en')]);
  if (type === 'listen') q.options = shuffle([phrase.pl, ...distractors(phrase, pool, 'pl')]);
  if (type === 'order') q.tiles = shuffle(wordsOf(phrase.en).map((w, i) => ({ w, i })));
  return q;
}

/** Builds a varied set of questions for a lesson. */
export function buildQuiz(phrases, pool) {
  const order = ['choose-en', 'reply', 'order', 'listen'];
  const n = Math.min(8, Math.max(6, phrases.length + 2));
  const list = [];
  let k = 0;
  const ph = shuffle(phrases);
  for (let i = 0; i < n; i++) {
    const p = ph[i % ph.length];
    const types = availableTypes(p);
    let type;
    for (let j = 0; j < order.length; j++) {
      const t = order[(k + j) % order.length];
      if (types.includes(t)) { type = t; k = (k + j + 1) % order.length; break; }
    }
    list.push(makeQuestion(p, type, pool));
  }
  if (micAvailable()) list.splice(Math.floor(n / 2), 0, makeQuestion(sample(phrases, 1)[0], 'say', pool));
  return list;
}

/**
 * Renders a question. done(result) is called after the user dismisses the feedback:
 * result = 'good' | 'almost' | 'bad' | 'skip'
 */
export function renderQuestion(q, done) {
  const { phrase } = q;
  const wrap = h('div', { class: 'card' });
  let answered = false;

  const finish = (result, title) => {
    answered = true;
    const kind = result === 'good' ? 'ok' : result === 'almost' ? 'almost' : 'bad';
    feedbackSheet(kind, title || (result === 'good' ? '✅ Świetnie!' : '❌ Prawidłowa odpowiedź:'), phrase, () => done(result));
  };

  const optionButtons = (options, correct) => h('div', { class: 'options' }, options.map((opt) => {
    const b = h('button', {
      class: 'option',
      onclick: () => {
        if (answered) return;
        const ok = opt === correct;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) wrap.querySelectorAll('.option').forEach((o) => { if (o.textContent === correct) o.classList.add('correct'); });
        wrap.querySelectorAll('.option').forEach((o) => o.setAttribute('disabled', ''));
        finish(ok ? 'good' : 'bad');
      },
    }, opt);
    return b;
  }));

  if (q.type === 'choose-en') {
    wrap.append(
      h('div', { class: 'q-title' }, '💬 Co powiesz?'),
      contextLine(phrase),
      h('div', { class: 'q-prompt' }, phrase.pl),
      optionButtons(q.options, phrase.en),
    );
  } else if (q.type === 'reply') {
    const prev = phrase.prev;
    wrap.append(
      h('div', { class: 'q-title' }, `👂 ${WHO[prev.who] || 'Słyszysz'} – co odpowiesz?`),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'speak-btn', onclick: () => speak(prev.en, { who: prev.who }) }, '🔊'),
        h('div', { class: 'grow' },
          h('div', { class: 'q-prompt', style: { marginTop: 0 } }, prev.en),
          h('div', { class: 'q-sub small' }, prev.pl),
        ),
      ),
      optionButtons(q.options, phrase.en),
    );
    setTimeout(() => speak(prev.en, { who: prev.who }), 300);
  } else if (q.type === 'listen') {
    wrap.append(
      h('div', { class: 'q-title' }, '🎧 Posłuchaj i wybierz znaczenie'),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px', margin: '18px 0 4px' } },
        h('button', { class: 'speak-btn big', onclick: () => speak(phrase.en) }, '🔊'),
        h('button', { class: 'speak-btn', onclick: () => speak(phrase.en, { slow: true }) }, '🐢'),
      ),
      optionButtons(q.options, phrase.pl),
    );
    setTimeout(() => speak(phrase.en), 300);
  } else if (q.type === 'order') {
    const picked = [];
    const answer = h('div', { class: 'answer-line' });
    const bank = h('div', { class: 'tiles' });
    const check = h('button', { class: 'btn block', disabled: true }, 'Sprawdź');
    const redraw = () => {
      answer.replaceChildren(...picked.map((t, idx) => h('button', {
        class: 'tile', onclick: () => { if (!answered) { picked.splice(idx, 1); redraw(); } },
      }, t.w)));
      bank.replaceChildren(...q.tiles.map((t) => h('button', {
        class: `tile ${picked.includes(t) ? 'used' : ''}`,
        onclick: () => { if (!answered && !picked.includes(t)) { picked.push(t); redraw(); } },
      }, t.w)));
      check.disabled = picked.length !== q.tiles.length || answered;
    };
    check.onclick = () => {
      const ok = normalize(picked.map((t) => t.w).join(' ')).join(' ') === normalize(phrase.en).join(' ');
      finish(ok ? 'good' : 'bad');
    };
    redraw();
    wrap.append(
      h('div', { class: 'q-title' }, '🧩 Ułóż zdanie'),
      h('div', { class: 'q-prompt' }, phrase.pl),
      answer, bank,
      h('div', { style: { marginTop: '18px' } }, check),
    );
  } else if (q.type === 'say') {
    wrap.append(
      h('div', { class: 'q-title' }, '🎤 Powiedz to po angielsku'),
      contextLine(phrase),
      h('div', { class: 'q-prompt' }, phrase.pl),
      micButton(phrase.en, (res) => {
        const v = micVerdict(res.score);
        finish(v.kind === 'ok' ? 'good' : v.kind, v.text);
      }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost sm', onclick: () => speak(phrase.en) }, '🔊 Podpowiedź'),
        h('button', { class: 'btn ghost sm', onclick: () => { if (!answered) { answered = true; done('skip'); } } }, 'Pomiń'),
      ),
    );
  }
  return wrap;
}
