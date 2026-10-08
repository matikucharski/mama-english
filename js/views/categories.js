import { h, ring } from '../ui.js';
import { state } from '../store.js';
import { categories } from '../content.js';
import { isLearned } from '../srs.js';
import { categoryMedal } from '../badges.js';

export function categoryProgress(cat) {
  const learned = cat.phrases.filter((p) => isLearned(p.id)).length;
  const lessons = cat.lessons.filter((l) => state.lessons[l.id]).length;
  return { learned, total: cat.phrases.length, lessons, pct: cat.phrases.length ? learned / cat.phrases.length : 0 };
}

export function categoriesView() {
  return h('div', {},
    h('header', { class: 'topbar' },
      h('h1', {}, 'Sytuacje'),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Ustawienia' }, '⚙️'),
    ),
    h('p', { class: 'muted', style: { margin: '0 4px 16px' } }, 'Wybierz sytuację z życia codziennego.'),
    h('div', { class: 'cat-grid' }, categories.map((cat) => {
      const pr = categoryProgress(cat);
      return h('a', { class: 'cat-card', href: `#/cat/${cat.id}`, '--c': cat.color },
        h('span', { class: 'medal' }, categoryMedal(cat)),
        h('div', {},
          h('div', { class: 'emoji' }, cat.emoji),
          h('h3', {}, cat.title),
        ),
        h('div', { class: 'meta' },
          h('span', {}, `${pr.lessons}/${cat.lessons.length} lekcji`),
          ring(pr.pct, cat.color, 40),
        ),
      );
    })),
  );
}
