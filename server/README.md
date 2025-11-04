# Server (Express + MongoDB)

## Setup
- Node 18+
- Local MongoDB

## Env
Create `server/.env`:
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/digital_phone_booth
CLIENT_ORIGIN=http://localhost:5173
# OPENAI_API_KEY=
# GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
```

## Commands
```
npm install
npm run dev
```

## Endpoints
- `GET /api/health`
- `GET /api/messages`
- `POST /api/messages/upload` (form-data: `audio` file, optional `title`, `durationSeconds`, `transcript`)
- Static: `/uploads/*`

## Realtime
- Socket.IO: client emits `start-transcription`; server emits `transcription` chunks (mock stream).

## Transcription Providers
See `src/services/transcription.js` for commented examples for OpenAI Whisper and Google STT.
