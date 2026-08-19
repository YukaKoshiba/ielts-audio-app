#!/usr/bin/env node
/**
 * Build step: reads data/words.sqlite (the source of truth) and exports
 * a flat data/words.json for the browser to fetch.
 *
 * Why not query SQLite directly from the browser? This app is a static
 * site (opened via file:// during development, or hosted on GitHub
 * Pages with no server/build step at deploy time) and in-browser SQLite
 * would require shipping and initializing a ~1MB WASM runtime (sql.js)
 * on every page load just to read 10 rows. Exporting to JSON at build
 * time keeps the runtime simple and fast while still keeping SQLite as
 * the single editable source of truth for vocabulary data.
 *
 * Usage: node scripts/build-words.js
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'words.sqlite');
const OUT_PATH = path.join(__dirname, '..', 'data', 'words.json');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Missing ${DB_PATH}. Run "node scripts/seed-db.js" first.`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

const days = db.prepare('SELECT day, label FROM days ORDER BY day').all();
const wordStmt = db.prepare(`
  SELECT id, word, meaning, example, translation
  FROM words
  WHERE day = ?
  ORDER BY sort_order
`);

const out = {};
for (const d of days) {
  out[d.day] = { label: d.label, words: wordStmt.all(d.day) };
}

db.close();

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT_PATH} (${days.length} day(s))`);
