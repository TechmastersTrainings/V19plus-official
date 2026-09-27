# V19Plus Production Deployment Guide

This guide details how to deploy the entire V19+ platform (Backend API, Frontend Web, Admin CMS, PostgreSQL Database, Object Storage, and Authentication) using a unified cloud architecture.

---

## Architecture Overview

| Component | Production Host / Provider | URL / Endpoint |
|-----------|----------------------------|----------------|
| **Database** | Managed PostgreSQL (Render / Supabase / AWS RDS) | `postgresql://...` |
| **Redis Cache** | Managed Redis (Render / Upstash / AWS ElastiCache) | `redis://...` |
| **Backend API** | Render / AWS ECS (FastAPI + Uvicorn) | `https://v19plus-api.onrender.com` |
| **Object Storage** | Cloudflare R2 / AWS S3 (Signed Media Delivery) | `https://stream.v19plus.com` |
| **Consumer Web App** | Vercel | `https://v19plus-web.vercel.app` |
| **Admin CMS** | Vercel | `https://v19plus-admin.vercel.app` |
| **Android App** | Google Play Store / Capacitor Android Bundle | Native App (`com.v19plus.app`) |

---

## Step 1 — Database & Cache Setup

1. Provision a PostgreSQL 16+ database instance.
2. Provision a Redis 7+ instance.
3. Configure connection strings in your backend environment variables:
   ```env
   DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>
   DATABASE_SYNC_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
   REDIS_URL=redis://<user>:<password>@<host>:<port>/0
   ```

---

## Step 2 — Backend API Deployment (Render / Docker)

1. Connect your GitHub repository to Render as a Web Service pointing to `apps/backend/Dockerfile`.
2. Configure environment variables:
   - `ENVIRONMENT=production`
   - `JWT_ACCESS_SECRET=<generate secure 64-char key>`
   - `JWT_REFRESH_SECRET=<generate secure 64-char key>`
   - `PLAYBACK_TOKEN_SECRET=<generate secure 64-char key>`
   - `DATABASE_URL`
   - `DATABASE_SYNC_URL`
   - `REDIS_URL`
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_STREAMING_BUCKET`
   - `ALLOWED_ORIGINS=https://v19plus-web.vercel.app,https://v19plus-admin.vercel.app,capacitor://localhost`

---

## Step 3 — Deploy Next.js Frontends (Vercel)

1. **Consumer Web App (`apps/web`):**
   - Root directory: `apps/web`
   - Build command: `npm run build`
   - Output directory: `.next`
   - Environment variables:
     - `NEXT_PUBLIC_API_URL=https://v19plus-api.onrender.com/api`

2. **Admin CMS (`apps/admin`):**
   - Root directory: `apps/admin`
   - Build command: `npm run build`
   - Output directory: `.next`
   - Environment variables:
     - `NEXT_PUBLIC_API_URL=https://v19plus-api.onrender.com/api`

---

## Step 4 — Android Mobile Build (Capacitor)

1. Synchronize web assets with the native Android project:
   ```bash
   cd apps/web
   npx cap sync android
   ```
2. Open in Android Studio or compile with Gradle:
   ```bash
   cd android
   ./gradlew assembleRelease bundleRelease
   ```
3. Sign and publish the generated AAB artifact to the Google Play Console.
