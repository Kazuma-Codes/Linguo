# Deploy to Render & Vercel (Free Tier)

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
   - **Root Directory:** `backend`
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
