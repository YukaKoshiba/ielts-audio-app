/**
 * Loads vocabulary data for a given day.
 *
 * The data itself lives in data/words.sqlite (see scripts/seed-db.js);
 * data/words.json is generated from it at build time
 * (`npm run build:words`) and is what the browser actually fetches —
 * see scripts/build-words.js for why we don't query SQLite client-side.
 */

const DEFAULT_DAY = 1;

/**
 * @param {number} [day]
 * @returns {Promise<{day: number, label: string, words: Array<{id:string, word:string, meaning:string, example:string, translation:string}>}>}
 */
export async function loadDay(day = DEFAULT_DAY) {
  const res = await fetch('data/words.json');
  if (!res.ok) {
    throw new Error(`Failed to load word data (HTTP ${res.status})`);
  }
  const all = await res.json();
  const entry = all[String(day)];
  if (!entry) {
    throw new Error(`No word data found for day ${day}`);
  }
  return { day, label: entry.label, words: entry.words };
}

/** Reads `?day=` from the current URL, defaulting to Day 1. */
export function dayFromQuery() {
  const n = Number(new URLSearchParams(location.search).get('day'));
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAY;
}

/** Builds the `audio/<id>_word.mp3` / `audio/<id>_example.mp3` paths for a word. */
export function audioBase(word) {
  return `audio/${word.id}_`;
}
