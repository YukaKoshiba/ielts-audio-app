/**
 * Small, dependency-free helpers shared by every page.
 */

/**
 * Escape text before interpolating it into innerHTML. Word data is
 * currently static/trusted, but this keeps every dynamic render path
 * XSS-safe by default (and was the root cause of the quiz's onclick
 * bug below — inline attributes with unescaped quotes break the HTML).
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Fisher–Yates shuffle. Returns a new array; does not mutate the input.
 * (The original `arr.sort(() => Math.random() - 0.5)` is a well-known
 * biased shuffle — sort comparators aren't meant to be used this way.)
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
