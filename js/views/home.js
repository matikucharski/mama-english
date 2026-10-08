import { h, progressBar, toast, vibrate, plural } from '../ui.js';
import { state, save, today, currentStreak, dailyDone, recordActivity } from '../store.js';
import { allLessons, allPhrases, phrasesById } from '../content.js';
import { dueIds, learnedIds, masteredIds } from '../srs.js';
import { speak } from '../speech.js';
import { celebrateNewBadges } from '../badges.js';

function greeting() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Dobranoc 🌙';
  if (hr < 12) return 'Dzień dobry ☀️';
  if (hr < 18) return 'Cześć 👋';
  return 'Dobry wieczór 🌙';
}

function hash(str) {
  let x = 0;
  for (const c of str) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return x;
}

let phraseOffset = 0;

function phraseOfTheDay() {
  const learned = learnedIds().map((id) => phrasesById[id]).filter(Boolean);
  const pool = learned.length ? learned : allLessons[0].phrases;
  return pool[(hash(today()) + phraseOffset) % pool.length];
}

function nextLesson() {
  return allLessons.find((l) => !state.lessons[l.id]) || null;
}

export function homeView() {
  const root = h('div');
  const due = dueIds().length;
  const done = dailyDone();
  const goal = state.settings.dailyGoal;
  const next = nextLesson();

  const phraseBox = h('div');
  const renderPhrase = () => {
    const p = phraseOfTheDay();
    const used = state.usedInLife[p.id];
    const usedToday = used?.last === today();
    const learnedAny = learnedIds().length > 0;
    phraseBox.replaceChildren(h('section', { class: 'hero' },
      h('div', { class: 'label' }, '💡 Zdanie na dziś'),
      h('div', { class: 'en' }, p.en),
      h('div', { class: 'pl' }, p.pl),
      h('div', { class: 'actions' },
        h('button', { class: 'speak-btn', 'aria-label': 'Posłuchaj', onclick: () => speak(p.en) }, '🔊'),
        h('button', {
          class: `btn ${usedToday ? 'done' : ''}`,
          disabled: usedToday || !learnedAny,
          onclick: async () => {
            state.usedInLife[p.id] = { count: (used?.count || 0) + 1, last: today() };
            save();
            recordActivity(0);
            vibrate(30);
            toast('Brawo! Tak trzymaj 💪');
            renderPhrase();
            await celebrateNewBadges();
          },
        }, usedToday ? '✅ Użyte dziś' : 'Użyłam dziś!'),
        h('button', { class: 'speak-btn', 'aria-label': 'Inne zdanie', onclick: () => { phraseOffset++; renderPhrase(); } }, '↻'),
      ),
      h('div', { class: 'used' }, learnedAny
        ? (used?.count ? `Użyte w życiu: ${used.count}×` : 'Powiedz to dziś dzieciom i kliknij „Użyłam dziś!”')
        : 'Po pierwszej lekcji pojawią się tu zdania, których się nauczysz.'),
    ));
  };
  renderPhrase();

  root.append(
    h('header', { class: 'topbar' },
      h('h1', {}, ''),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Ustawienia' }, '⚙️'),
    ),
    h('div', { class: 'hello' },
      h('h1', {}, greeting()),
      h('p', {}, 'Codzienny angielski z dziećmi'),
    ),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, `🔥 ${currentStreak()}`), h('span', {}, plural(currentStreak(), 'dzień z rzędu', 'dni z rzędu', 'dni z rzędu'))),
      h('div', { class: 'stat' }, h('b', {}, learnedIds().length), h('span', {}, `nauczone z ${allPhrases.length}`)),
      h('div', { class: 'stat' }, h('b', {}, masteredIds().length), h('span', {}, 'opanowane')),
    ),
    h('div', { class: 'card', style: { marginTop: '14px' } },
      h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('b', { class: 'grow' }, '🎯 Cel na dziś'),
        h('span', { class: 'muted small' }, `${Math.min(done, goal)} / ${goal}`),
      ),
      progressBar(done / goal, done >= goal ? 'ok' : ''),
      done >= goal ? h('p', { class: 'small muted', style: { marginTop: '8px' } }, 'Cel osiągnięty – super! 🎉') : null,
    ),
    h('div', { class: 'section-title' }, 'Na dziś'),
    h('div', { class: 'stack' },
      phraseBox,
      due > 0 ? actionCard('🔁', '#FFE3D9', `Powtórki: ${due}`, 'Odśwież zdania, zanim uciekną z pamięci', '#/review/due') : null,
      next ? actionCard(next.category.emoji, colorSoft(next.category.color), next.title, `${next.category.title} · lekcja ${next.number}`, `#/lesson/${next.id}`, state.lessons[allLessons[0].id] ? 'Następna lekcja' : 'Zacznij od tej lekcji')
        : actionCard('🏆', '#DDF5E8', 'Wszystkie lekcje ukończone!', 'Teraz powtarzaj i używaj zdań na co dzień', '#/review'),
    ),
  );
  return root;
}

function colorSoft(hex) {
  return `color-mix(in srgb, ${hex} 30%, transparent)`;
}

function actionCard(emoji, bg, title, sub, href, label) {
  return h('a', { class: 'card action-card', href },
    h('div', { class: 'emoji', style: { background: bg } }, emoji),
    h('div', { class: 'grow' },
      label ? h('div', { class: 'step-label' }, label) : null,
      h('h3', {}, title),
      h('p', { class: 'small muted' }, sub),
    ),
    h('span', { class: 'arrow' }, '›'),
  );
}
