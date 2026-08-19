/**
 * Safe read/write access to this app's localStorage state.
 *
 * The original prototype called `JSON.parse(localStorage.getItem(...))`
 * directly at module scope with no try/catch: a single corrupted value
 * (partial write, quota error, manual edit) threw a SyntaxError that
 * killed the entire page before anything rendered. This wrapper
 * contains that failure to a console warning and an empty-state reset.
 */

const KEY = 'ieltsDay1';

/**
 * @returns {{quizScore?: number, [wordId: string]: 'good'|'mid'|'bad'|number|undefined}}
 */
function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('ieltsDay1 localStorage value was corrupted; resetting.', err);
    return {};
  }
}

function persist(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Quota exceeded / private-browsing restrictions: progress just
    // won't persist this session rather than crashing the app.
    console.warn('Could not save progress to localStorage.', err);
  }
}

export const store = {
  /** Current review rating ('good'|'mid'|'bad') for a word id, if any. */
  getRating(wordId) {
    const state = load();
    return state[wordId];
  },
  setRating(wordId, rating) {
    const state = load();
    state[wordId] = rating;
    persist(state);
  },
  /** Count of words rated 'good' ("定着"). */
  getLearnedCount() {
    const state = load();
    return Object.entries(state)
      .filter(([k]) => k !== 'quizScore')
      .filter(([, v]) => v === 'good').length;
  },
  getQuizScore() {
    const state = load();
    return state.quizScore || 0;
  },
  addQuizScore(delta) {
    const state = load();
    state.quizScore = (state.quizScore || 0) + delta;
    persist(state);
  },
};
