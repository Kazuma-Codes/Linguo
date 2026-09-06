# Deploy to Render & Vercel

This deployment path is intended for a hardened single-instance MVP.
PostgreSQL is the source of truth, while Redis is required for realtime
fan-out and coordination. Do not use the free-tier setup for workloads that
require guaranteed availability or strict latency objectives.

## Prerequisites

1. **GitHub account** — push this repo to GitHub
2. **Upstash account** — https://upstash.com (free Redis tier)
3. **Neon or Supabase** — https://neon.tech (free PostgreSQL tier)
4. **Groq API key** — https://console.groq.com (free)
5. **Render account** — https://render.com (free web service tier)

---

## Step 1: Get a Groq API Key

1. Go to https://console.groq.com
2. Sign up / log in and create an API key (starts with `gsk_`)

---

## Step 2: Create Upstash Redis

1. Go to https://console.upstash.com
2. Click "Create Database" -> name it `linguo-redis`
3. Copy the **REDIS_URL** (format: `redis://...@...upstash.io:6379`)

---

## Step 3: Create PostgreSQL Database on Neon / Supabase

1. Go to https://neon.tech or https://supabase.com
2. Create a new database project
3. Copy the Connection URI (starts with `postgresql://...`)

---

## Step 4: Deploy Spring Boot Backend on Render

1. Render Dashboard → "New +" → "Web Service"
2. Connect your GitHub repo
3. Settings:
   - **Name:** `linguo-backend`
   - **Root Directory:** repository root
   - **Runtime:** `Docker`
   - **Instance Type:** Free
4. Add Environment Variables:
   ```
   DATABASE_URL          = [paste your PostgreSQL URL from Step 3]
   REDIS_URL             = [paste your REDIS_URL from Step 2]
   GROQ_API_KEY          = [paste your Groq API key from Step 1]
   SECRET_KEY            = [generate a random 32+ char string]
   ALLOWED_ORIGINS       = https://linguo-frontend.vercel.app,http://localhost:3000
   ```
5. Click "Create Web Service"

The repository-root `render.yaml` uses `backend/Dockerfile` with the repository
root as its Docker context. If configuring the service manually, use the same
Dockerfile and context so the build remains consistent with CI.

---

## Step 5: Deploy Next.js Frontend on Vercel

1. Go to https://vercel.com
2. Import your GitHub repo
3. Framework: Next.js (Root Directory: `frontend`)
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://linguo-backend.onrender.com
   NEXT_PUBLIC_WS_URL  = wss://linguo-backend.onrender.com
   ```
5. Deploy

---

## Step 6: Update Backend CORS

1. Go back to Render → `linguo-backend` → Environment
2. Update `ALLOWED_ORIGINS` to include your live Vercel URL:
   ```
   https://linguo-frontend.vercel.app,http://localhost:3000
   ```
3. Backend will auto-redeploy.

## Production checklist

- Use a unique randomly generated `SECRET_KEY`; never commit it.
- Set `ALLOWED_ORIGINS` to the exact Vercel origin(s), not `*`.
- Configure `DATABASE_URL`, `REDIS_URL`, and `GROQ_API_KEY` as Render secrets.
- Verify health, readiness, metrics access, REST authentication, and WebSocket
  connectivity after deployment.
- Take a PostgreSQL backup before schema migrations and record the release
  version for rollback.
- Treat a failed migration or readiness check as a deployment failure.

## Rollback

1. Roll back the Render service to the last known-good release.
2. Restore the previous Vercel deployment if the API contract changed.
3. Do not automatically reverse a database migration; use its forward-fix or
   documented restore procedure after taking a fresh backup.
4. Re-check health, authentication, room access, and WebSocket connectivity.
