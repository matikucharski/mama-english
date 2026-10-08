// Leitner-box spaced repetition.
// box 0 = never learned; box 1..6 = learned, next review after INTERVALS[box] days.

import { state, save, today, addDays } from './store.js';

const INTERVALS = [0, 1, 2, 4, 8, 16, 30];
export const MAX_BOX = INTERVALS.length - 1;
export const MASTERED_BOX = 4;

export function phraseState(id) {
  return state.phrases[id] || { box: 0, due: null, seen: 0, ok: 0, bad: 0, last: null };
}

/** result: 'good' | 'almost' | 'bad' */
export function grade(id, result) {
  const p = { ...phraseState(id) };
  const t = today();
  p.seen += 1;
  if (result === 'good') {
    p.ok += 1;
    // only one promotion per day, so drilling the same card doesn't skip boxes
    if (p.last !== t || p.box === 0) p.box = Math.min(MAX_BOX, p.box + 1);
    p.due = addDays(t, INTERVALS[p.box]);
  } else if (result === 'almost') {
    p.box = Math.max(1, p.box);
    p.due = addDays(t, 1);
  } else {
    p.bad += 1;
    p.box = 1;
    p.due = t;
  }
  p.last = t;
  state.phrases[id] = p;
  save();
  return p;
}

export function isLearned(id) {
  return phraseState(id).box >= 1;
}

export function isMastered(id) {
  return phraseState(id).box >= MASTERED_BOX;
}

export function dueIds() {
  const t = today();
  return Object.entries(state.phrases)
    .filter(([, p]) => p.box >= 1 && p.due && p.due <= t)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[1].box - b[1].box))
    .map(([id]) => id);
}

export function learnedIds() {
  return Object.keys(state.phrases).filter((id) => state.phrases[id].box >= 1);
}

export function masteredIds() {
  return Object.keys(state.phrases).filter((id) => state.phrases[id].box >= MASTERED_BOX);
}
