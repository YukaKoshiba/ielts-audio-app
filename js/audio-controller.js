/**
 * Centralized playback controller.
 *
 * This replaces the original prototype's ad hoc `new Audio(file).play()`
 * / `speechSynthesis.speak()` calls scattered across the learn card and
 * the audio-only session, which caused two real bugs:
 *
 *  1. Overlapping playback: pressing "英→日" then quickly "日→英" on the
 *     learn card started a second `Audio` object while the first was
 *     still playing — both played at once, nothing tracked either one.
 *  2. "Ghost sessions": closing the full-screen audio session set a
 *     `audioStop` flag that the *next* `startAudio()` call reset to
 *     false before the still-running loop had a chance to see it and
 *     exit, so the old loop kept advancing in the background,
 *     corrupting the UI of a session the user thought was fresh.
 *
 * The fix is to make this module the *only* place that ever touches
 * `Audio`/`speechSynthesis`, and to give every call to run() a
 * generation number. Starting a new run() always stops whatever run()
 * came before it (bumping the generation and resolving any pending
 * step immediately), so at most one sequence is ever "live" — overlap
 * and ghost sessions are structurally impossible rather than
 * flag-dependent.
 *
 * iOS lock-screen note: this module also publishes Media Session
 * metadata/handlers so a locked iPhone shows track info and a stop
 * control. That only covers the portions of a sequence backed by the
 * shared <audio> element, though — the `speak()` (Web Speech API) and
 * `wait()` (recall pause) steps have no associated media element, and
 * WebKit is known to suspend timers/speech synthesis for backgrounded
 * tabs. In practice that means playback may pause during those gaps
 * once the screen locks; see README's "Known limitations" section for
 * what verifying this on real hardware would involve, since we cannot
 * exercise the actual iOS lock-screen behavior in this environment.
 */

let audioEl = null;
let generation = 0;
/** @type {Set<() => void>} resolvers for whatever primitive is currently pending */
let pendingCancels = new Set();

function getAudioEl() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.playsInline = true; // iOS: play inline instead of the native fullscreen player
    audioEl.preload = 'auto';
  }
  return audioEl;
}

/** Stops whatever is currently playing/speaking/waiting, right now. */
export function stopAll() {
  generation++;
  const el = getAudioEl();
  try {
    el.pause();
  } catch {
    // ignore
  }
  if ('speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  const cancels = pendingCancels;
  pendingCancels = new Set();
  cancels.forEach((resolve) => resolve());
  setMediaSessionPlaybackState('paused');
}

function playFile(src, gen) {
  return new Promise((resolve) => {
    if (gen !== generation) {
      resolve();
      return;
    }
    const el = getAudioEl();
    let done;
    const cleanup = () => {
      el.removeEventListener('ended', done);
      el.removeEventListener('error', done);
      pendingCancels.delete(done);
    };
    done = () => {
      cleanup();
      resolve();
    };
    pendingCancels.add(done);
    el.src = src;
    el.addEventListener('ended', done, { once: true });
    el.addEventListener('error', done, { once: true });
    el.play().catch(done);
  });
}

function speak(text, gen, lang = 'ja-JP') {
  return new Promise((resolve) => {
    if (gen !== generation) {
      resolve();
      return;
    }
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    let done;
    const cleanup = () => pendingCancels.delete(done);
    done = () => {
      cleanup();
      resolve();
    };
    pendingCancels.add(done);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92;
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

function wait(ms, gen) {
  return new Promise((resolve) => {
    if (gen !== generation) {
      resolve();
      return;
    }
    let done;
    const id = setTimeout(() => {
      pendingCancels.delete(done);
      resolve();
    }, ms);
    done = () => {
      clearTimeout(id);
      resolve();
    };
    pendingCancels.add(done);
  });
}

/**
 * Runs an ordered list of async step functions as a single cancellable
 * "session". Starting a new run() always cancels any previous one
 * first, so only one sequence is ever live.
 *
 * Each step receives `{ playFile, speak, wait, isCancelled }` bound to
 * this run's generation, plus an `onStep(label)` callback (if supplied
 * in options) for updating status text between steps.
 *
 * @param {Array<{label: string, run: (ctx: RunContext) => Promise<void>}>} steps
 * @param {{onStep?: (label: string, index: number, total: number) => void, media?: {title: string, artist?: string}}} [options]
 * @returns {Promise<boolean>} true if the sequence completed, false if it was cancelled
 */
export async function run(steps, options = {}) {
  stopAll();
  const gen = generation;
  const isCancelled = () => gen !== generation;
  const ctx = {
    isCancelled,
    playFile: (src) => playFile(src, gen),
    speak: (text, lang) => speak(text, gen, lang),
    wait: (ms) => wait(ms, gen),
  };

  if (options.media) setMediaSessionMetadata(options.media.title, options.media.artist);
  setMediaSessionPlaybackState('playing');

  for (let i = 0; i < steps.length; i++) {
    if (isCancelled()) return false;
    options.onStep?.(steps[i].label, i, steps.length);
    await steps[i].run(ctx);
  }
  const completed = !isCancelled();
  if (completed) setMediaSessionPlaybackState('none');
  return completed;
}

/** @typedef {{isCancelled: () => boolean, playFile: (src: string) => Promise<void>, speak: (text: string, lang?: string) => Promise<void>, wait: (ms: number) => Promise<void>}} RunContext */

// --- Media Session (iOS/Android lock-screen + control-center integration) ---

function setMediaSessionMetadata(title, artist = 'IELTS Vocabulary') {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
}

function setMediaSessionPlaybackState(state) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

/** Registers a handler for the lock-screen / control-center stop & pause buttons. */
export function setMediaSessionStopHandler(handler) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.setActionHandler('stop', handler);
    navigator.mediaSession.setActionHandler('pause', handler);
  } catch {
    // Some browsers throw on unsupported action types; safe to ignore.
  }
}

/** True when the page is hidden/backgrounded (e.g. screen locked). */
export function isPageHidden() {
  return document.hidden;
}

/**
 * Subscribes to page visibility changes for as long as the returned
 * unsubscribe function isn't called. Used by the audio-session screen
 * to warn the user that background playback isn't fully reliable on
 * iOS (see module doc comment above).
 * @param {(hidden: boolean) => void} handler
 */
export function onVisibilityChange(handler) {
  const listener = () => handler(document.hidden);
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}
