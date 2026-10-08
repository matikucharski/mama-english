// Badge definitions and award logic.

import { state, save, today } from './store.js';
import { categories } from './content.js';
import { learnedIds, masteredIds, isMastered } from './srs.js';
import { modal, confetti } from './ui.js';

const lessonsDone = () => Object.keys(state.lessons).length;
const lifeUses = () => Object.values(state.usedInLife).reduce((s, u) => s + u.count, 0);
const threeStars = () => Object.values(state.lessons).filter((l) => l.stars >= 3).length;

export const generalBadges = [
  { id: 'first-lesson', emoji: '🌱', title: 'Pierwszy krok', desc: 'Ukończ pierwszą lekcję.', check: () => lessonsDone() >= 1 },
  { id: 'streak-3', emoji: '🔥', title: '3 dni z rzędu', desc: 'Ucz się 3 dni pod rząd.', check: () => state.streak.best >= 3 },
  { id: 'streak-7', emoji: '🔥', title: 'Tydzień nauki', desc: 'Ucz się 7 dni pod rząd.', check: () => state.streak.best >= 7 },
  { id: 'streak-30', emoji: '🌋', title: 'Miesiąc nauki', desc: 'Ucz się 30 dni pod rząd.', check: () => state.streak.best >= 30 },
  { id: 'learned-10', emoji: '📗', title: '10 zdań', desc: 'Naucz się 10 zdań.', check: () => learnedIds().length >= 10 },
  { id: 'learned-50', emoji: '📘', title: '50 zdań', desc: 'Naucz się 50 zdań.', check: () => learnedIds().length >= 50 },
  { id: 'learned-150', emoji: '📙', title: '150 zdań', desc: 'Naucz się 150 zdań.', check: () => learnedIds().length >= 150 },
  { id: 'learned-300', emoji: '📚', title: '300 zdań', desc: 'Naucz się 300 zdań.', check: () => learnedIds().length >= 300 },
  { id: 'mastered-25', emoji: '🧠', title: 'Pamięć jak słoń', desc: 'Opanuj na stałe 25 zdań (kilka udanych powtórek).', check: () => masteredIds().length >= 25 },
  { id: 'mastered-100', emoji: '🐘', title: 'Mistrzyni pamięci', desc: 'Opanuj na stałe 100 zdań.', check: () => masteredIds().length >= 100 },
  { id: 'life-1', emoji: '🏠', title: 'Pierwsze w domu', desc: 'Użyj zdania w prawdziwej rozmowie z dziećmi.', check: () => lifeUses() >= 1 },
  { id: 'life-10', emoji: '🗣️', title: 'Mówię po angielsku', desc: 'Użyj zdań w życiu 10 razy.', check: () => lifeUses() >= 10 },
  { id: 'life-50', emoji: '🦸‍♀️', title: 'Super mama', desc: 'Użyj zdań w życiu 50 razy.', check: () => lifeUses() >= 50 },
  { id: 'mic-1', emoji: '🎤', title: 'Pierwsze słowa', desc: 'Powiedz poprawnie zdanie do mikrofonu.', check: () => state.stats.micOk >= 1 },
  { id: 'mic-25', emoji: '🎙️', title: 'Dobra wymowa', desc: 'Powiedz poprawnie 25 zdań do mikrofonu.', check: () => state.stats.micOk >= 25 },
  { id: 'stars-10', emoji: '⭐', title: 'Gwiazda', desc: 'Zdobądź 3 gwiazdki w 10 lekcjach.', check: () => threeStars() >= 10 },
  { id: 'reviews-100', emoji: '🔁', title: 'Wytrwała', desc: 'Zrób 100 powtórek.', check: () => state.stats.reviews >= 100 },
  { id: 'all-cats', emoji: '🌍', title: 'Każda sytuacja', desc: 'Ukończ co najmniej 1 lekcję w każdej sytuacji.', check: () => categories.every((c) => c.lessons.some((l) => state.lessons[l.id])) },
];

export const categoryBadges = categories.flatMap((cat) => [
  {
    id: `cat-${cat.id}-1`, emoji: '🥉', cat, level: 1, title: cat.title,
    desc: `Ukończ pierwszą lekcję: ${cat.title}.`,
    check: () => cat.lessons.some((l) => state.lessons[l.id]),
  },
  {
    id: `cat-${cat.id}-2`, emoji: '🥈', cat, level: 2, title: cat.title,
    desc: `Ukończ wszystkie lekcje: ${cat.title}.`,
    check: () => cat.lessons.every((l) => state.lessons[l.id]),
  },
  {
    id: `cat-${cat.id}-3`, emoji: '🥇', cat, level: 3, title: cat.title,
    desc: `Opanuj na stałe wszystkie zdania: ${cat.title}.`,
    check: () => cat.phrases.every((p) => isMastered(p.id)),
  },
]);

export const allBadges = [...generalBadges, ...categoryBadges];

export function categoryMedal(cat) {
  for (const lvl of [3, 2, 1]) if (state.badges[`cat-${cat.id}-${lvl}`]) return ['', '🥉', '🥈', '🥇'][lvl];
  return '';
}

/** Checks all badges, stores new ones and returns them. */
export function checkBadges() {
  const fresh = [];
  for (const b of allBadges) {
    if (!state.badges[b.id] && b.check()) {
      state.badges[b.id] = today();
      fresh.push(b);
    }
  }
  if (fresh.length) save();
  return fresh;
}

/** Checks and celebrates new badges one by one. */
export async function celebrateNewBadges() {
  const fresh = checkBadges();
  for (const b of fresh) {
    confetti();
    await modal({
      emoji: b.cat ? `${b.emoji}${b.cat.emoji}` : b.emoji,
      title: b.cat ? `Odznaka: ${b.cat.title}` : `Nowa odznaka: ${b.title}`,
      text: b.desc,
    });
  }
  return fresh;
}
