# Mosaic (Linguo) Project Architecture & Directory Map

A comprehensive guide explaining the purpose, responsibility, and structure of every file and folder in the Mosaic multilingual chat application.

---

## 🏗️ System Overview

Mosaic is a realtime multilingual AI-translation chat platform with an omni-language room architecture:
- **Send Draft → AI Translate → Confirm Draft** workflow with per-recipient seat translations.
- **Many-to-Many Translation Engine**: parallel virtual-thread fan-out to all distinct participant languages in a room.
- **Redis Translation Caching**: 30-day SHA-256 keyed cache (`tr:{sha256}:{src}:{dst}`) preventing redundant LLM inference.
- **Translated-First Bubble UX**: Recipients see incoming messages translated into their seat language; an inspection drawer (ⓘ) expands the original text, detected language, and cultural footnotes.

```
[Next.js 14 Frontend]  <--- WebSocket / REST --->  [Spring Boot 3.4 Backend]
        |                                                    |
        |                                          +---------+---------+
        |                                          |                   |
 [Tailwind / Zustand]                        [PostgreSQL]        [Redis Pub/Sub]
                                             (Neon/Flyway)      & Translation Cache
                                                                       |
                                                                  [Groq LLM]
```

---

## 📁 Backend Directory Map (`/backend`)

The backend is built with Spring Boot 3.4.3 and Java 21, organized into standard domain layers:

### 1. `src/main/resources/`
- **`application.yml`**: Production configuration (Flyway, JPA, Redis Lettuce, Groq API, JWT secrets, CORS).
- **`application-local.yml`**: Local development overrides.
- **`db/migration/`**: Flyway versioned SQL database migrations:
  - `V1__initial_schema.sql`: Initial DDL for `users`, `chat_rooms`, `chat_participants`, and `messages`.
  - `V2__add_message_translations.sql`: Adds `translations` JSON text column to `messages`.
  - `V3__nlangs.sql`: Adds index `idx_participants_room` on `chat_participants(room_id)` and `max_members` to `chat_rooms`.

### 2. `src/main/java/com/mosaic/`

#### ⚙️ `config/` (Application & Security Configuration)
- **`AppProperties.java`**: Strongly-typed configuration properties mapping `${app.*}` and `${groq.*}` settings.
- **`AsyncConfig.java`**: Configures Spring `@Async` to use Java 21 Virtual Threads (`Executors.newVirtualThreadPerTaskExecutor()`).
- **`DataSourceConfig.java`**: Configures HikariCP database connection pooling and SSL options.
- **`JwtAuthenticationFilter.java`**: Per-request HTTP servlet filter validating Bearer JWTs and setting Spring Security context.
- **`JwtService.java`**: HMAC-SHA256 JWT generator and validator.
- **`RedisConfig.java`**: Lettuce connection factory, Redis Pub/Sub listener container, and `StringRedisTemplate`.
- **`SecurityConfig.java`**: Spring Security filter chain (stateless session, BCrypt password encoder, CORS rules).
- **`WebSocketConfig.java`**: Registers the `/api/v1/ws/chat/{roomId}` endpoint and mounts `ChatWebSocketHandler`.

