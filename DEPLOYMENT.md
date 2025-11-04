# Deployment Guide

This project has a Vite React frontend (`client/`) and a Node/Express API server (`server/`).

- Frontend can be deployed to Vercel easily.
- Backend requires a host that supports Node, WebSockets, and persistent storage (or S3) for uploads.
- GoDaddy: static hosting (cPanel) can host the built frontend; Node server requires a VPS or separate provider (Render/Railway/etc.).

## 1) Frontend on Vercel

Monorepo setup uses `client/vercel.json` (frontend only). The server has its own `server/vercel.json` that intentionally skips Vercel builds because it needs WebSockets and persistent storage.

- Build command (client): `npm install && npm run build`
- Output dir (client): `dist`
- SPA routing fallback to `index.html` is configured in `client/vercel.json`.

Steps:
1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new Project and set the Root Directory to `client/` when importing the repo.
3. Set environment variables (Production and Preview):
   - `VITE_API_BASE` = `https://YOUR_API_HOST` (e.g., your server base URL)
   - `VITE_SOCKET_URL` = `https://YOUR_API_HOST` (or leave empty for same-origin)
4. Deploy. After deploy, verify pages and network calls in the browser DevTools.

## 2) Backend on a Node host (Render/Railway/Fly/EC2)

Requirements:
- Node 18+
- MongoDB (Atlas or self-hosted)
- WebSocket support
- Persistent storage for `/uploads` (or use S3 and change code to upload there)

Env variables to set on your host:
- `PORT` (e.g., 4000)
- `MONGO_URI` (MongoDB connection string)
- `CLIENT_ORIGIN` (your frontend origin, e.g., `https://your-vercel-domain.vercel.app` or custom domain)
- Optional provider keys used by `src/services/transcription.js`

Commands:
- Install deps: `npm install`
- Start: `npm start`

CORS and Socket.IO are already configured to respect `CLIENT_ORIGIN`.

### Nginx sample (optional, if reverse proxying)
```
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 3) GoDaddy deployment options

- Shared hosting (cPanel):
  - Can host the built frontend as static files.
  - Cannot run the Node server. Host the server elsewhere (Render/Railway/Fly/EC2), then point the frontend env vars to that API.

Steps (cPanel static hosting):
1. Build frontend locally: in `client/`: `npm install && npm run build`.
2. Upload the contents of `client/dist/` to `public_html/` via File Manager or SFTP.
3. If using a subfolder, ensure links are relative or set `base` in `vite.config.js` accordingly.
4. Point your domain to the hosting; clear cache and test.

- GoDaddy VPS/Dedicated:
  - You can run the Node server. Use Node 18+, PM2/systemd, and Nginx reverse proxy.

Server setup (Ubuntu example):
```
sudo apt update && sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# clone code (or deploy via CI)
# cd server && npm ci && npm run build (if applicable) && npm start

# systemd unit example
sudo tee /etc/systemd/system/digital-phone-booth.service > /dev/null <<'UNIT'
[Unit]
Description=Digital Phone Booth API
After=network.target

[Service]
WorkingDirectory=/var/www/digital-phone-booth/server
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=PORT=4000
Environment=MONGO_URI=YOUR_MONGO_URI
Environment=CLIENT_ORIGIN=https://your-frontend-domain

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now digital-phone-booth

# nginx config (see above), then:
sudo systemctl restart nginx
```

## 4) Environment variables summary

Frontend (`client`):
- `VITE_API_BASE` — base URL for API, e.g., `https://api.example.com`
- `VITE_SOCKET_URL` — Socket.IO server URL; leave empty to use same-origin

Server (`server`):
- `PORT` — port for Express
- `MONGO_URI` — MongoDB connection
- `CLIENT_ORIGIN` — allowed CORS origin (your frontend origin)
- Provider keys as needed by your transcription service

## 5) Post-deploy checks
- Visit frontend pages and ensure navigation works (SPA fallback configured).
- Verify API calls in DevTools > Network.
- Check `/api/health` and `/api/health/db` on the server.
- Test audio uploads to `/api/messages/upload` and playback from `/uploads/*`.
- Test live transcription socket.

## 6) Custom domains
- Vercel: add your domain in project settings; configure DNS (CNAME/A) as instructed by Vercel.
- API host: point `api.yourdomain.com` to your server IP via DNS A record; ensure Nginx TLS (Let's Encrypt) if using HTTPS.

---
If you need me to wire S3 for uploads (recommended for production) or create CI/CD workflows, tell me your target platform and I’ll add them.

