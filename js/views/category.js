import { h, stars, ring } from '../ui.js';
import { state } from '../store.js';
import { categoriesById } from '../content.js';
import { isLearned } from '../srs.js';
import { categoryMedal } from '../badges.js';
import { categoryProgress } from './categories.js';

export function categoryView(id) {
  const cat = categoriesById[id];
  if (!cat) { location.replace('#/categories'); return h('div'); }
  const pr = categoryProgress(cat);

  return h('div', {},
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Wstecz', onclick: () => (location.hash = '#/categories') }, '←'),
      h('h1', {}, ''),
    ),
    h('section', { class: 'cat-hero', '--c': cat.color },
      h('div', { class: 'row' },
        h('div', { class: 'grow' },
          h('div', { class: 'emoji' }, cat.emoji),
          h('h2', {}, `${cat.title} ${categoryMedal(cat)}`),
          h('p', { class: 'muted' }, cat.desc || ''),
        ),
        ring(pr.pct, cat.color, 70),
      ),
      h('p', { class: 'small muted', style: { marginTop: '10px' } }, `Nauczone zdania: ${pr.learned} z ${pr.total}`),
    ),
    h('div', { class: 'section-title' }, 'Dialogi'),
    h('div', { class: 'stack' }, cat.lessons.map((l) => {
      const done = state.lessons[l.id];
      const learned = l.phrases.filter((p) => isLearned(p.id)).length;
      return h('a', { class: `card lesson-item ${done ? 'done' : ''}`, href: `#/lesson/${l.id}` },
        h('div', { class: 'num' }, done ? '✓' : l.number),
        h('div', { class: 'grow' },
          h('h3', {}, l.title),
          h('p', {}, l.scene || `${l.phrases.length} zdań do nauki`),
          h('p', {}, `${learned}/${l.phrases.length} zdań`),
        ),
        h('span', { class: 'stars', style: { color: 'var(--warn)' } }, done ? stars(done.stars) : ''),
      );
    })),
    h('div', { style: { marginTop: '20px' } },
      h('a', {
        class: 'btn ghost block',
        href: pr.learned ? `#/review/cat/${cat.id}` : null,
        disabled: !pr.learned,
      }, '🔁 Powtórz zdania z tej sytuacji'),
    ),
  );
}
