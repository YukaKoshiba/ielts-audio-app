/**
 * 覚えるモード (learn mode): flip through word → meaning → example, with
 * two audio playback directions per card.
 *
 * Audio playback goes entirely through js/audio-controller.js's run().
 * That fixes the original bug where pressing "英→日" then quickly
 * "日→英" started a second overlapping Audio object — run() always
 * stops the previous sequence before starting a new one, and the
 * button is disabled for the duration of playback as a visual cue.
 */
import { loadDay, dayFromQuery, audioBase } from './words.js';
import { run, stopAll } from './audio-controller.js';
import { escapeHtml } from './util.js';

const day = dayFromQuery();
let words = [];
let idx = 0;

const learnNum = document.getElementById('learnNum');
const learnProg = document.getElementById('learnProg');
const learnCard = document.getElementById('learnCard');

async function init() {
  try {
    ({ words } = await loadDay(day));
  } catch (err) {
    learnCard.innerHTML = `<p class="text-bad">単語データの読み込みに失敗しました。</p>`;
    console.error(err);
    return;
  }
  render();
}

function render() {
  const w = words[idx];
  learnNum.textContent = `${idx + 1}/${words.length}`;
  learnProg.style.width = `${((idx + 1) / words.length) * 100}%`;

  learnCard.innerHTML = `
    <div class="card-eyebrow">ID ${escapeHtml(w.id)}</div>
    <div class="word-heading">${escapeHtml(w.word)}</div>
    <div class="meaning-text">${escapeHtml(w.meaning)}</div>
    <div class="example-text">${escapeHtml(w.example)}</div>
    <div class="translation-text">${escapeHtml(w.translation)}</div>
    <div class="audio-row">
      <button type="button" class="btn-secondary" data-action="play-enja">▶ 英→日</button>
      <button type="button" class="btn-secondary" data-action="play-jaen">▶ 日→英</button>
    </div>
    <div class="actions-row">
      <button type="button" class="btn-secondary" data-action="prev" ${idx === 0 ? 'disabled' : ''}>← 前へ</button>
      <button type="button" class="btn-primary" data-action="next">${idx === words.length - 1 ? '完了' : '次へ →'}</button>
    </div>
  `;
}

/** 英語 → 意味 → 例文 → 例文の日本語訳 */
async function playEnJa(w) {
  const buttons = learnCard.querySelectorAll('button[data-action]');
  buttons.forEach((b) => (b.disabled = true));
  await run(
    [
      { label: 'word', run: (ctx) => ctx.playFile(`${audioBase(w)}word.mp3`) },
      { label: 'meaning', run: (ctx) => ctx.speak(w.meaning) },
      { label: 'example', run: (ctx) => ctx.playFile(`${audioBase(w)}example.mp3`) },
      { label: 'translation', run: (ctx) => ctx.speak(w.translation) },
    ],
    { media: { title: w.word, artist: '覚えるモード · 英→日' } }
  );
  buttons.forEach((b) => (b.disabled = false));
}

/** 意味 → 英語 → 例文の日本語訳 → 例文 */
async function playJaEn(w) {
  const buttons = learnCard.querySelectorAll('button[data-action]');
  buttons.forEach((b) => (b.disabled = true));
  await run(
    [
      { label: 'meaning', run: (ctx) => ctx.speak(w.meaning) },
      { label: 'word', run: (ctx) => ctx.playFile(`${audioBase(w)}word.mp3`) },
      { label: 'translation', run: (ctx) => ctx.speak(w.translation) },
      { label: 'example', run: (ctx) => ctx.playFile(`${audioBase(w)}example.mp3`) },
    ],
    { media: { title: w.word, artist: '覚えるモード · 日→英' } }
  );
  buttons.forEach((b) => (b.disabled = false));
}

learnCard.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const w = words[idx];
  switch (btn.dataset.action) {
    case 'play-enja':
      playEnJa(w);
      break;
    case 'play-jaen':
      playJaEn(w);
      break;
    case 'prev':
      if (idx > 0) {
        idx--;
        render();
      }
      break;
    case 'next':
      if (idx < words.length - 1) {
        idx++;
        render();
      } else {
        finish();
      }
      break;
  }
});

function finish() {
  stopAll();
  learnCard.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-label">DAY ${day} · 覚えるモード完了</div>
      <p class="mt-2 text-muted">次は復習か音声学習がおすすめです。</p>
      <a class="btn-primary block text-center mt-4 no-underline" href="index.html">Homeへ</a>
    </div>
  `;
}

window.addEventListener('pagehide', stopAll);

init();
