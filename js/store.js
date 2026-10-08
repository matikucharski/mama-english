// Progress persisted in localStorage under one versioned key.

const KEY = 'mama-en.v1';
const VERSION = 1;

function defaults() {
  return {
    version: VERSION,
    phrases: {},      // id -> { box, due, seen, ok, bad, last }
    lessons: {},      // id -> { stars, completedAt }
    badges: {},       // badgeId -> 'YYYY-MM-DD'
    streak: { current: 0, best: 0, lastDay: null },
    daily: { day: null, done: 0 },
    usedInLife: {},   // phraseId -> { count, last }
    stats: { reviews: 0, micOk: 0 },
    settings: { rate: 0.9, voiceURI: null, showPl: true, micEnabled: true, dailyGoal: 10 },
  };
}

function merge(base, saved) {
  const out = { ...base, ...saved };
  for (const k of ['streak', 'daily', 'stats', 'settings']) out[k] = { ...base[k], ...(saved?.[k] || {}) };
  return out;
}

function migrate(data) {
  // Future schema changes go here, keyed on data.version.
  return { ...data, version: VERSION };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return merge(defaults(), migrate(JSON.parse(raw)));
  } catch {
    return defaults();
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Nie udało się zapisać postępu', e);
  }
}

// ---------- dates (local time, YYYY-MM-DD) ----------
export function today() {
  return dayString(new Date());
}

export function dayString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return dayString(new Date(y, m - 1, d + n));
}

// ---------- activity / streak / daily goal ----------
export function recordActivity(n = 1) {
  const t = today();
  if (state.daily.day !== t) state.daily = { day: t, done: 0 };
  state.daily.done += n;

  const s = state.streak;
  if (s.lastDay !== t) {
    s.current = s.lastDay === addDays(t, -1) ? s.current + 1 : 1;
    s.lastDay = t;
    s.best = Math.max(s.best, s.current);
  }
  save();
}

export function currentStreak() {
  const s = state.streak;
  if (!s.lastDay) return 0;
  const t = today();
  return s.lastDay === t || s.lastDay === addDays(t, -1) ? s.current : 0;
}

export function dailyDone() {
  return state.daily.day === today() ? state.daily.done : 0;
}

// ---------- backup ----------
export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.phrases) throw new Error('To nie jest plik z postępem.');
  const next = merge(defaults(), migrate(data));
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
  save();
}

export function resetAll() {
  const keepSettings = state.settings;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, defaults(), { settings: keepSettings });
  save();
}

export async function requestPersistence() {
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
}
