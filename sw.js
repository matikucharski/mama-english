// Offline support: precache the app, then serve from cache and refresh in the background
// (stale-while-revalidate), so a new deploy shows up on the next launch.
const CACHE = 'mama-en-v1';

const DATA = ['morning', 'breakfast', 'dressing', 'commute', 'preschool', 'afterschool', 'lunch',
  'play', 'tidyup', 'siblings', 'praise', 'bath', 'bedtime', 'outing', 'sick'];

const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/srs.js', 'js/speech.js', 'js/badges.js', 'js/content.js',
  'js/views/home.js', 'js/views/categories.js', 'js/views/category.js', 'js/views/lesson.js',
  'js/views/flashcards.js', 'js/views/quiz.js', 'js/views/review.js', 'js/views/badges.js', 'js/views/settings.js',
  'js/data/index.js', ...DATA.map((d) => `js/data/${d}.js`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    if (cached) {
      e.waitUntil(network);
      return cached;
    }
    return network;
  }));
});
