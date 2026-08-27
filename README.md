# Realtime Multilingual AI Translation Chat (Spring Boot 3 + Next.js)

A high-performance real-time chat application with live bidirectional AI translation, language seat management, and cultural footnote analysis.

## Tech Stack
- **Backend:** Spring Boot 3.4 (Java 21/25), Virtual Threads, Spring Security (JWT + BCrypt), Spring Data JPA, Spring WebSocket, Spring Data Redis
- **Frontend:** Next.js 14, React, TypeScript, Zustand, Tailwind CSS
- **Database & Cache:** Cloud PostgreSQL (Neon / Supabase), Cloud Redis (Upstash)
- **AI Translation:** Groq API (`llama-3.1-8b-instant`)

---

## 🚀 Quick Setup (Zero Docker Required)

### 1. Get Free Cloud Database & Cache (Takes 2 minutes)
1. **Groq API Key (Free):** Create an account at [console.groq.com](https://console.groq.com) and generate an API key.
2. **PostgreSQL (Free):** Create a database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and copy your `postgresql://...` connection string.
3. **Redis (Free):** Create a database on [Upstash.com](https://upstash.com) and copy your `redis://...` URL.

---

### 2. Configure Backend Environment
Create `backend/.env` (or set environment variables):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
DATABASE_URL=postgresql://user:password@your-neon-host.tech/dbname?sslmode=require
REDIS_URL=redis://default:your_upstash_password@your-upstash-endpoint.upstash.io:6379
SECRET_KEY=supersecretkey_must_be_at_least_32_characters_long!
ALLOWED_ORIGINS=http://localhost:3000
```

---

### 3. Run the Project

#### Step A: Start Spring Boot Backend
```bash
cd backend
mvn spring-boot:run
```
*Backend starts on `http://localhost:8000` (tables are auto-created in Postgres on first startup).*

#### Step B: Start Next.js Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

#### Step C: Open App
Visit **`http://localhost:3000`** in your browser!
