# 100% Pure Firebase Deployment Guide

This guide details how to deploy the entire V19+ platform (Frontend, Admin CMS, Database, Object Storage, and Authentication) using a unified **Firebase Architecture**. 
The NestJS API backend remains on Render and connects to Firebase as a secure administrator.

## Architecture Stack

| Layer | Platform | URL example |
|-------|----------|-------------|
| Database | **Firebase Firestore** | — |
| Object Storage | **Firebase Cloud Storage** | — |
| Authentication | **Firebase Auth (Google OAuth)** | — |
| Consumer app | **Firebase Hosting** | `https://v19plus-web.web.app` |
| Admin CMS | **Firebase Hosting** | `https://v19plus-admin.web.app` |
| API Backend | **Render** | `https://v19plus-api.onrender.com` |

---

## Step 1 — Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Enable Services:**
   - **Authentication:** Enable Google Sign-In.
   - **Firestore Database:** Create database (Start in Production mode).
   - **Storage:** Create Cloud Storage bucket.
3. **Generate Admin Credentials:**
   - Go to **Project Settings → Service accounts**.
   - Click **Generate new private key** and save the JSON file.
   - Encode this JSON file to Base64 (e.g., `base64 -w 0 path/to/serviceAccountKey.json`). This will be used as `FIREBASE_SERVICE_ACCOUNT_BASE64` on Render.
4. **Get Client Configuration:**
   - Go to **Project Settings → General**.
   - Add a Web App to get your `firebaseConfig` object (apiKey, authDomain, etc.).

---

## Step 2 — Deploy Backend API (Render)

1. Push your repository to **GitHub**.
2. Go to [Render](https://render.com) → **New → Blueprint** and select your repo.
3. Add the following **Environment Variables** in Render:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=<your base64 encoded json>
FIREBASE_PROJECT_ID=<your firebase project id>
FRONTEND_URL=https://v19plus-web.web.app
ADMIN_URL=https://v19plus-admin.web.app
```
4. Verify the API is awake: `https://YOUR-API.onrender.com/api/health`

---

## Step 3 — Deploy Next.js Frontends (Firebase Hosting)

Firebase Hosting now supports Server-Side Rendered (SSR) Next.js apps via the experimental **Web Frameworks** integration.

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Set your Project ID:**
Make sure your `.firebaserc` file points to your actual Firebase project ID, or run:
```bash
firebase use --add
```

4. **Add Environment Variables:**
In both `apps/web/.env.production` and `apps/admin/.env.production`, set your client variables:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
BACKEND_URL=https://YOUR-API.onrender.com
NEXT_PUBLIC_API_URL=/api
```

5. **Deploy:**
```bash
# This will build and deploy both apps automatically
firebase deploy --only hosting
```

Your apps will now be live at your Firebase project URLs!
