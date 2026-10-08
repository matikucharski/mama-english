import { h, stars, confetti, setChildren } from '../ui.js';
import { state, save, today, recordActivity } from '../store.js';
import { lessonsById, allLessons } from '../content.js';
import { grade, phraseState } from '../srs.js';
import { speak, stopSpeaking } from '../speech.js';
import { celebrateNewBadges } from '../badges.js';
import { flashcard } from './flashcards.js';
import { buildQuiz, renderQuestion } from './quiz.js';

const AVATAR = { mom: '👩', kid: '🧒', teacher: '🧑‍🏫' };
const STEPS = ['Posłuchaj', 'Poznaj zdania', 'Ćwicz'];

export function lessonView(id) {
  const lesson = lessonsById[id];
  if (!lesson) { location.replace('#/categories'); return h('div'); }
  const cat = lesson.category;
  const root = h('div');
  let alive = true;
  root.cleanup = () => { alive = false; };

  const shell = (stepIdx, ...content) => {
    setChildren(root, 
      h('header', { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Zamknij', onclick: () => (location.hash = `#/cat/${cat.id}`) }, '✕'),
        h('div', { class: 'grow' },
          h('div', { class: 'step-label' }, stepIdx < STEPS.length ? `Krok ${stepIdx + 1} z 3 · ${STEPS[stepIdx]}` : 'Gotowe!'),
          h('div', { style: { fontWeight: 900, fontSize: '19px' } }, `${cat.emoji} ${lesson.title}`),
        ),
      ),
      h('div', { class: 'steps' }, STEPS.map((_, i) => h('span', { class: i <= stepIdx ? 'on' : '' }))),
      ...content,
    );
    window.scrollTo(0, 0);
  };

  // ---------- step 1: listen to the dialog ----------
  const listenStep = () => {
    let slow = false;
    let playing = false;
    const chat = h('div', { class: `chat ${state.settings.showPl ? '' : 'hide-pl'}` });
    const bubbles = lesson.lines.map((line) => {
      const b = h('div', { class: `bubble ${line.key ? 'key' : ''}`, onclick: () => { stopAll(); highlight(b); speak(line.en, { who: line.who, slow }).then(() => b.classList.remove('playing')); } },
        h('div', { class: 'en' }, line.en),
        h('div', { class: 'pl' }, line.pl),
        line.tip ? h('div', { class: 'tip' }, `💡 ${line.tip}`) : null,
      );
      chat.append(h('div', { class: `bubble-row ${line.who}` }, h('div', { class: 'avatar' }, AVATAR[line.who] || '💬'), b));
      return b;
    });
    const highlight = (b) => { bubbles.forEach((x) => x.classList.remove('playing')); b?.classList.add('playing'); };
    const stopAll = () => { playing = false; stopSpeaking(); highlight(null); playBtn.textContent = '▶ Odtwórz dialog'; };

    const playBtn = h('button', {
      class: 'chip on',
      onclick: async () => {
        if (playing) { stopAll(); return; }
        playing = true;
        playBtn.textContent = '⏹ Zatrzymaj';
        for (let i = 0; i < lesson.lines.length; i++) {
          if (!playing || !alive) break;
          highlight(bubbles[i]);
          bubbles[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          await speak(lesson.lines[i].en, { who: lesson.lines[i].who, slow });
          await new Promise((r) => setTimeout(r, 450));
        }
        if (alive) stopAll();
      },
    }, '▶ Odtwórz dialog');
    const slowBtn = h('button', { class: 'chip', onclick: () => { slow = !slow; slowBtn.classList.toggle('on', slow); } }, '🐢 Wolniej');
    const plBtn = h('button', {
      class: `chip ${state.settings.showPl ? 'on' : ''}`,
      onclick: () => { const hidden = chat.classList.toggle('hide-pl'); plBtn.classList.toggle('on', !hidden); },
    }, '🇵🇱 Tłumaczenie');

    shell(0,
      lesson.scene ? h('div', { class: 'scene' }, `🎬 ${lesson.scene}`) : null,
      h('div', { class: 'toolbar' }, playBtn, slowBtn, plBtn),
      h('p', { class: 'small muted', style: { margin: '0 4px 8px' } }, 'Stuknij dymek, żeby go usłyszeć. ★ = zdanie do nauki.'),
      chat,
      h('button', { class: 'btn block', onclick: () => { stopAll(); cardsStep(); } }, 'Dalej: poznaj zdania →'),
    );
  };

  // ---------- step 2: flashcards ----------
  const cardsStep = () => {
    const queue = [...lesson.phrases];
    const retries = new Map();
    const total = queue.length;
    let doneCount = 0;
    const next = () => {
      if (!alive) return;
      if (!queue.length) return quizStep();
      const p = queue.shift();
      shell(1, flashcard(p, {
        counter: `Zdanie ${Math.min(doneCount + 1, total)} z ${total}`,
        onGrade: (g) => {
          grade(p.id, g);
          recordActivity(1);
          if (g === 'bad' && (retries.get(p.id) || 0) < 1) {
            retries.set(p.id, 1);
            queue.push(p);
          } else {
            doneCount++;
          }
          next();
        },
      }));
    };
    next();
  };

  // ---------- step 3: quiz ----------
  const quizStep = () => {
    const questions = buildQuiz(lesson.phrases, cat.phrases);
    let i = 0, correct = 0, counted = 0;
    const next = () => {
      if (!alive) return;
      if (i >= questions.length) return finish(counted ? correct / counted : 1);
      const q = questions[i];
      shell(2,
        h('div', { class: 'counter' }, `Zadanie ${i + 1} z ${questions.length}`),
        renderQuestion(q, (res) => {
          if (res !== 'skip') {
            counted++;
            if (res === 'good') correct++;
            else if (res === 'almost') correct += 0.5;
            if (res === 'bad' && phraseState(q.phrase.id).box > 0) grade(q.phrase.id, 'bad');
            recordActivity(1);
          }
          i++;
          next();
        }),
      );
    };
    next();
  };

  // ---------- done ----------
  const finish = async (score) => {
    const s = score >= 0.9 ? 3 : score >= 0.7 ? 2 : 1;
    const prev = state.lessons[lesson.id];
    state.lessons[lesson.id] = { stars: Math.max(prev?.stars || 0, s), completedAt: prev?.completedAt || today() };
    save();

    const idx = allLessons.indexOf(lesson);
    const nextLesson = allLessons.slice(idx + 1).find((l) => !state.lessons[l.id]) || allLessons[idx + 1];
    const msg = s === 3 ? 'Fantastycznie!' : s === 2 ? 'Dobra robota!' : 'Udało się! Powtórki pomogą zapamiętać.';
    shell(3, h('div', { class: 'done-screen' },
      h('div', { class: 'big' }, s === 3 ? '🏆' : s === 2 ? '🎉' : '👍'),
      h('h2', {}, msg),
      h('div', { class: 'stars-big', style: { color: 'var(--warn)' } }, stars(s)),
      h('p', { class: 'muted' }, `Poprawne odpowiedzi: ${Math.round(score * 100)}%`),
      h('p', { class: 'muted', style: { marginTop: '6px' } }, `Nauczone zdania (${lesson.phrases.length}) trafiły do powtórek.`),
      h('div', { class: 'stack', style: { marginTop: '24px' } },
        nextLesson ? h('a', { class: 'btn block', href: `#/lesson/${nextLesson.id}` }, `Następna: ${nextLesson.category.emoji} ${nextLesson.title}`) : null,
        h('button', { class: 'btn ghost block', onclick: () => listenStep() }, '🔁 Jeszcze raz dialog'),
        h('a', { class: 'btn ghost block', href: `#/cat/${cat.id}` }, `Wróć: ${cat.title}`),
      ),
    ));
    if (s >= 2) confetti(s === 3 ? 120 : 60);
    speak(s === 3 ? 'Amazing! Great job!' : 'Well done!');
    await celebrateNewBadges();
  };

  listenStep();
  return root;
}
