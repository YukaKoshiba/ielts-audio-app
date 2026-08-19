/**
 * Home screen: shows today's word count and cumulative progress stats.
 * The four mode buttons are plain links (learn.html / review.html /
 * audio.html / quiz.html) — no JS routing needed.
 */
import { store } from './storage.js';
import { loadDay, dayFromQuery } from './words.js';

async function init() {
  const day = dayFromQuery();
  try {
    const { label, words } = await loadDay(day);
    document.getElementById('dayBadge').textContent = `DAY ${day} · ${label}`;
    document.getElementById('reviewCount').textContent = words.length;
  } catch (err) {
    console.error(err);
  }
  document.getElementById('learnedCount').textContent = store.getLearnedCount();
  document.getElementById('scoreCount').textContent = store.getQuizScore();
}

init();
