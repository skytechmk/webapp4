
# SnapifY System Architecture & AI Developer Guide

**Current Version:** 1.2 (Production Ready - Proxmox/LXC)
**Last Updated:** Current Date

## 1. Executive Summary
SnapifY is an event-sharing Single Page Application (SPA) backed by a Node.js API. It is designed to run on self-hosted infrastructure (Proxmox LXC). It prioritizes privacy (Private S3 Buckets), performance (Native FFmpeg transcoding with queues), and engagement (Real-time sockets).

---

## 2. Tech Stack & Infrastructure

### Frontend
*   **Framework:** React 18 + Vite + TypeScript.
*   **Styling:** Tailwind CSS.
*   **State:** Local React State + Socket.io Events.
*   **AI:** Google Gemini (Cloud) & Ollama (Local fallback) for text generation.
*   **Vision:** `face-api.js` (Client-side) for facial recognition.
*   **Build Artifact:** Static HTML/JS/CSS served via Nginx.

### Backend
*   **Runtime:** Node.js (Express).
*   **Process Manager:** PM2 (`ecosystem.config.js`).
*   **Database:** SQLite (`snapify.db`). *Chosen for zero-config portability.*
*   **Real-time:** Socket.io Server.
*   **Video Processing:** Native FFmpeg binary via `child_process.spawn`.
*   **Storage Interface:** `@aws-sdk/client-s3` with Presigned URLs.

### Infrastructure (Proxmox)
*   **App Container:** Ubuntu LXC (Runs Node.js + Nginx).
*   **Storage Container:** MinIO (S3 Compatible Object Storage).
*   **Network:** Local IP (e.g., `192.168.20.153`) mapped to Domain via DNS/Reverse Proxy.

---

## 3. Critical Workflows (The "Hidden" Logic)

### A. The Media Upload Pipeline (Video)
This is the most complex workflow. Do not break the order of operations.

1.  **Client Upload:** Browser sends `FormData` to `POST /api/media`.
2.  **Temp Storage:** Multer saves file to local disk (`/uploads`).
3.  **Database Entry:**
    *   Record created with `isProcessing = 1`.
    *   `url` set to S3 Key (e.g., `events/uuid/vid.mp4`).
    *   `previewUrl` is empty.
4.  **Socket Emit 1:** `media_uploaded` sent. Frontend shows "Processing" spinner.
5.  **Queueing:** Job added to `VideoQueue` (Concurrency: 1).
6.  **Processing (Async):**
    *   FFmpeg generates 720p MP4 preview.
    *   Original uploaded to S3.
    *   Preview uploaded to S3.
    *   Local temp files deleted.
7.  **Database Update:** `isProcessing = 0`, `previewUrl` updated.
8.  **Socket Emit 2:** `media_processed` sent with **Signed URLs**.
9.  **Frontend Update:** Replaces spinner with playable Video tag.

### B. Private S3 Security Model
We do **NOT** use public S3 buckets.
*   **Storage:** MinIO bucket is `private`.
*   **Database:** Stores **Keys** only (e.g., `events/123/abc.jpg`), not full URLs.
*   **Read Access:**
    *   Frontend requests event data (`GET /api/events`).
    *   Backend iterates media items.
    *   Backend generates **Presigned URL** (valid 1h) for every item.
    *   Frontend receives `http://minio/bucket/key?signature=...`.
*   **Why?** Ensures if someone scrapes the DB, they can't access files without valid AWS credentials to sign them.

### C. Tier Enforcement
Logic is shared between Frontend (`TIER_CONFIG` in `types.ts`) and Backend.
*   **Storage Limits:** Checked on Client before upload start.
*   **Feature Gates:** (Video, Branding, Watermark) checked in UI.
*   **Expiration:**
    *   **Free:** 7 Hours.
    *   **Paid:** 30 Days / Unlimited.
    *   *Note:* Expiration logic currently relies on the Frontend to hide the view. Backend API does not currently reject GET requests for expired events (Future Upgrade Opportunity).

---

## 4. Configuration & Environment

### Build-Time vs. Run-Time
*   **Frontend (`VITE_`):** Baked into the JS bundle at build time (`npm run build`). If you change these, you **MUST REBUILD**.
    *   `VITE_API_URL`: Where the React app looks for the Node server.
    *   `VITE_GOOGLE_CLIENT_ID`: GSI Auth.
*   **Backend (Process):** Read at startup. Restart PM2 to apply.
    *   `CORS_ORIGIN`: Security whitelist.
    *   `S3_*`: MinIO credentials.
    *   `VITE_ADMIN_EMAIL`: Grants admin role via email match.

