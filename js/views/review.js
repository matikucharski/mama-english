import { h, sample, confetti, plural, setChildren } from '../ui.js';
import { state, save, recordActivity } from '../store.js';
import { categories, categoriesById, phrasesById } from '../content.js';
import { dueIds, learnedIds, grade, phraseState } from '../srs.js';
import { celebrateNewBadges } from '../badges.js';
import { flashcard } from './flashcards.js';
import { makeQuestion, renderQuestion } from './quiz.js';

const SESSION_SIZE = 15;

export function reviewView() {
  const due = dueIds();
  const learned = learnedIds();
  const buckets = [
    { label: 'Świeże', hint: '1–2 dni', boxes: [1, 2], color: 'var(--bad)' },
    { label: 'Utrwalane', hint: '4–8 dni', boxes: [3, 4], color: 'var(--warn)' },
    { label: 'Na dłużej', hint: '16+ dni', boxes: [5, 6], color: 'var(--ok)' },
  ].map((b) => ({ ...b, n: learned.filter((id) => b.boxes.includes(phraseState(id).box)).length }));

  return h('div', {},
    h('header', { class: 'topbar' },
      h('h1', {}, 'Powtórki'),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Ustawienia' }, '⚙️'),
    ),
    !learned.length
      ? h('div', { class: 'card empty' },
          h('div', { class: 'e-emoji' }, '📭'),
          h('h2', {}, 'Jeszcze nic do powtórki'),
          h('p', {}, 'Zrób pierwszą lekcję – nauczone zdania będą tu wracać, zanim je zapomnisz.'),
          h('a', { class: 'btn', href: '#/categories', style: { marginTop: '16px' } }, 'Wybierz sytuację'))
      : h('div', { class: 'stack' },
          h('div', { class: 'card center' },
            h('div', { style: { fontSize: '54px' } }, due.length ? '🔁' : '✅'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginTop: '6px' } },
              due.length ? `${due.length} ${plural(due.length, 'zdanie czeka', 'zdania czekają', 'zdań czeka')}` : 'Wszystko powtórzone!'),
            h('p', { class: 'muted', style: { margin: '6px 0 16px' } },
              due.length ? 'Kilka minut dziennie wystarczy, żeby zdania zostały w głowie.' : 'Wróć jutro albo poćwicz losowe zdania.'),
            due.length
              ? h('a', { class: 'btn block', href: '#/review/due' }, `Zacznij (${Math.min(due.length, SESSION_SIZE)})`)
              : h('a', { class: 'btn ghost block', href: '#/review/all' }, '🎲 Losowe zdania'),
          ),
          h('div', { class: 'card' },
            h('b', {}, '🧠 Twoja pamięć'),
            h('div', { class: 'stats', style: { marginTop: '10px' } }, buckets.map((b) =>
              h('div', { class: 'stat', style: { boxShadow: 'none', background: 'var(--bg-2)' } },
                h('b', { style: { color: b.color } }, b.n),
                h('span', {}, b.label), h('br'), h('span', {}, b.hint)))),
          ),
          due.length ? h('a', { class: 'btn ghost block', href: '#/review/all' }, '🎲 Losowe zdania z nauczonych') : null,
        ),
    learned.length ? h('div', { class: 'section-title' }, 'Powtórz sytuację') : null,
    learned.length ? h('div', { class: 'stack' }, categories.map((cat) => {
      const n = cat.phrases.filter((p) => phraseState(p.id).box >= 1).length;
      if (!n) return null;
      return h('a', { class: 'card action-card', href: `#/review/cat/${cat.id}` },
        h('div', { class: 'emoji', style: { background: `color-mix(in srgb, ${cat.color} 30%, transparent)` } }, cat.emoji),
        h('div', { class: 'grow' }, h('h3', {}, cat.title), h('p', { class: 'small muted' }, `${n} ${plural(n, 'zdanie', 'zdania', 'zdań')}`)),
        h('span', { class: 'arrow' }, '›'));
    })) : null,
  );
}

export function reviewSessionView(mode, catId) {
  let ids;
  if (mode === 'due') ids = dueIds().slice(0, SESSION_SIZE);
  else if (mode === 'cat') ids = sample((categoriesById[catId]?.phrases || []).filter((p) => phraseState(p.id).box >= 1).map((p) => p.id), SESSION_SIZE);
  else ids = sample(learnedIds(), SESSION_SIZE);
  const items = ids.map((id) => phrasesById[id]).filter(Boolean);

  const root = h('div');
  let alive = true;
  root.cleanup = () => { alive = false; };
  if (!items.length) { location.replace('#/review'); return root; }

  const title = mode === 'cat' ? `${categoriesById[catId].emoji} ${categoriesById[catId].title}` : mode === 'due' ? '🔁 Powtórka' : '🎲 Losowe zdania';
  const queue = [...items];
  const retried = new Set();
  const total = items.length;
  let finished = 0, good = 0, step = 0;

  const shell = (...content) => {
    setChildren(root, 
      h('header', { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Zamknij', onclick: () => (location.hash = '#/review') }, '✕'),
        h('div', { class: 'grow' },
          h('div', { style: { fontWeight: 900, fontSize: '19px' } }, title),
          h('div', { class: 'progress', style: { marginTop: '6px' } }, h('i', { style: { width: `${(finished / total) * 100}%` } })),
        ),
      ),
      ...content,
    );
    window.scrollTo(0, 0);
  };

  const onResult = (p, res) => {
    if (res !== 'skip') {
      grade(p.id, res);
      state.stats.reviews += 1;
      save();
      recordActivity(1);
    }
    if (res === 'bad' && !retried.has(p.id)) { retried.add(p.id); queue.push(p); } else { finished++; if (res === 'good') good++; }
    next();
  };

  const next = () => {
    if (!alive) return;
    if (!queue.length) return done();
    const p = queue.shift();
    step++;
    const counter = `${Math.min(finished + 1, total)} / ${total}`;
    // mostly flashcards, every third item a quick multiple-choice
    if (step % 3 === 0) {
      shell(h('div', { class: 'counter' }, counter), renderQuestion(makeQuestion(p, p.prev && p.prev.who !== 'mom' && Math.random() < 0.5 ? 'reply' : 'choose-en', p.category.phrases), (res) => onResult(p, res)));
    } else {
      shell(flashcard(p, { counter, onGrade: (g) => onResult(p, g) }));
    }
  };

  const done = async () => {
    shell(h('div', { class: 'done-screen' },
      h('div', { class: 'big' }, '🌟'),
      h('h2', {}, 'Powtórka zrobiona!'),
      h('p', { class: 'muted', style: { marginTop: '10px' } }, `Pamiętasz od razu: ${good} z ${total}`),
      h('p', { class: 'muted' }, 'Zdania, które sprawiły kłopot, wrócą szybciej.'),
      h('div', { class: 'stack', style: { marginTop: '24px' } },
        dueIds().length ? h('a', { class: 'btn block', href: '#/review/due', onclick: () => setTimeout(() => dispatchEvent(new HashChangeEvent('hashchange')), 0) }, `Kolejne powtórki (${dueIds().length})`) : null,
        h('a', { class: 'btn ghost block', href: '#/home' }, 'Na start'),
      ),
    ));
    confetti(70);
    await celebrateNewBadges();
  };

  next();
  return root;
}
