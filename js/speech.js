// Text-to-speech (lektor) and optional speech recognition ("Powiedz to").

import { state } from './store.js';

const synth = window.speechSynthesis;
let voices = [];
let voicesReady = null;

export const ttsSupported = !!synth;

export function initVoices() {
  if (!synth) return Promise.resolve([]);
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const pick = () => {
      voices = synth.getVoices();
      if (voices.length) resolve(voices);
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
    // some Android builds never fire voiceschanged
    setTimeout(() => { voices = synth.getVoices(); resolve(voices); }, 1500);
  });
  return voicesReady;
}

// macOS/iOS joke voices that are useless for learning
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy)\b/;

export function englishVoices() {
  return voices.filter((v) => /^en[-_]/i.test(v.lang) && !NOVELTY.test(v.name));
}

function rank(v) {
  let s = 0;
  if (/^en[-_]US/i.test(v.lang)) s += 3;
  else if (/^en[-_]GB/i.test(v.lang)) s += 2;
  if (/google/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}

function mainVoice() {
  const en = englishVoices();
  return en.find((v) => v.voiceURI === state.settings.voiceURI)
    || [...en].sort((a, b) => rank(b) - rank(a))[0]
    || null;
}

function voiceFor(who) {
  const main = mainVoice();
  if (who !== 'teacher' || !main) return main;
  // try a different English voice for the teacher / other adult
  const other = englishVoices().filter((v) => v.voiceURI !== main.voiceURI).sort((a, b) => rank(b) - rank(a))[0];
  return other || main;
}

let token = 0;

/** Speaks text; resolves when done (or interrupted). */
export function speak(text, { who = 'mom', slow = false } = {}) {
  if (!synth) return Promise.resolve();
  const my = ++token;
  synth.cancel();
  return initVoices().then(() => new Promise((resolve) => {
    if (my !== token) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = voiceFor(who);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
    const base = state.settings.rate || 0.9;
    u.rate = slow ? Math.max(0.5, base * 0.7) : base;
    u.pitch = who === 'kid' ? 1.45 : who === 'teacher' ? 0.95 : 1.05;
    let finished = false;
    const done = () => { if (!finished) { finished = true; clearTimeout(guard); resolve(); } };
    u.onend = done;
    u.onerror = done;
    // safety net: onend is unreliable on some Android versions
    const guard = setTimeout(done, 1500 + text.length * 120 / u.rate);
    synth.speak(u);
  }));
}

export function stopSpeaking() {
  token++;
  synth?.cancel();
}

// ---------- speech recognition ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const sttSupported = !!Recognition;

let activeRec = null;

/** Listens once; resolves with an array of recognised alternatives (may be empty). */
export function listen() {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('unsupported'));
    stopSpeaking();
    const rec = new Recognition();
    activeRec = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    rec.continuous = false;
    let results = [];
    rec.onresult = (e) => {
      const r = e.results[0];
      results = Array.from({ length: r.length }, (_, i) => r[i].transcript);
    };
    rec.onerror = (e) => {
      activeRec = null;
      if (e.error === 'no-speech' || e.error === 'aborted') resolve([]);
      else reject(new Error(e.error));
    };
    rec.onend = () => { activeRec = null; resolve(results); };
    rec.start();
  });
}

export function stopListening() {
  activeRec?.abort();
  activeRec = null;
}

// ---------- comparing what was said ----------
const CONTRACTIONS = {
  "it's": 'it is', "let's": 'let us', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is',
  "she's": 'she is', "that's": 'that is', "what's": 'what is', "where's": 'where is', "who's": 'who is',
  "there's": 'there is', "here's": 'here is', "can't": 'cannot', "won't": 'will not', "isn't": 'is not',
  "aren't": 'are not', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "i've": 'i have',
  "you've": 'you have', "we've": 'we have', "wasn't": 'was not', "haven't": 'have not', "how's": 'how is',
  "breakfast's": 'breakfast is', "lunch's": 'lunch is', "dinner's": 'dinner is', "mommy's": 'mommy is',
  "mummy's": 'mummy is', "gonna": 'going to', "wanna": 'want to', "okay": 'ok', "o.k.": 'ok', "can not": 'cannot',
};

export function normalize(s) {
  let t = ` ${s.toLowerCase().replace(/[’‘`]/g, "'")} `;
  t = t.replace(/[.,!?;:"“”()…–—-]/g, ' ');
  for (const [k, v] of Object.entries(CONTRACTIONS)) {
    t = t.replaceAll(` ${k} `, ` ${v} `);
  }
  return t.replace(/'/g, '').split(/\s+/).filter(Boolean);
}

function editDistance(a, b, eq = (x, y) => x === y) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function wordsMatch(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  return editDistance([...a], [...b]) <= 1;
}

/** 0..1 similarity between the target sentence and what was heard */
export function similarity(target, heard) {
  const a = normalize(target);
  const b = normalize(heard);
  if (!a.length || !b.length) return 0;
  return 1 - editDistance(a, b, wordsMatch) / Math.max(a.length, b.length);
}

export function bestMatch(target, alternatives) {
  let best = { text: alternatives[0] || '', score: 0 };
  for (const alt of alternatives) {
    const score = similarity(target, alt);
    if (score > best.score) best = { text: alt, score };
  }
  return best;
}