### Key Environment Variables
```env
# Networking
VITE_API_URL=https://snapify.skytech.mk
CORS_ORIGIN=https://snapify.skytech.mk,http://192.168.20.153

# Storage (MinIO)
S3_ENDPOINT=http://192.168.20.153:9000
S3_BUCKET_NAME=snapify-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# AI
VITE_GEMINI_API_KEY=...
VITE_OLLAMA_URL=http://192.168.20.30:11434
```

---

## 5. Database Schema (SQLite)

*   **Users:** `id, name, email, role (ADMIN/USER/PHOTOGRAPHER), tier, storageUsedMb...`
*   **Events:** `id, hostId, title, pin, expiresAt, coverImage (S3 Key)...`
*   **Media:** `id, eventId, type, url (S3 Key), previewUrl (S3 Key), isProcessing...`
*   **Guestbook:** `id, eventId, senderName, message...`

---

## 6. Future Upgrade Paths (For the AI Agent)

If asked to upgrade this system, follow these paths:

1.  **Scaling Storage:**
    *   Current: Local disk buffering -> S3.
    *   Upgrade: Stream directly to S3 using `multer-s3` to remove local disk dependency (trade-off: harder to run FFmpeg).

2.  **Scaling Compute (Video):**
    *   Current: `child_process` on main server. Blocks Event Loop slightly.
    *   Upgrade: Move transcoding to a Redis-backed Job Queue (BullMQ) and a separate Worker Container.

3.  **Database Migration:**
    *   Current: SQLite (Single file).
    *   Upgrade: PostgreSQL. Change `sqlite3` driver to `pg`. The SQL syntax used is mostly standard, but check `AUTOINCREMENT` vs `SERIAL`.

4.  **Authentication:**
    *   Current: Hybrid (GSI + Custom Email).
    *   Upgrade: Integrate Auth0 or Firebase Auth for uniform identity management.

## 7. Troubleshooting "Gotchas"

*   **"My uploads are gone after restart!"** -> Normal. `uploads/` is a temp folder cleared on boot. Files should be in MinIO.
*   **"Video won't play."** -> Check `isProcessing` in DB. If stuck at 1, FFmpeg crashed. Check server logs.
*   **"CORS Error."** -> You likely changed the domain but didn't update `CORS_ORIGIN` in `.env` AND restart PM2.
*   **"MinIO Error."** -> Check `server/index.js` error handling. It catches connection refused errors specifically for backup windows.

---

## 8. Full Deployment Guide (Proxmox/LXC)

This guide assumes a fresh Ubuntu 22.04/24.04 LXC container.

### Phase 1: Server Preparation
```bash
# 1. Update & Install Tools
apt update && apt upgrade -y
apt install curl git nginx ffmpeg build-essential python3 -y

# 2. Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install PM2
npm install -g pm2
```

### Phase 2: Project Setup
```bash
# 1. Create Directory
mkdir -p /var/www/snapify
cd /var/www/snapify

# 2. Upload Code (Git clone or SCP)
# ...

# 3. Install Dependencies
npm install
npm install express sqlite3 multer cors body-parser socket.io @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv
```

### Phase 3: Configuration
Create `.env` file in `/var/www/snapify/.env`:
```env
# Frontend Build Vars
VITE_API_URL=https://snapify.skytech.mk
VITE_GOOGLE_CLIENT_ID=...
VITE_ADMIN_EMAIL=admin@skytech.mk

# Backend Runtime Vars
PORT=3001
CORS_ORIGIN=https://snapify.skytech.mk,http://192.168.20.153
S3_ENDPOINT=http://192.168.20.153:9000
S3_BUCKET_NAME=snapify-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

### Phase 4: Build Frontend
```bash
npm run build
# Verifies that 'dist/' folder is created
```

### Phase 5: Start Backend (PM2)
```bash
# 1. Start Process
pm2 start ecosystem.config.js

# 2. Persist on Reboot
pm2 save
pm2 startup
# Run the command output by pm2 startup
```

### Phase 6: Nginx Reverse Proxy
Edit `/etc/nginx/sites-available/snapify`:
```nginx
server {
    listen 80;
    server_name snapify.skytech.mk 192.168.20.153;
    client_max_body_size 500M; # Important for 4K Video

    root /var/www/snapify/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
Enable and Restart:
```bash
ln -s /etc/nginx/sites-available/snapify /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```
