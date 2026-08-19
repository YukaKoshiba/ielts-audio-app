/**
 * 復習モード (review mode): Recall → reveal answer → self-rate ◎/△/×.
 * Ratings are saved per word id via js/storage.js and drive the "◎ 定着"
 * count shown on the home screen.
 */
import { loadDay, dayFromQuery } from './words.js';
import { store } from './storage.js';
import { escapeHtml } from './util.js';

const day = dayFromQuery();
let words = [];
let idx = 0;

const reviewNum = document.getElementById('reviewNum');
const reviewProg = document.getElementById('reviewProg');
const reviewCard = document.getElementById('reviewCard');

async function init() {
  try {
    ({ words } = await loadDay(day));
  } catch (err) {
    reviewCard.innerHTML = `<p class="text-bad">単語データの読み込みに失敗しました。</p>`;
    console.error(err);
    return;
  }
  render();
}

function render() {
  const w = words[idx];
  reviewNum.textContent = `${idx + 1}/${words.length}`;
  reviewProg.style.width = `${((idx + 1) / words.length) * 100}%`;

  reviewCard.innerHTML = `
    <div class="card-eyebrow">Recall</div>
    <div class="recall-box">
      <div>
        <div class="recall-prompt">${escapeHtml(w.meaning)}</div>
        <div class="recall-hint">英単語を思い出してみる</div>
      </div>
    </div>
    <div id="ans" class="answer-box">
      <div class="answer-word">${escapeHtml(w.word)}</div>
      <div class="example-text">${escapeHtml(w.example)}</div>
      <div class="translation-text">${escapeHtml(w.translation)}</div>
    </div>
    <button type="button" class="btn-primary mt-4" data-action="reveal">答えを見る</button>
    <div class="rate-grid">
      <button type="button" class="rate-btn bad" data-action="rate" data-rating="bad">× 出なかった</button>
      <button type="button" class="rate-btn mid" data-action="rate" data-rating="mid">△ 少し考えた</button>
      <button type="button" class="rate-btn good" data-action="rate" data-rating="good">◎ すぐ出た</button>
    </div>
  `;
}

reviewCard.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'reveal') {
    document.getElementById('ans').classList.add('show');
    btn.style.display = 'none';
    return;
  }

  if (btn.dataset.action === 'rate') {
    store.setRating(words[idx].id, btn.dataset.rating);
    if (idx < words.length - 1) {
      idx++;
      render();
    } else {
      finish();
    }
  }
});

function finish() {
  reviewCard.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-label">DAY ${day} · 復習完了</div>
      <p class="mt-2 text-muted">◎が付いた語は「定着」として記録しました。</p>
      <a class="btn-primary block text-center mt-4 no-underline" href="index.html">Homeへ</a>
    </div>
  `;
}

init();
