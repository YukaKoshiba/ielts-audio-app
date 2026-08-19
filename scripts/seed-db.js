#!/usr/bin/env node
/**
 * One-time (re-runnable) seed script: creates data/words.sqlite, the
 * source-of-truth database for vocabulary data, and loads Day 1's word
 * list into it.
 *
 * Re-running this script recreates the database from scratch, so it is
 * safe to use as the starting point for adding Day 2, Day 3, etc. — add
 * new day blocks to `days` / `words` below and re-run.
 *
 * Usage: node scripts/seed-db.js
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'words.sqlite');

const days = [{ day: 1, label: '1781–1790' }];

const words = [
  { id: '1781', day: 1, sortOrder: 1, word: 'tolerate', meaning: '許容する、我慢する', example: 'His colleagues tolerated his rudeness.', translation: '彼の同僚たちは彼の無礼な態度を我慢した。' },
  { id: '1782', day: 1, sortOrder: 2, word: 'reproduce', meaning: '生殖する、繁殖する；を複製する', example: 'The zoo’s staff were relieved when the pandas began to reproduce.', translation: 'パンダが繁殖し始めて、動物園のスタッフはほっとした。' },
  { id: '1783', day: 1, sortOrder: 3, word: 'restless', meaning: '落ち着きのない；変化を求める', example: 'Restless people tend to make more impulsive decisions.', translation: '落ち着きのない人の方が衝動的な判断をしがちである。' },
  { id: '1784', day: 1, sortOrder: 4, word: 'undergo', meaning: 'を経験する、経る、受ける', example: 'He underwent many difficulties while traveling in India.', translation: '彼はインドを旅行中にたくさんの困難を経験した。' },
  { id: '1785', day: 1, sortOrder: 5, word: 'squash', meaning: 'を押しつぶす、踏みつぶす', example: 'The peasants squashed the grapes with their feet to make wine.', translation: '小作農たちはワインを作るために足でブドウを踏みつぶした。' },
  { id: '1786', day: 1, sortOrder: 6, word: 'gateway', meaning: '（〜への）出入口；道；手段', example: 'IELTS is the gateway to many dreams.', translation: 'IELTSは多くの夢への入口である。' },
  { id: '1787', day: 1, sortOrder: 7, word: 'alley', meaning: '小道、横道、路地', example: 'The shop was in a small alley.', translation: 'その店は小さな路地にあった。' },
  { id: '1788', day: 1, sortOrder: 8, word: 'cooperative', meaning: '協力的な、協同の', example: 'The workforce was cooperative and well-educated.', translation: '全従業員が協力的でよく教育されていた。' },
  { id: '1789', day: 1, sortOrder: 9, word: 'corrupt', meaning: '汚職の、悪徳の', example: 'There may be more corrupt politicians than clean ones.', translation: '高潔な政治家よりも汚職まみれの政治家の方が多いかもしれない。' },
  { id: '1790', day: 1, sortOrder: 10, word: 'pasture', meaning: '牧草地、牧場、放牧場', example: 'The fields provided pasture for the local cattle.', translation: 'その野原は地元のウシの牧草地となっていた。' },
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.rmSync(DB_PATH, { force: true });

const db = new Database(DB_PATH);
// This DB is a build-time artifact committed to git as a single file;
// avoid WAL mode so it never leaves -wal/-shm sidecar files behind.
db.pragma('journal_mode = DELETE');

db.exec(`
  CREATE TABLE days (
    day    INTEGER PRIMARY KEY,
    label  TEXT NOT NULL
  );
  CREATE TABLE words (
    id          TEXT PRIMARY KEY,
    day         INTEGER NOT NULL REFERENCES days(day),
    sort_order  INTEGER NOT NULL,
    word        TEXT NOT NULL,
    meaning     TEXT NOT NULL,
    example     TEXT NOT NULL,
    translation TEXT NOT NULL
  );
  CREATE INDEX idx_words_day ON words(day, sort_order);
`);

const insertDay = db.prepare('INSERT INTO days (day, label) VALUES (@day, @label)');
const insertWord = db.prepare(`
  INSERT INTO words (id, day, sort_order, word, meaning, example, translation)
  VALUES (@id, @day, @sortOrder, @word, @meaning, @example, @translation)
`);

const seed = db.transaction(() => {
  for (const d of days) insertDay.run(d);
  for (const w of words) insertWord.run(w);
});
seed();

db.close();
console.log(`Seeded ${words.length} words across ${days.length} day(s) into ${DB_PATH}`);
