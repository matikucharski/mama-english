import { initVoices, stopSpeaking, stopListening } from './speech.js';
import { requestPersistence } from './store.js';
import { dueIds } from './srs.js';
import { checkBadges } from './badges.js';
import { homeView } from './views/home.js';
import { categoriesView } from './views/categories.js';
import { categoryView } from './views/category.js';
import { lessonView } from './views/lesson.js';
import { reviewView, reviewSessionView } from './views/review.js';
import { badgesView } from './views/badges.js';
import { settingsView } from './views/settings.js';

const routes = [
  [/^#\/home$/, homeView, 'home'],
  [/^#\/categories$/, categoriesView, 'categories'],
  [/^#\/cat\/([\w-]+)$/, categoryView, 'categories'],
  [/^#\/lesson\/([\w-]+)$/, lessonView, null],
  [/^#\/review$/, reviewView, 'review'],
  [/^#\/review\/(due|all|cat)(?:\/([\w-]+))?$/, reviewSessionView, null],
  [/^#\/badges$/, badgesView, 'badges'],
  [/^#\/settings$/, settingsView, null],
];

const app = document.getElementById('app');
let cleanup = null;

function render() {
  const hash = location.hash || '#/home';
  const match = routes.map(([re, view, tab]) => [hash.match(re), view, tab]).find(([m]) => m);
  if (!match) { location.replace('#/home'); return; }
  const [m, view, tab] = match;

  stopSpeaking();
  stopListening();
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  document.querySelectorAll('.feedback, .modal-back').forEach((el) => el.remove());
  document.body.classList.toggle('immersive', !tab && hash !== '#/settings');

  const node = view(...m.slice(1));
  node.classList.add('view');
  cleanup = node.cleanup;
  app.replaceChildren(node);
  window.scrollTo(0, 0);

  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  updateDueBadge();
}

export function updateDueBadge() {
  const n = dueIds().length;
  const el = document.getElementById('dueBadge');
  el.hidden = n === 0;
  el.textContent = n > 99 ? '99+' : n;
}

window.addEventListener('hashchange', render);
initVoices();
requestPersistence();
checkBadges(); // silently catch up (e.g. after an import)
render();

// no service worker during local development, so edits show up immediately
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isLocal) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
