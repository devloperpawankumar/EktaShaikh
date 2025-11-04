# Client (React + Vite + Tailwind + Framer Motion)

## Setup
```
npm install
npm run dev
```

- Dev server: http://localhost:5173
- Proxies `/api` and `/uploads` to the server at http://localhost:4000

## Environment

Create a `.env` file in `client/` (values shown are examples):

```
VITE_API_BASE=https://your-api-host.example.com
VITE_SOCKET_URL=https://your-api-host.example.com
```

If `VITE_SOCKET_URL` is omitted or empty, the Socket.IO client will use same-origin.

## Notes
- Styling uses Tailwind; global styles in `src/index.css`
- Main app in `src/App.jsx` with views: Booth, Archive, Recorder
- Socket.IO client is used for mock live transcription

## Deploy on Vercel (frontend)

The repo includes a root `vercel.json` configured to build the Vite client:

- Build command: `npm --prefix client install && npm --prefix client run build`
- Output directory: `client/dist`

Steps:

1. Push to GitHub/GitLab/Bitbucket.
2. In Vercel, import the repo.
3. Set Environment Variables in the project (Production/Preview):
   - `VITE_API_BASE` = your API base, e.g. `https://your-api-host`.
   - `VITE_SOCKET_URL` = your Socket.IO server URL (or leave blank for same-origin).
4. Deploy.

## Backend hosting

This frontend expects an API with routes:

- `GET /api/messages` (JSON list)
- `POST /api/messages/upload` (multipart/form-data with `audio`)
- Static files under `/uploads/*`
- Socket.IO at the same host (default path `/socket.io`)

Because uploads and Socket.IO are involved, prefer deploying the server on a host that supports:

- Persistent storage (or S3) for `/uploads`
- WebSockets (not only HTTP polling)
- Long-lived Node process (e.g., Render, Railway, Fly.io, AWS EC2/ECS, etc.)

Then set the above envs to point to that server.