#### 🌐 `controller/` (REST API Endpoints)
- **`AuthController.java`**: Authentication routes (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /me`, `PATCH /preferred-language`).
- **`HealthController.java`**: Readiness and liveness probe endpoint (`GET /api/v1/health`).
- **`RoomController.java`**: Room operations (`POST /rooms`, `GET /rooms`, `POST /rooms/{id}/join`, `GET /rooms/{id}`, `GET /rooms/{id}/members`, `POST /rooms/{id}/set-language`).

#### 🚨 `exception/` (Global Error Handling)
- **`GlobalExceptionHandler.java`**: Translates validation failures, `DataIntegrityViolationException` (409 Conflict), and `ResponseStatusException` into standardized RFC-style JSON error payloads.

#### 📦 `model/` (Entities and Data Transfer Objects)
- **`model/dto/`**: Request and response JSON payloads:
  - `CulturalFootnotes.java`: DTO containing `humor_explanation`, `idiom_breakdown`, and `etiquette_warning`.
  - `LoginRequest.java`: Login credentials.
  - `MemberResponse.java`: Room participant info (`email`, `language` seat, `joined_at`).
  - `RoomCreateRequest.java`: Parameters for creating a chat room.
  - `RoomDetailResponse.java`: Full room metadata, creator ID, user's seat, `members` list, and `distinct_langs`.
  - `RoomResponse.java`: Summary room representation for dashboard lists.
  - `SetLanguageRequest.java`: Request to switch language seat.
  - `TokenResponse.java`: Access token returned on successful authentication.
  - `UpdatePreferredLanguageRequest.java`: Request to update user's default language.
  - `UserCreateRequest.java` / `UserResponse.java`: Registration request and public user details.
  - `WsIncomingMessage.java` / `WsOutgoingMessage.java`: WebSocket protocol envelopes (`send_draft`, `draft_ready`, `confirm_draft`, `message_finalized`, `ping`, `pong`).
- **`model/entity/`**: JPA Hibernate database entities:
  - `User.java`: User table (`email`, `hashed_password`, `preferred_language`, `is_active`).
  - `ChatRoom.java`: Room table (`title`, `source_lang`, `target_lang`, `max_members`, `creator_id`).
  - `ChatParticipant.java`: Room membership and language seat (`room_id`, `user_id`, `language`).
  - `Message.java`: Message table (`original_text`, `translated_text`, `translations`, `status`, `cultural_footnotes`).

#### 🗄️ `repository/` (Database Access)
- **`ChatParticipantRepository.java`**: Participant lookup with `@EntityGraph` eager-joining `User`, `existsByRoomIdAndUserId`, and `countByRoomId`.
- **`ChatRoomRepository.java`**: Room lookup by ID and participant user ID.
- **`MessageRepository.java`**: Message retrieval, atomic translation assignment, and footnotes updates.
- **`UserRepository.java`**: User lookup by email and existence checks.

#### 🧠 `service/` (Business Logic & External Services)
- **`AuthService.java`**: User registration, credential verification, and JWT generation.
- **`ChatService.java`**: Coordinates draft saving, transaction synchronization (`afterCommit`), virtual-thread multi-language translation fan-out, and draft confirmation.
- **`TranslationCacheService.java`**: Redis key-value cache (`tr:{sha256}:{src}:{dst}`) for instantaneous, zero-cost repeated translations.
- **`TranslationService.java`**: Groq API integration (multi-key rotation, model fallback, cultural footnote extraction).
- **`LanguageDetectionService.java`**: Local regex/script-based language identifier for fast zero-cost detection.
- **`RedisPubSubService.java`**: Publishes messages to room-scoped Redis channels (`chat:{roomId}`).
- **`RoomService.java`**: Room lifecycle, participant seat allocation, capacity verification, and member roster.

#### 🔌 `websocket/` (Realtime Communication)
- **`ChatWebSocketHandler.java`**: Raw WebSocket handler managing sessions, token authentication, ping/pong heartbeats, message serialization, and room-bound broadcasts.

---

## 📁 Frontend Directory Map (`/frontend`)

The frontend is built with Next.js 14 (App Router), React 18, Zustand, and Tailwind CSS:

### 1. `src/components/` (Modular UI Components)

#### 💬 `src/components/chat/`
- **`ChatMessageBubble.tsx`**: Renders message bubbles with translated-first display (viewers see translation in their seat language, senders see original). Includes the ⓘ button that toggles the detailed inspection drawer.
- **`CulturalFootnotes.tsx`**: Renders AI-generated cultural context (humor explanations, idiom breakdowns, and etiquette warnings).
- **`ChatDraftPreview.tsx`**: Interactive AI draft review box allowing the sender to review the Groq translation, edit it, and send or cancel.
- **`RoomDetailsModal.tsx`**: Modal displaying the room code, full participant roster with active language seats, and iframe embed code.
- **`LanguageSeatModal.tsx`**: Confirmation modal offering the choice to apply a language change to the current room only or globally across all rooms.

#### 📊 `src/components/dashboard/`
- **`DashboardHeader.tsx`**: Top navigation bar with language seat preference selector, theme toggle, and user profile badge.
- **`CreateRoomCard.tsx`**: Omni-language room creation card.
- **`JoinRoomCard.tsx`**: Join room card accepting UUID codes or full invite URLs.
- **`RoomListCard.tsx`**: Live list of the user's joined rooms with one-click code copy and room enter buttons.

#### 🔐 `src/components/auth/`
- **`AuthScreen.tsx`**: Editorial split-screen displaying global learning artwork on the left and minimalist login/registration forms on the right.

#### 🪟 `src/components/common/`
- **`LogoutConfirmModal.tsx`**: Reusable modal for confirming logout or leaving chat rooms.

### 2. `src/app/` (Next.js Routes)
- **`page.tsx`**: Concise page orchestrator rendering `AuthScreen` when unauthenticated or the `Dashboard` cards when logged in.
- **`chat/[roomId]/page.tsx`**: Concise chat room orchestrator connecting WebSocket, room metadata, header bar, message list, and message composer.
- **`layout.tsx`**: Root layout configuring fonts and theme providers.
- **`globals.css`**: CSS variables for light/dark mode and Tailwind base styles.

### 3. `src/store/` (Zustand Global State)
- **`useAuthStore.ts`**: Persists authentication token and user profile in `localStorage`.
- **`useChatStore.ts`**: Manages WebSocket lifecycle, ping intervals, exponential backoff reconnection, incoming messages, and draft state.
- **`useThemeStore.ts`**: Manages light/dark theme preference with `localStorage` persistence.

### 4. `src/lib/` & `src/config.ts` (API, Languages & Config)
- **`config.ts`**: Exports `API_BASE_URL` (`http://localhost:8000/api/v1`) and `WS_BASE_URL` (`ws://localhost:8000`).
- **`lib/languages.ts`**: Supported languages configuration (`SUPPORTED_LANGUAGES` array and `LANGUAGE_MAP` lookup).
- **`lib/api.ts`**: HTTP client wrapper with automatic token injection, error normalization, and endpoint functions (`login`, `register`, `createRoom`, `joinRoom`, `getRoom`, `getMembers`, `setMyLanguage`).
