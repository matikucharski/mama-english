// Checks the dialog content: unique ids, required fields, key-phrase counts, duplicates.
// Usage: node tools/validate-content.mjs
import categories from '../js/data/index.js';

const errors = [];
const warnings = [];
const catIds = new Set();
const lessonIds = new Set();
const keyTexts = new Map();
let keys = 0;

for (const cat of categories) {
  for (const f of ['id', 'title', 'emoji', 'color']) if (!cat[f]) errors.push(`${cat.id}: brak pola ${f}`);
  if (catIds.has(cat.id)) errors.push(`duplikat kategorii ${cat.id}`);
  catIds.add(cat.id);
  for (const l of cat.lessons) {
    if (lessonIds.has(l.id)) errors.push(`duplikat lekcji ${l.id}`);
    if (!/^[\w-]+$/.test(l.id)) errors.push(`niepoprawne id lekcji ${l.id}`);
    lessonIds.add(l.id);
    const k = l.lines.filter((x) => x.key);
    if (k.length < 3) errors.push(`${l.id}: tylko ${k.length} zdań do nauki`);
    l.lines.forEach((line, i) => {
      if (!line.en?.trim() || !line.pl?.trim()) errors.push(`${l.id}#${i}: pusty tekst`);
      if (!['mom', 'kid', 'teacher'].includes(line.who)) errors.push(`${l.id}#${i}: zły who=${line.who}`);
      if (line.key) {
        keys++;
        const norm = line.en.toLowerCase().replace(/[^a-z' ]/g, '').trim();
        if (keyTexts.has(norm)) warnings.push(`powtórzone zdanie: "${line.en}" (${keyTexts.get(norm)} i ${l.id})`);
        keyTexts.set(norm, l.id);
      }
    });
  }
}

console.log(`Kategorie: ${categories.length}, lekcje: ${lessonIds.size}, zdania do nauki: ${keys}`);
warnings.forEach((w) => console.log('UWAGA:', w));
errors.forEach((e) => console.log('BŁĄD:', e));
process.exit(errors.length ? 1 : 0);
