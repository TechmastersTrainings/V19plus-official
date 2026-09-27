# V19Plus

Premium OTT Video Streaming Platform — browse movies, series, originals, and documentaries with subscriptions, watch history, profile management, and a dedicated admin CMS.

## Stack & Architecture

| Application / Service | Technology Stack | Default Port / URL |
|-----------------------|------------------|--------------------|
| **Backend API** | FastAPI (Python 3.12) + SQLAlchemy + PostgreSQL | `http://localhost:8000` |
| **Web Portal** | Next.js 14 + React + TypeScript + TailwindCSS | `http://localhost:3000` / `3001` |
| **Admin CMS** | Next.js 14 + React + TypeScript + TailwindCSS | `http://localhost:3002` |
| **Database** | PostgreSQL 16+ (Asyncpg / SQLAlchemy) | `5432` |
| **Cache / Broker** | Redis 7+ | `6379` |
| **Object Storage** | Cloudflare R2 / AWS S3 (Signed URLs) | Cloud / CDN |
| **Mobile App** | Capacitor Android Native Shell | Android APK / AAB |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16+
- Redis

### Setup

```bash
# 1. Install Node.js monorepo dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Setup Python Backend Environment
cd apps/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 4. Run database migrations and seed default content
alembic upgrade head
python seed.py

# 5. Run the web development server
cd ../..
npm run dev
```

---

## Project Structure

```
apps/
  backend/       # FastAPI Python application (SQLAlchemy, PostgreSQL, Redis, JWT)
  web/           # Consumer OTT Next.js application
  admin/         # Administrative content and user management CMS
packages/
  types/         # Shared TypeScript type definitions
  utils/         # Shared frontend utility libraries
```

---

## Environment Configuration

Configure standard variables in `.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:root@127.0.0.1:5432/v19plus_db
DATABASE_SYNC_URL=postgresql://postgres:root@127.0.0.1:5432/v19plus_db

# Redis
REDIS_URL=redis://127.0.0.1:6379/0

# JWT Authentication
JWT_ACCESS_SECRET=your_jwt_access_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_characters
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Object Storage (Cloudflare R2 / S3)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_STREAMING_BUCKET=v19plus-streaming

# Payments (Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

---

## Production Deployment

- **Backend API:** Dockerized deployment on Render / AWS ECS.
- **Database:** Managed PostgreSQL (Render / Supabase / AWS RDS).
- **Web & Admin:** Vercel.
- **CDN & Storage:** Cloudflare R2 and Cloudflare CDN.
- **Mobile:** Capacitor Android APK & Play Store release bundle.
