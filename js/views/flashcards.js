// Flashcard (PL -> say it in EN -> reveal -> self-grade) plus shared mic/feedback widgets.

import { h, vibrate, setChildren } from '../ui.js';
import { state, save } from '../store.js';
import { speak, listen, stopListening, sttSupported, bestMatch } from '../speech.js';

export const micAvailable = () => sttSupported && state.settings.micEnabled;

const WHO_ICON = { mom: '👩', kid: '🧒', teacher: '🧑‍🏫' };

export function contextLine(phrase) {
  if (!phrase.prev) return null;
  return h('div', { class: 'ctx' }, `${WHO_ICON[phrase.prev.who] || '💬'} „${phrase.prev.pl}”`);
}

/** Mic button; calls onResult({ score, text }) after listening. */
export function micButton(target, onResult) {
  const status = h('p', { class: 'small muted center' }, 'Naciśnij i powiedz zdanie po angielsku');
  let busy = false;
  const btn = h('button', {
    class: 'mic-btn', 'aria-label': 'Mów',
    onclick: async () => {
      if (busy) { stopListening(); return; }
      busy = true;
      btn.classList.add('listening');
      status.textContent = 'Słucham… 👂';
      try {
        const alts = await listen();
        const best = bestMatch(target, alts);
        if (!alts.length) {
          status.textContent = 'Nic nie usłyszałam – spróbuj jeszcze raz.';
          return;
        }
        if (best.score >= 0.8) { state.stats.micOk += 1; save(); }
        status.textContent = `Usłyszałam: „${best.text}”`;
        onResult(best);
      } catch (e) {
        status.textContent = e.message === 'not-allowed'
          ? 'Brak dostępu do mikrofonu – zezwól w ustawieniach przeglądarki.'
          : e.message === 'network' ? 'Rozpoznawanie mowy wymaga internetu.' : 'Nie udało się użyć mikrofonu.';
      } finally {
        busy = false;
        btn.classList.remove('listening');
      }
    },
  }, '🎤');
  return h('div', {}, btn, status);
}

export function micVerdict(score) {
  if (score >= 0.8) return { kind: 'ok', text: '🎉 Świetnie powiedziane!' };
  if (score >= 0.6) return { kind: 'almost', text: '👍 Prawie! Posłuchaj jeszcze raz.' };
  return { kind: 'bad', text: '🙂 Jeszcze nie – posłuchaj i spróbuj znowu.' };
}

/** Bottom sheet after an answer. */
export function feedbackSheet(kind, title, phrase, onNext, extra) {
  document.querySelectorAll('.feedback').forEach((el) => el.remove());
  const sheet = h('div', { class: `feedback ${kind}` },
    h('div', { class: 'inner' },
      h('h3', {}, title),
      phrase ? h('div', { class: 'row', style: { margin: '10px 0 4px' } },
        h('div', { class: 'grow' },
          h('div', { style: { fontWeight: 800, fontSize: '18px' } }, phrase.en),
          h('div', { class: 'small muted' }, phrase.pl),
        ),
        h('button', { class: 'speak-btn', onclick: () => speak(phrase.en) }, '🔊'),
      ) : null,
      extra || null,
      h('button', { class: `btn block ${kind === 'bad' ? 'bad' : kind === 'almost' ? 'warn' : 'ok'}`, style: { marginTop: '12px' }, onclick: () => { sheet.remove(); onNext(); } }, 'Dalej'),
    ),
  );
  document.body.append(sheet);
  vibrate(kind === 'ok' ? 25 : [40, 60, 40]);
  if (phrase) speak(phrase.en);
  return sheet;
}

/**
 * Flashcard. onGrade('good'|'almost'|'bad') is called when the user rates themselves.
 */
export function flashcard(phrase, { counter, onGrade }) {
  const card = h('div', { class: 'card flash' });
  const showFront = () => {
    setChildren(card, 
      contextLine(phrase),
      h('div', { class: 'pl-big' }, phrase.pl),
      h('div', { class: 'hint' }, '🗣️ Powiedz to na głos po angielsku'),
      h('div', { class: 'stack', style: { marginTop: '10px' } },
        h('button', { class: 'btn block', onclick: () => showBack() }, 'Pokaż odpowiedź'),
        micAvailable() ? h('button', { class: 'btn ghost block', onclick: () => showMic() }, '🎤 Sprawdź wymowę') : null,
      ),
    );
  };
  const showMic = () => {
    setChildren(card, 
      h('div', { class: 'pl-big' }, phrase.pl),
      micButton(phrase.en, (res) => showBack(res)),
      h('button', { class: 'btn ghost sm', onclick: () => showBack() }, 'Pokaż odpowiedź'),
    );
  };
  const showBack = (micResult) => {
    const verdict = micResult && micVerdict(micResult.score);
    setChildren(card, 
      h('div', { class: 'small muted' }, phrase.pl),
      h('div', { class: 'en-big' }, phrase.en),
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px' } },
        h('button', { class: 'speak-btn big', 'aria-label': 'Posłuchaj', onclick: () => speak(phrase.en) }, '🔊'),
        h('button', { class: 'speak-btn', 'aria-label': 'Wolniej', onclick: () => speak(phrase.en, { slow: true }) }, '🐢'),
      ),
      verdict ? h('div', { class: 'ctx' }, `${verdict.text}${micResult.text ? ` Usłyszałam: „${micResult.text}”` : ''}`) : null,
      phrase.tip ? h('div', { class: 'tip' }, `💡 ${phrase.tip}`) : null,
      h('div', { class: 'grade' },
        h('button', { class: 'btn bad', onclick: () => onGrade('bad') }, h('span', {}, '😕'), 'Jeszcze nie'),
        h('button', { class: 'btn warn', onclick: () => onGrade('almost') }, h('span', {}, '🤔'), 'Prawie'),
        h('button', { class: 'btn ok', onclick: () => onGrade('good') }, h('span', {}, '😊'), 'Umiem'),
      ),
    );
    speak(phrase.en);
  };
  showFront();
  return h('div', {}, counter ? h('div', { class: 'counter' }, counter) : null, card);
}
