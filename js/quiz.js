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
import { loadDay, dayFromQuery, audioBase } from './words.js';
import { store } from './storage.js';
import { escapeHtml, shuffle } from './util.js';
import { run, stopAll } from './audio-controller.js';

const day = dayFromQuery();
let words = [];
let quizIdx = 0;
let quizScore = 0;
let quizQuestions = [];
/** Choice buttons for the current question, in DOM order — read by index on click. */
let currentOptions = [];
let currentCorrectAnswer = '';
/** Whether the current question has had a wrong attempt yet — only a
 *  clean first-try answer counts toward quizScore, since retrying is
 *  now unlimited (see handleChoiceClick). */
let hasMistakeThisQuestion = false;

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
    stopAll();
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
  hasMistakeThisQuestion = false;
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

  // Play the word's English pronunciation at the start of every question.
  // Browsers block un-gestured autoplay, so the very first question (page
  // load) may play silently — every later question is triggered from a
  // click (次へ/もう一度), which counts as a user gesture and plays fine.
  run([{ label: 'word', run: (ctx) => ctx.playFile(`${audioBase(w)}word.mp3`) }], {
    media: { title: w.word, artist: 'クイズ' },
  });
}

function handleChoiceClick(btn) {
  const chosen = currentOptions[Number(btn.dataset.index)];
  const isCorrect = chosen === currentCorrectAnswer;

  if (isCorrect) {
    if (!hasMistakeThisQuestion) quizScore++;
    quizCard.querySelectorAll('.quiz-choice').forEach((b) => (b.disabled = true));
    btn.classList.add('correct');
    const isLast = quizIdx === quizQuestions.length - 1;
    document.getElementById('feedback').innerHTML = `
      <span>✓ 正解</span>
      <button type="button" class="btn-primary mt-3" data-action="next">${isLast ? '結果を見る →' : '次へ →'}</button>
    `;
  } else {
    hasMistakeThisQuestion = true;
    btn.classList.add('wrong');
    btn.disabled = true;
    document.getElementById('feedback').textContent = '× 不正解。もう一度選んでみましょう。';
  }
}

quizCard.addEventListener('click', (e) => {
  const choiceBtn = e.target.closest('.quiz-choice');
  if (choiceBtn && !choiceBtn.disabled) {
    handleChoiceClick(choiceBtn);
    return;
  }
  if (e.target.closest('[data-action="next"]')) {
    quizIdx++;
    renderQuiz();
    return;
  }
  const retryBtn = e.target.closest('[data-action="retry"]');
  if (retryBtn) startQuiz();
});

window.addEventListener('pagehide', stopAll);

init();
