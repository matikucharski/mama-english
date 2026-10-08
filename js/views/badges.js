import { h, modal } from '../ui.js';
import { state } from '../store.js';
import { categories } from '../content.js';
import { generalBadges, categoryBadges, allBadges } from '../badges.js';

function fmt(day) {
  const [y, m, d] = day.split('-');
  return `${d}.${m}.${y}`;
}

function badgeTile(b, emoji, title) {
  const got = state.badges[b.id];
  return h('button', {
    class: `badge ${got ? '' : 'locked'}`,
    onclick: () => modal({
      emoji: got ? emoji : '🔒',
      title: b.cat ? `${b.emoji} ${b.cat.title}` : b.title,
      text: `${b.desc}${got ? `\nZdobyta: ${fmt(got)}` : ''}`,
      buttons: [{ label: 'OK', primary: true }],
    }),
  },
    h('div', { class: 'b-emoji' }, emoji),
    h('div', { class: 'b-title' }, title),
  );
}

export function badgesView() {
  const earned = allBadges.filter((b) => state.badges[b.id]).length;
  return h('div', {},
    h('header', { class: 'topbar' },
      h('h1', {}, 'Odznaki'),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Ustawienia' }, '⚙️'),
    ),
    h('div', { class: 'card row' },
      h('div', { style: { fontSize: '44px' } }, '🏅'),
      h('div', { class: 'grow' },
        h('b', { style: { fontSize: '22px' } }, `${earned} / ${allBadges.length}`),
        h('p', { class: 'small muted' }, 'Stuknij odznakę, żeby zobaczyć, jak ją zdobyć.'),
      ),
    ),
    h('div', { class: 'section-title' }, 'Ogólne'),
    h('div', { class: 'badge-grid' }, generalBadges.map((b) => badgeTile(b, b.emoji, b.title))),
    h('div', { class: 'section-title' }, 'Sytuacje'),
    h('p', { class: 'small muted', style: { margin: '-4px 4px 10px' } }, '🥉 pierwsza lekcja · 🥈 wszystkie lekcje · 🥇 wszystkie zdania opanowane'),
    h('div', { class: 'stack' }, categories.map((cat) => h('div', { class: 'card', style: { padding: '12px' } },
      h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '24px' } }, cat.emoji), h('b', {}, cat.title)),
      h('div', { class: 'badge-grid', style: { gridTemplateColumns: 'repeat(3, 1fr)' } },
        categoryBadges.filter((b) => b.cat === cat).map((b) =>
          badgeTile(b, b.emoji, ['', 'Brąz', 'Srebro', 'Złoto'][b.level]))),
    ))),
  );
}
