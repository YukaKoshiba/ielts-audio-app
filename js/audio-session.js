/**
 * 音声学習 (audio-only session): hands-free playback of all 10 words,
 * each preceded by a silent "recall" pause.
 *
 * --- Why the original "ghost session" bug can't happen here ---
 * The prototype ran this as a hidden <div> overlay inside the single
 * page app. Closing it only set an `audioStop` flag; the *next* open
 * reset that same flag to false before the still-running async loop
 * had checked it, so the old loop kept mutating a UI the user thought
 * was fresh (verified in Chromium: reopening within ~1s showed a
 * "準備" label while audio from the old session kept playing).
 *
 * Two independent things fix this now:
 *  1. This mode is its own page. Navigating to index.html unloads this
 *     module entirely — there is no persistent JS state for a future
 *     visit to inherit.
 *  2. Even *within* this page, Start/Stop go through
 *     js/audio-controller.js's run()/stopAll(), which tags every
 *     session with a generation number. Starting a new run always
 *     invalidates the previous one first, so rapid stop → start clicks
 *     (the exact scenario that broke the original) can't overlap.
 */
import { loadDay, dayFromQuery, audioBase } from './words.js';
import { run, stopAll, onVisibilityChange, setMediaSessionStopHandler } from './audio-controller.js';

const day = dayFromQuery();
let words = [];
let running = false;

const aoBig = document.getElementById('aoBig');
const aoStatus = document.getElementById('aoStatus');
const aoWarning = document.getElementById('aoWarning');
const aoStart = document.getElementById('aoStart');

async function init() {
  try {
    ({ words } = await loadDay(day));
  } catch (err) {
    aoStatus.textContent = '単語データの読み込みに失敗しました。';
    console.error(err);
    return;
  }
  aoStart.addEventListener('click', () => (running ? stopSession() : startSession()));
  setMediaSessionStopHandler(stopSession);

  // iOS/Safari is known to suspend timers and speech synthesis for
  // backgrounded/locked tabs; the <audio> element itself may keep
  // playing a bit longer via Media Session, but the silent "recall"
  // pause and the Japanese TTS steps are not backed by any media
  // element and can stall once the screen locks. We can't reproduce
  // real iOS lock-screen behavior in this environment, so instead of
  // silently going stale, warn the user in place if that happens.
  onVisibilityChange((hidden) => {
    if (hidden && running) {
      aoWarning.hidden = false;
      aoWarning.textContent = '画面がロック/バックグラウンド化されました。iOSでは音声が一時停止する場合があります。';
    } else if (!hidden) {
      aoWarning.hidden = true;
    }
  });
}

function buildSteps() {
  const steps = [];
  words.forEach((w, i) => {
    steps.push({
      label: `recall-${i}`,
      run: async (ctx) => {
        setStatus(i, `${w.meaning} → 思い出す時間`);
        await ctx.wait(3000);
      },
    });
    steps.push({
      label: `word-${i}`,
      run: async (ctx) => {
        setStatus(i, '英単語');
        await ctx.playFile(`${audioBase(w)}word.mp3`);
      },
    });
    steps.push({
      label: `meaning-${i}`,
      run: async (ctx) => {
        setStatus(i, '意味');
        await ctx.speak(w.meaning);
      },
    });
    steps.push({
      label: `example-${i}`,
      run: async (ctx) => {
        setStatus(i, '例文');
        await ctx.playFile(`${audioBase(w)}example.mp3`);
      },
    });
    steps.push({
      label: `translation-${i}`,
      run: async (ctx) => {
        setStatus(i, '例文の日本語訳');
        await ctx.speak(w.translation);
        await ctx.wait(900);
      },
    });
  });
  return steps;
}

function setStatus(wordIndex, text) {
  aoBig.textContent = `${wordIndex + 1} / ${words.length}`;
  aoStatus.textContent = text;
}

async function startSession() {
  running = true;
  aoStart.textContent = '■ 停止';
  aoWarning.hidden = true;

  const completed = await run(buildSteps(), {
    media: { title: `DAY ${day} 音声学習`, artist: 'IELTS Vocabulary' },
  });

  running = false;
  if (completed) {
    aoBig.textContent = '完了';
    aoStatus.textContent = `Day ${day}の${words.length}語を終了しました。`;
    aoStart.textContent = 'もう一度';
  } else {
    aoBig.textContent = '準備';
    aoStatus.textContent = '停止しました。スタートで最初から再生します。';
    aoStart.textContent = '▶ スタート';
  }
}

function stopSession() {
  stopAll();
  running = false;
  aoBig.textContent = '準備';
  aoStatus.textContent = '停止しました。スタートで最初から再生します。';
  aoStart.textContent = '▶ スタート';
}

window.addEventListener('pagehide', stopAll);

init();
