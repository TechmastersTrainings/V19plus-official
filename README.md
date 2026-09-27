# V19+

Netflix-style OTT streaming platform — browse movies, series, and documentaries with subscriptions, watch history, and an admin CMS.

## Stack

| App | Tech | Port |
|-----|------|------|
| API | NestJS + Prisma + PostgreSQL | 4000 |
| Web | Next.js 14 (consumer) | 3000 |
| Admin | Next.js 14 (CMS) | 3001 |

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL (or use Docker: `docker compose -f docker-compose.db.yml up -d`)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and edit as needed
cp .env.example .env

# Start PostgreSQL, then push schema and seed
npm run db:push --workspace=apps/backend
npm run db:seed --workspace=apps/backend

# Run all apps (API + web + admin)
npm run dev
```

### URLs

- Consumer app: http://localhost:3000
- Admin panel: http://localhost:3001
- API health: http://localhost:4000/api/health

### Default accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@v19plus.com | `ADMIN_PASSWORD` env or `admin123` |
| Demo user | demo@v19plus.com | `demo1234` |

## Project structure

```
apps/
  backend/   # NestJS API (Firebase Admin + Firestore backend)
  web/       # Consumer Next.js app (Firebase Hosting)
  admin/     # Admin CMS Next.js app
packages/
  types/     # Shared TypeScript types
  utils/     # Shared utilities
```

The monorepo under `apps/` is the active production stack.

## Environment notes

- `DATABASE_URL` must be a PostgreSQL connection string.
- Set `FRONTEND_URL=http://localhost:3000` for OAuth redirects and payment callbacks.
- Stripe and Razorpay run in **simulation mode** in development when keys are not configured. In production, valid keys are required.
- Change `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ADMIN_PASSWORD` before deploying.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API, web, and admin concurrently |
| `npm run build` | Build all workspaces |
| `npm run db:seed --workspace=apps/backend` | Seed database with sample content |
| `npm run mobile:init` | Initialize Capacitor Android project |
| `npm run mobile:android` | Open Android Studio to build APK |

## Firebase Integration & Configuration Guide

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project**, name your project (e.g. `v19-plus`), and complete creation.
3. In **Project Settings** > **General**, click **Add app** and select **Web** (`</>`).
4. Copy the generated `firebaseConfig` keys.

### 2. Enable Cloud Firestore & Cloud Storage
1. **Cloud Firestore**:
   - Go to **Build** > **Firestore Database** > **Create Database**.
   - Select production mode and your preferred data center location.
2. **Cloud Storage**:
   - Go to **Build** > **Storage** > **Get Started**.
   - Select standard location and start in production mode.

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Firebase values:

```env
# Frontend Firebase Client Credentials
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="v19-plus.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="v19-plus"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="v19-plus.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123def456"

# Backend Firebase Admin Service Account
FIREBASE_PROJECT_ID="v19-plus"
FIREBASE_STORAGE_BUCKET="v19-plus.firebasestorage.app"
FIREBASE_SERVICE_ACCOUNT_BASE64="ey...==" # Base64 encoded service account JSON
```

### 4. Deploy Firestore & Storage Security Rules
Install Firebase CLI and deploy the rules:

```bash
# Login to Firebase CLI
npx firebase-tools login

# Deploy Security Rules to Firebase
npx firebase-tools deploy --only firestore:rules,storage
```

### 5. Create the First Admin User
1. Register a new user via the app interface or Firebase Authentication console.
2. Add your admin email to `ADMIN_EMAILS` in `.env`:
   ```env
   ADMIN_EMAILS="v19plus04@gmail.com,admin@v19plus.com"
   ```
3. Upon signing in, the backend will auto-promote your user account to `ADMIN` role in Firestore.

### 6. Uploading the First Series & Episode
1. Log in to the Admin Panel (`http://localhost:3001` or your production domain).
2. Go to **Content Manager** > **Add Title**.
3. Create your Series entry (Title, Summary, Type = `SERIES`, Poster URL).
4. Click **Upload** next to the series title.
5. Select your raw **MP4 video file** (`video/mp4`).
6. The upload progress will render in real time (`Uploading Episode [██████████████░░░░] 72%`).
7. Upon completion, the file will be stored in Storage at `videos/{seriesId}/episode-001.mp4` and metadata linked in Firestore.

## Production deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide:

- **Database:** Supabase PostgreSQL & Firebase Firestore
- **API:** Render
- **Web + Admin:** Vercel (two projects)
- **Mobile:** Capacitor Android APK

