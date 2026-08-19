/**
 * クイズ (quiz mode): 英→日 / 日→英 4-choice quiz.
 *
 * --- The onclick bug, and why this file uses addEventListener ---
 * The original prototype built each choice button as:
 *   `<button onclick="answerQuiz(this,${JSON.stringify(o)},${JSON.stringify(correct)})">`
 * JSON.stringify() wraps strings in double quotes, and that string was
 * spliced straight into an onclick="..." attribute that is ALSO
 * double-quoted. The attribute closed at the first embedded quote,
 * corrupting the tag; `onclick` ended up `null` in the browser and no
 * choice button did anything. (Verified in Chromium: clicking a choice
 * left the question counter frozen at 1/10 with a "Failed to read the
 * 'onclick' property" page error.)
 *
 * The fix is to never put answer data inside an HTML attribute at all:
 * render plain buttons and attach one delegated click listener that
 * reads the answer back out of the `options` array this module already
 * holds in memory (see renderQuiz/handleChoiceClick below).
 */
import { loadDay, dayFromQuery } from './words.js';
import { store } from './storage.js';
import { escapeHtml, shuffle } from './util.js';

const day = dayFromQuery();
let words = [];
let quizIdx = 0;
let quizScore = 0;
let quizQuestions = [];
/** Choice buttons for the current question, in DOM order — read by index on click. */
let currentOptions = [];
let currentCorrectAnswer = '';

const quizNum = document.getElementById('quizNum');
const quizProg = document.getElementById('quizProg');
const quizCard = document.getElementById('quizCard');

async function init() {
  try {
    ({ words } = await loadDay(day));
  } catch (err) {
    quizCard.innerHTML = `<p class="text-bad">単語データの読み込みに失敗しました。</p>`;
    console.error(err);
    return;
  }
  startQuiz();
}

function startQuiz() {
  quizIdx = 0;
  quizScore = 0;
  quizQuestions = shuffle(
    words.map((w, i) => ({ w, type: i % 2 === 0 ? 'enja' : 'jaen' }))
  );
  renderQuiz();
}

function otherChoices(word, key) {
  return shuffle(words.filter((x) => x.id !== word.id).map((x) => x[key])).slice(0, 3);
}

function renderQuiz() {
  if (quizIdx >= quizQuestions.length) {
    store.addQuizScore(quizScore);
    quizCard.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-label">DAY ${day} RESULT</div>
        <div class="quiz-result-score">${quizScore}/${quizQuestions.length}</div>
        <p>もう一度やると、問題順が変わります。</p>
        <div class="flex gap-2 justify-center mt-4">
          <button type="button" class="btn-primary" data-action="retry">もう一度</button>
          <a class="btn-secondary no-underline flex items-center justify-center whitespace-nowrap" href="index.html">Homeへ</a>
        </div>
      </div>
    `;
    quizNum.textContent = '完了';
    quizProg.style.width = '100%';
    return;
  }

  const q = quizQuestions[quizIdx];
  const w = q.w;
  quizNum.textContent = `${quizIdx + 1}/${quizQuestions.length}`;
  quizProg.style.width = `${((quizIdx + 1) / quizQuestions.length) * 100}%`;

  currentCorrectAnswer = q.type === 'enja' ? w.meaning : w.word;
  currentOptions = shuffle([
    currentCorrectAnswer,
    ...otherChoices(w, q.type === 'enja' ? 'meaning' : 'word'),
  ]);

  quizCard.innerHTML = `
    <div class="card-eyebrow">${q.type === 'enja' ? '英語 → 日本語' : '日本語 → 英語'}</div>
    <div class="quiz-question">${escapeHtml(q.type === 'enja' ? w.word : w.meaning)}</div>
    <div class="quiz-choices">
      ${currentOptions
        .map((o, i) => `<button type="button" class="quiz-choice" data-index="${i}">${escapeHtml(o)}</button>`)
        .join('')}
    </div>
    <div id="feedback" class="quiz-feedback"></div>
  `;
}

function handleChoiceClick(btn) {
  const chosen = currentOptions[Number(btn.dataset.index)];
  const isCorrect = chosen === currentCorrectAnswer;

  quizCard.querySelectorAll('.quiz-choice').forEach((b) => (b.disabled = true));
  btn.classList.add(isCorrect ? 'correct' : 'wrong');
  document.getElementById('feedback').textContent = isCorrect
    ? '✓ 正解'
    : `× 正解は「${currentCorrectAnswer}」`;
  if (isCorrect) quizScore++;

  setTimeout(() => {
    quizIdx++;
    renderQuiz();
  }, 900);
}

quizCard.addEventListener('click', (e) => {
  const choiceBtn = e.target.closest('.quiz-choice');
  if (choiceBtn && !choiceBtn.disabled) {
    handleChoiceClick(choiceBtn);
    return;
  }
  const retryBtn = e.target.closest('[data-action="retry"]');
  if (retryBtn) startQuiz();
});

init();
