# Claritas — AI Role Play

React + TypeScript frontend for practicing workplace conversations, with a Node API for Gemini chat, voice transcription, and speech output.

## Run locally

Use Node 22.15+ (the test loader uses Node module hooks).

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to an AI Studio API key.
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:5173`, enter a scenario, and allow microphone access.

Vite serves the UI and `/api` routes together. `GEMINI_MODEL`, `GEMINI_TRANSCRIPTION_MODEL`, `GEMINI_TTS_MODEL`, and `GEMINI_TTS_VOICE` can be set on the server. Existing `VITE_GEMINI_*` settings remain accepted **on the server only** for compatibility. Only `VITE_PUBLIC_*` variables are eligible for browser exposure; never use that prefix for secrets.

## Voice input flow

`MessageInput → useVoiceRecorder → useChat.sendAudio → chatService.sendAudioMessage → POST /api/transcribe → transcript → shared conversation logic → POST /api/chat → optional POST /api/speech → MessageList`

- Tap the microphone to record; tap Stop to submit automatically. Recording stops at two minutes, with an 8 MiB limit. Cancel discards the recording and stops microphone tracks.
- The recorder chooses a supported WebM/Opus, Ogg/Opus, or MP4 format. The server forwards audio bytes to Gemini using inline audio data and requests a verbatim transcript in the original language. MP4 audio uses the provider's M4A MIME type.
- Permission, recording, transcription, and reply progress are shown separately. Empty or unintelligible recordings produce an error without adding a conversation turn.
- Failed submissions retain the audio for playback, retry, or discard. If transcription already succeeded, retry reuses the transcript. Navigating away aborts pending frontend requests and stops the microphone.
- The transcript appears alongside audio playback. Conversation text is saved in localStorage and user audio Blobs in IndexedDB, so active-session recordings remain playable after reload. Draft recordings are held in memory only. Playback object URLs are revoked on unmount.
- Ending a session clears its transcript and recordings. On automatic completion, recordings remain playable until leaving the page. Assistant speech is optional: a speech-generation failure still displays the text reply.

The implementation follows [Google's Gemini audio input documentation](https://ai.google.dev/gemini-api/docs/generate-content/audio). Browser recording needs HTTPS or localhost and microphone permission.

## Scripts and deployment

- `npm run dev` — Vite development UI and API, port 5173
- `npm run lint` — Oxlint over `src`, `server`, and `tests`
- `npm run typecheck` — TypeScript project check
- `npm test` — API validation and voice conversation tests with mocked provider/storage boundaries
- `npm run build` — TypeScript check and production UI bundle
- `npm run preview` — Vite preview with API middleware
- `npm start` — Node server serving `dist` and `/api`; build first. Loads `.env`; defaults to `127.0.0.1:5173`. Configure `HOST` and `PORT` as needed.
- `node tests/browser-smoke.mjs` — optional Chrome smoke test against a running development server, with synthetic microphone input and mocked AI responses. Set `CHROME_PATH` if needed.

Deploy the Node server behind HTTPS; a static-only host cannot serve the API. The existing application uses demo authentication. Public deployment needs real authentication and per-user request limits on the API.

## Architecture

- `src/features/scenarios` — catalogue and scenario types
- `src/features/chat` — conversation UI, recording lifecycle, and playback
- `src/services` — frontend API adapters, conversation orchestration, IndexedDB audio storage
- `server/api.mjs` — shared server-only Gemini endpoints, validation, and sanitized errors
- `server/index.mjs` — standalone production server
- `src/pages` — route composition

The demo uses the `colombo-fde-agentic-01` persona in `src/Personas` and clears the active transcript at its turn cap or when the scenario is resolved.
