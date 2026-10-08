// Indexes over the static content: categories -> lessons -> lines/phrases.

import categories from './data/index.js';

export { categories };

export const categoriesById = {};
export const lessonsById = {};
export const phrasesById = {};   // key phrases only
export const allPhrases = [];

for (const cat of categories) {
  categoriesById[cat.id] = cat;
  cat.lessons.forEach((lesson, li) => {
    lesson.category = cat;
    lesson.number = li + 1;
    lesson.phrases = [];
    lesson.lines.forEach((line, i) => {
      line.id = `${lesson.id}#${i}`;
      if (!line.key) return;
      const phrase = {
        id: line.id,
        en: line.en,
        pl: line.pl,
        tip: line.tip,
        who: line.who,
        prev: lesson.lines[i - 1] && lesson.lines[i - 1].who !== line.who ? lesson.lines[i - 1] : null,
        lesson,
        category: cat,
      };
      lesson.phrases.push(phrase);
      phrasesById[phrase.id] = phrase;
      allPhrases.push(phrase);
    });
    lessonsById[lesson.id] = lesson;
  });
  cat.phrases = cat.lessons.flatMap((l) => l.phrases);
}

export const allLessons = categories.flatMap((c) => c.lessons);
