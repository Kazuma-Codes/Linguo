# 🗺️ Codebase Map & Debug Guide — Realtime Translation App (Spring Boot 3 + Next.js)

One doc to navigate the codebase and find bugs fast — organized by **symptom first, file second**.

---

## 1. The 30-Second Mental Model

```
[Web Client (Next.js)]
        │  HTTP (auth, rooms) + WebSocket (chat)
        ▼
   com.linguo (Spring Boot 3 Backend on port 8000)
        │
        ├── AuthController ──► AuthService ──► JwtService / BCrypt ──► UserRepository
        ├── RoomController ──► RoomService ──► ChatRoomRepository / ChatParticipantRepository
        │
        └── ChatWebSocketHandler (Realtime WebSocket)
                 │
                 ├── "send_draft" ──► saves Message entity (status='draft')
                 │                 ──► fires @Async Virtual Thread task
                 │                 ──► broadcasts "draft_ready" via Redis Pub/Sub
                 │
                 └── "confirm_draft" ──► marks Message entity (status='final')
                                      ──► broadcasts "message_finalized" via Redis Pub/Sub

   Async Translation Pipeline (Java 21 Virtual Threads)
        │
        ├── LanguageDetectionService (pure Java fast detection)
        ├── TranslationService ──► Groq API (llama-3.1-8b-instant)
        └── Cultural Footnotes ──► Groq Cultural Analysis Prompt
        │
        ▼
   RedisPubSubService ──► Publishes to "chat:{roomId}" ──► ChatWebSocketHandler broadcasts to active sockets
```

---

## 2. 🐛 Symptom → File Matrix (start here)

| Symptom / Error | It means this broke... | Look here first | Then check |
|---|---|---|---|
| ⏳ Messages stuck on "Drafting..." / no translation returns | Groq API key missing/invalid, or Groq rate limited | `TranslationService.java`, `application.yml` | `docker compose logs -f backend` |
| 🔌 WebSocket disconnects repeatedly or won't connect | Invalid/expired JWT query param, blocked CORS, or room not found | `ChatWebSocketHandler.java`, `SecurityConfig.java` | Browser console |
| 🔀 Wrong translation direction (e.g. English → English) | Room language seat misassigned, or detection overriding seat incorrectly | `RoomService.java` (`assignSeat`), `ChatService.java` | Database `chat_participants.language` |
| 🔑 HTTP 401 on API requests | Missing/expired Bearer token, wrong `SECRET_KEY`, or bad password | `JwtAuthenticationFilter.java`, `AuthService.java` | `AppProperties.java` |
| 🧠 Cultural footnotes missing / null | Groq returned non-JSON text or timed out | `TranslationService.java` (`getCulturalFootnotes`) | Backend logs |
| 🗄️ DB errors ("relation does not exist") | Postgres not ready or Hibernate auto-DDL mismatch | `User.java`, `ChatRoom.java`, `Message.java` | Postgres logs |
| 🌐 Draft saved but other user never sees it | Redis Pub/Sub connection failed or channel mismatch | `RedisPubSubService.java`, `RedisConfig.java` | `docker exec -it redis redis-cli` |
| ✅ Draft never becomes "final" | Confirm draft event failed or message ID / sender mismatch | `ChatService.java` (`handleConfirmDraft`) | Database `messages.status` |

---

## 3. 🔄 Data Flow Debugging Recipe

```
Step 1: Frontend UI sends draft over WebSocket
        ↳ Check: chat/[roomId]/page.tsx & store/useChatStore.ts

Step 2: WebSocket handler parses token, validates room, saves draft to DB
        ↳ Check: ChatWebSocketHandler.java & ChatService.java

Step 3: ChatService triggers @Async processTranslationAsync on Virtual Thread
        ↳ Check: ChatService.java

Step 4: TranslationService detects language and calls Groq API
        ↳ Check: LanguageDetectionService.java & TranslationService.java

Step 5: Cultural footnotes analyzed and saved to DB
        ↳ Check: TranslationService.java

Step 6: RedisPubSubService broadcasts draft_ready via Redis ──► WebSocket ──► UI
        ↳ Check: RedisPubSubService.java
```

---

## 4. File-by-File Cheat Sheet

### Spring Boot Backend (`/backend`)

| File / Package | One-line job |
|---|---|
| `com.linguo.LinguoApplication` | Spring Boot main entrypoint (`@EnableAsync`) |
| `com.linguo.config.SecurityConfig` | Spring Security 6 stateless JWT + CORS config |
| `com.linguo.config.JwtService` | HMAC-SHA256 JWT generation and validation |
| `com.linguo.config.WebSocketConfig` | Mounts WebSocket endpoint `/api/v1/ws/chat/{roomId}` |
| `com.linguo.config.RedisConfig` | Lettuce connection factory, Redis template, Pub/Sub listener container |
| `com.linguo.config.AsyncConfig` | Configures Project Loom Virtual Thread executor for async tasks |
| `com.linguo.model.entity.*` | JPA entities: `User`, `ChatRoom`, `ChatParticipant`, `Message` |
| `com.linguo.repository.*` | Spring Data JPA Repositories |
| `com.linguo.service.AuthService` | Registration, login, password hashing (BCrypt) |
| `com.linguo.service.RoomService` | Room creation, participant seat allocation, seat swapping |
| `com.linguo.service.ChatService` | Draft creation, async translation orchestration, message finalization |
| `com.linguo.service.TranslationService` | Groq API client with JSON mode for translations and cultural footnotes |
| `com.linguo.service.LanguageDetectionService` | Pure Java multi-script language identification |
| `com.linguo.service.RedisPubSubService` | Cross-instance chat broadcasting over Redis `chat:{roomId}` |
| `com.linguo.controller.*` | REST Controllers for `/api/v1/auth/*`, `/api/v1/rooms/*`, `/health` |
| `com.linguo.websocket.ChatWebSocketHandler` | WebSocket connection lifecycle, authentication, event dispatch |

### Web Frontend (`/frontend`)

| File | One-line job |
|---|---|
| `src/store/useAuthStore.ts` | Zustand auth state + localStorage sync |
| `src/store/useChatStore.ts` | WebSocket connection, reconnection, drafts/messages state |
| `src/lib/api.ts` | Fetch wrapper for all REST calls |
| `src/app/page.tsx` | Login/register + room list/create UI |
| `src/app/chat/[roomId]/page.tsx` | Chat UI: drafts, edits, footnotes, confirm button |
| `src/config.ts` | API/WS base URLs |

---

## 5. Environment & Ports Quick Reference

| Service | Port | Config Source |
|---|---|---|
| Spring Boot Backend | 8000 | `application.yml` |
| Next.js Frontend | 3000 | `application.yml` CORS allowlist |
| PostgreSQL | 5432 | `DATABASE_URL` in `.env` |
| Redis | 6379 | `REDIS_URL` in `.env` |
| Actuator / Prometheus | 8000 | `/actuator/prometheus` |