# IELTS Audio App

IELTS vocabulary learning app for audio-based study.

## Day 1

Vocabulary: 1781–1790

### Features

- 📖 覚える (Learn mode) — word / meaning / example, with 英→日 and 日→英 audio playback
- 🔁 復習 (Review mode) — Recall → Answer → ◎ / △ / × self-rating
- 🎧 音声学習 (Audio-only mode) — hands-free playback of all 10 words in sequence
- ✏️ クイズ (Quiz) — 英→日 / 日→英 4-choice quiz

## How to use

Open `index.html` on your iPhone or iPad (via a static host — see
[Development](#development)) and add it to your Home Screen.

## Project structure

This is a static, build-free-at-runtime multi-page app — no framework,
no client-side router. Each mode is its own HTML page with its own
small JS entry point.

```
index.html          Home screen (stats + links to each mode)
learn.html           / js/learn.js
review.html          / js/review.js
quiz.html            / js/quiz.js
audio.html           / js/audio-session.js

js/
  audio-controller.js  Centralized playback controller (single source
                        of truth for anything that plays sound — see
                        "Audio playback" below)
  words.js             Fetches data/words.json for a given day
  storage.js            Crash-safe localStorage read/write
  util.js               escapeHtml(), Fisher–Yates shuffle()

css/tailwind.css     Compiled Tailwind output (committed; see Development)
src/input.css         Tailwind source (@layer components mirror the
                       original design's CSS classes)

data/words.sqlite     Source-of-truth word database (gitignored — see below)
data/words.json       Generated from words.sqlite; this is what the
                       browser actually fetches at runtime
scripts/seed-db.js    (Re)creates data/words.sqlite from a plain-JS
                       word list — the actual editable source of truth
scripts/build-words.js  Exports data/words.sqlite -> data/words.json

audio/                 Per-word mp3 clips (<id>_word.mp3, <id>_example.mp3)
```

### Why SQLite *and* JSON?

Vocabulary data is authored as a real SQLite database
(`data/words.sqlite`, schema: `days`, `words`) so it can be inspected,
queried, and edited with ordinary SQLite tooling as more days are
added. But this app has no server and no client-side build step at
deploy time (it's meant to run from a static host or even `file://`),
and reading SQLite directly on a phone would mean shipping a ~1MB WASM
runtime just to read a few dozen rows. So `data/words.json` — a flat
export of the database — is what the app actually fetches; it's
regenerated from `words.sqlite` at build time and is the only one of
the two committed to git (see below).

**`data/words.sqlite` itself is not committed** — it's a compiled
binary, and this branch could only be published through GitHub's
text-based file-write API (see "Known limitations" below), which
can't safely carry binary content. It's fully reproducible, though:
`scripts/seed-db.js` is the real, plain-text source of truth for word
data. Run it to (re)create `data/words.sqlite` locally, then export
JSON from it — see Development below. To add Day 2, add a new day/word
block to `scripts/seed-db.js` and re-run both scripts.

### Audio playback

All playback (word/example mp3s, Japanese TTS via the Web Speech API)
goes through `js/audio-controller.js`, which is the only module that
ever touches `Audio` or `speechSynthesis`. Every playback sequence
("learn card audio", "full audio session") is a `run()` call tagged
with a generation number; starting a new one always stops whatever
came before it first. This exists because the original single-file
prototype could play two audio clips on top of each other (pressing
both buttons quickly) and had a "ghost session" bug where closing and
immediately reopening the full-screen audio player left the old
playback loop running invisibly in the background, corrupting the new
session's UI. See the comment at the top of `audio-controller.js` for
details.

## Development

```
npm install
npm run build        # regenerate data/words.json + css/tailwind.css
npm run serve         # static file server on http://localhost:8080
```

Individual build steps:

```
node scripts/seed-db.js     # (re)create data/words.sqlite
npm run build:words          # export data/words.sqlite -> data/words.json
npm run build:css            # compile src/input.css -> css/tailwind.css
npm run watch:css             # ...and rebuild on change while editing
```

`data/words.json` and `css/tailwind.css` **are** committed (they're
what the deployed static site actually serves) — re-run the build
after editing `src/input.css`, `tailwind.config.js`, or
`scripts/seed-db.js`.

This app uses ES modules (`<script type="module">`) and `fetch()` for
`data/words.json`, both of which require loading pages over
`http://`/`https://` — opening `index.html` directly via `file://`
will not work; use `npm run serve` (or any static file server) during
development.

## Known limitations

**iOS lock-screen / background playback.** 音声学習 (the hands-free
audio session) publishes Media Session metadata so a locked iPhone
shows track info, but that only covers the portions of a session
backed by the shared `<audio>` element. The silent "recall" pause
(`setTimeout`) and the Japanese text-to-speech steps (`speechSynthesis`)
have no associated media element, and WebKit is known to throttle or
suspend both timers and speech synthesis in backgrounded tabs. In
practice this likely means playback can stall during those gaps once
the screen locks — `audio.html` shows an in-app warning
("画面がロック/バックグラウンド化されました…") when the page is
backgrounded during a session so this is visible rather than silent.

We were not able to verify the actual lock-screen behavior on physical
iOS hardware — this development environment is a Linux sandbox with no
iPhone/iPad available, and Playwright/Chromium's `page.hidden`
emulation doesn't reproduce WebKit's real background execution limits.
What *was* verified (in headless Chromium): the audio controller
correctly stops in-flight playback and prevents overlapping/"ghost"
sessions when starting, stopping, and immediately restarting a
session. If you test this on a real device and find lock-screen
playback still cuts out, the most reliable fix would be pre-mixing
each word's full sequence (word → meaning → example → translation)
into a single continuous mp3 per word (or per day) ahead of time, so
the entire session is driven by one `<audio>` element with no
TTS/timer gaps for iOS to interrupt.

## Prototype

Day 1: Vocabulary 1781–1790
