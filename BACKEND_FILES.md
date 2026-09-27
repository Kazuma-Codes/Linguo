# Backend — File-by-File Guide (`backend/`)

> Stack: Spring Boot 3.4.3 / Java 21 / PostgreSQL + Flyway / Redis (Lettuce) Pub/Sub + Cache / Raw WebSocket / JJWT 0.12.6 / Groq LLM / Google Sign-In.
> Package root: `com.mosaic`. Entry: `MosaicApplication.java`.
> Total hand-written files: ~68. Generated output (`target/`) summarized at bottom, not per-file.

```
backend/
├── pom.xml, Dockerfile, .env, .env.example, .dockerignore
└── src/main/
    ├── resources/application.yml, application-local.yml, db/migration/V1-V6
    └── java/com/mosaic/
        ├── MosaicApplication.java
        ├── config/ (8)
        ├── controller/ (5)
        ├── exception/ (1)
        ├── model/entity/ (6)
        ├── model/dto/ (19)
        ├── repository/ (6)
        ├── service/ (8)
        └── websocket/ (1)
```

Flow: `Controller (REST)` + `ChatWebSocketHandler (WS)` → `Service` → `Repository (JPA)` → `Entity` ; `DTO` for wire shapes ; `Config` for Security/JWT/Redis/WS/DataSource.

---

## 1. Root Build / Deploy / Env

### `backend/pom.xml`
**Purpose:** Maven build definition and dependency manifest.
**Key:** `com.mosaic:backend:1.0.0`, `java 21`; starters `web, websocket, data-jpa, data-redis, security, validation, actuator, micrometer-prometheus`; `postgresql, flyway-core, flyway-postgres, jjwt-api/impl/jackson 0.12.6, google-api-client 2.7.1`.
**Connects to:** Drives `Dockerfile` build (`mvn clean package`); provides all imports in `src/`.

### `backend/Dockerfile`
**Purpose:** 2-stage container build tuned for Render 512MB tier.
**Key:** Stage1 `maven:3.9.9-eclipse-temurin-21-alpine` + `dependency:go-offline`; Stage2 `eclipse-temurin:21-jre-alpine`, `JAVA_OPTS` container support + IPv4, `EXPOSE 8000`, `java -jar app.jar`.
**Connects to:** Packages `pom.xml + src/` → `target/backend-1.0.0.jar`.

### `backend/.env`
**Purpose:** Local secrets (not committed pattern, actual values for dev).
**Key:** Same keys as `.env.example` with real `GROQ_API_KEY, DATABASE_URL, REDIS_URL, SECRET_KEY, ALLOWED_ORIGINS, GOOGLE_CLIENT_ID`.
**Connects to:** Loaded by `MosaicApplication.loadDotEnv()`; overrides `application.yml` placeholders.

### `backend/.env.example`
**Purpose:** Template documenting required env vars.
**Key:** `GROQ_API_KEY/MODEL, SECRET_KEY (32+ chars), DATABASE_URL, REDIS_URL, POSTGRES_*, ALLOWED_ORIGINS, GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID`.
**Connects to:** Documents placeholders consumed by `application.yml` (`${...}`) and `AppProperties`.

### `backend/.dockerignore`
**Purpose:** Excludes files from Docker build context to keep image small/fast.
**Key:** Typically `target/, .git/, .idea/, .env`.
**Connects to:** Used by `Dockerfile` Stage1.

---

## 2. Bootstrap

### `src/main/java/com/mosaic/MosaicApplication.java`
**Purpose:** Application entrypoint and `.env` loader.
**Key:** `@SpringBootApplication @EnableAsync @ConfigurationPropertiesScan`; `main()`; `loadDotEnv()` reads `.env` or `backend/.env`, sets `System.setProperty` if not already in env.
**Connects to:** Bootstraps all `config/*`; enables async for `ChatService.processTranslationAsync`.

---

## 3. Config (`config/` — 8 files)

### `src/main/java/com/mosaic/config/AppProperties.java`
**Purpose:** Typed `app.*` binding + validation.
**Key:** `@Component @ConfigurationProperties(prefix=app)`; inner `Jwt(secret[NotBlank,Size>=32], expirationMinutes)`, `Groq(apiKey,apiKeys,apiKey1-3,baseUrl,model,backupModel, getResolvedApiKeys() dedup split)`, `Cors(allowedOrigins[NotEmpty])`, `Google(...)`.
**Connects to:** Injected into `SecurityConfig, JwtService, WebSocketConfig, TranslationService`; bound from `application.yml`.

### `src/main/java/com/mosaic/config/SecurityConfig.java`
**Purpose:** Stateless JWT security + CORS.
**Key:** `passwordEncoder() → BCrypt`; `securityFilterChain()` disable CSRF, stateless, permit `OPTIONS, /, /api/v1/auth/register|login, /health, /api/v1/health, /actuator/health/**, /api/v1/ws/**`, else authenticated, `addFilterBefore(jwtAuthFilter)`; `corsConfigurationSource()` from `AppProperties` + always `https://*.vercel.app, http://localhost:[*], http://127.0.0.1:[*]`.
**Connects to:** Uses `JwtAuthenticationFilter, AppProperties`; protects `Auth/User/Room/ContactController`.

### `src/main/java/com/mosaic/config/JwtService.java`
**Purpose:** Create and verify JWTs.
**Key:** `@Service`; `createAccessToken(email)` JJWT subject+expiry; `decodeToken(token) → Optional<subject>`; `getSigningKey() → HMAC-SHA from app.jwt.secret`.
**Connects to:** Used by `AuthService`, `JwtAuthenticationFilter`, `ChatWebSocketHandler(?token=)`.

### `src/main/java/com/mosaic/config/JwtAuthenticationFilter.java`
**Purpose:** Per-request REST authentication.
**Key:** `extends OncePerRequestFilter`; `doFilterInternal()` parses `Bearer`, `jwtService.decodeToken`, `userRepository.findByEmail` + `isActive` check → `UsernamePasswordAuthenticationToken(ROLE_USER)`.
**Connects to:** Wired in `SecurityConfig`; provides `@AuthenticationPrincipal User` to controllers.

### `src/main/java/com/mosaic/config/WebSocketConfig.java`
**Purpose:** WebSocket endpoint registration.
**Key:** `@EnableWebSocket implements WebSocketConfigurer`; `registerWebSocketHandlers() → /api/v1/ws/chat/{roomId}` with `allowedOriginPatterns` from `AppProperties`.
**Connects to:** Delegates to `ChatWebSocketHandler`.

### `src/main/java/com/mosaic/config/RedisConfig.java`
**Purpose:** Redis connection factory.
**Key:** `@Value spring.data.redis.url`; `redisConnectionFactory() → Lettuce` parses `redis://|rediss://` host/port/userinfo/password, SSL if `rediss`; `stringRedisTemplate()`; `redisMessageListenerContainer()`.
**Connects to:** Feeds `RedisPubSubService, TranslationCacheService`.

### `src/main/java/com/mosaic/config/DataSourceConfig.java`
**Purpose:** Postgres Hikari pool with Render-style URI support.
**Key:** `@Primary dataSource() → HikariDataSource`; converts `postgres://|postgresql://` → `jdbc:postgresql://` + URL-decodes userinfo; validates `jdbc:postgresql:` else throw; pool 10/2.
**Connects to:** Overrides Spring datasource for all `JpaRepository`.

### `src/main/java/com/mosaic/config/AsyncConfig.java`
**Purpose:** Virtual-thread executor for async translation.
**Key:** `@EnableAsync`; `@Bean taskExecutor() → SimpleAsyncTaskExecutor(mosaic-vt-) setVirtualThreads(true)`.
**Connects to:** Executes `ChatService.processTranslationAsync(@Async)`.

---

## 4. Entities (`model/entity/` — 6 files)

### `src/main/java/com/mosaic/model/entity/User.java` — table `users`
**Purpose:** User account + profile + default language.
**Key:** `UUID id, email(unique), hashedPassword, preferredLanguage=en, username, avatarUrl(TEXT), about, phone, isActive, createdAt`; relations `roomsCreated, participations, messagesSent`; manual `Builder`.
**Connects to:** Referenced by all entities/repos/services; authenticated principal.

### `src/main/java/com/mosaic/model/entity/ChatRoom.java` — table `chat_rooms`
**Purpose:** Group or direct room.
**Key:** `id, title, sourceLang=en, targetLang=es, maxMembers=50, roomType=group|direct, description(TEXT), emoji, avatarUrl(TEXT), isPrivate, creator(ManyToOne User), createdAt, participants, messages(@OrderBy createdAt)`; `Builder`.
**Connects to:** Parent of `ChatParticipant, Message`; managed by `RoomService`.

### `src/main/java/com/mosaic/model/entity/ChatParticipant.java` — table `chat_participants`
**Purpose:** Membership + per-seat language.
**Key:** `id, room(ManyToOne), user(ManyToOne), language, joinedAt`; `Builder`.
**Connects to:** Join of `User ↔ ChatRoom`; seat synced from `User.preferredLanguage` in `AuthService/RoomService/ChatService`.

### `src/main/java/com/mosaic/model/entity/Message.java` — table `messages`
**Purpose:** Chat message with draft/final lifecycle + multi-lang storage.
**Key:** `id, room, sender, originalText(TEXT), translatedText(TEXT), detectedLang, messageType=text|image|file, audioUrl, status=draft|final, culturalFootnotes(TEXT JSON), translations(TEXT JSON map lang→text), ttsUrl, replyToId, attachmentUrl/Name/Size, deliveryStatus=sent|delivered|read, createdAt`; `Builder`.
**Connects to:** Created in `ChatService`, read in `RoomService.getRoomMessages`, atomically updated via `MessageRepository.applyTranslationIfDraft`.

### `src/main/java/com/mosaic/model/entity/Contact.java` — table `contacts`
**Purpose:** Mutual friendship rows (two rows per friendship).
**Key:** `id, user(LAZY), contactUser(EAGER), createdAt`; unique `(user_id,contact_user_id)`; `Builder`.
**Connects to:** Managed by `ContactService` (both directions), listed with direct-room lookup.

### `src/main/java/com/mosaic/model/entity/ContactRequest.java` — table `contact_requests`
**Purpose:** Friend-request workflow.
**Key:** `id, fromUser(EAGER), toUser(LAZY), content(TEXT), status=pending|accepted|declined, createdAt`; unique `(from,to)`; `Builder`.
**Connects to:** `ContactService.send/accept/decline`.

---

## 5. Repositories (`repository/` — 6 files)

### `src/main/java/com/mosaic/repository/UserRepository.java`
**Purpose:** User DB access.
**Key:** `findByEmail, existsByEmail, searchUsers(query,excludeId) JPQL LOWER(email|username) LIKE %q% AND active`.
**Connects to:** `JwtAuthenticationFilter, AuthService, ChatWebSocketHandler`.

### `src/main/java/com/mosaic/repository/MessageRepository.java`
**Purpose:** Message history + atomic draft updates.
**Key:** `findAllByRoomIdOrderByCreatedAtAsc, findAllByRoomIdAndStatus..., findByIdAndRoomId, findStatusById, applyTranslationIfDraft(id,translated,detected,translations) WHERE status<>'final', applyFootnotesIfDraft, markRoomMessagesAsRead(roomId,viewerId,status)`.
**Connects to:** Core to `ChatService` draft pipeline + `RoomService.getRoomMessages`.

### `src/main/java/com/mosaic/repository/ChatRoomRepository.java`
**Purpose:** Room lookup.
**Key:** `findAllByParticipantUserId, findDirectRoomBetweenUsers(u1,u2), findAllByRoomTypeAndIsPrivateFalseOrderByCreatedAtDesc`.
**Connects to:** `RoomService, ContactService`.

### `src/main/java/com/mosaic/repository/ChatParticipantRepository.java`
**Purpose:** Membership + seat language.
**Key:** `findByRoomIdAndUserId, findAllByRoomId(@EntityGraph user), findAllByUserId, updateLanguageByUserId, existsByRoomIdAndUserId, countByRoomId`.
**Connects to:** Membership checks in `RoomService, ChatService, ChatWebSocketHandler`; language sync.

### `src/main/java/com/mosaic/repository/ContactRepository.java`
**Purpose:** Friendship rows.
**Key:** `findAllByUserIdOrderByCreatedAtDesc, findByUserIdAndContactUserId, exists..., deleteByUserIdAndContactUserId`.
**Connects to:** `ContactService`.

### `src/main/java/com/mosaic/repository/ContactRequestRepository.java`
**Purpose:** Friend-request rows.
**Key:** `findAllByToUserIdAndStatusOrderByCreatedAtDesc, findByFromUserIdAndToUserId`.
**Connects to:** `ContactService`.

---

## 6. DTOs (`model/dto/` — 19 files)

### `src/main/java/com/mosaic/model/dto/UserResponse.java`
**Purpose:** Outbound user shape.
**Key:** `id,email,username,avatar_url,about,phone,preferred_language` + `Builder`.
**Connects to:** Returned by `AuthService.toUserResponse`, `Auth/UserController`.

### `src/main/java/com/mosaic/model/dto/UserCreateRequest.java`
**Purpose:** Register input.
**Key:** `email(@Email NotBlank), password(NotBlank Size>=8), preferred_language`.
**Connects to:** `AuthController.register → AuthService.register`.

### `src/main/java/com/mosaic/model/dto/LoginRequest.java`
**Purpose:** JSON login input.
**Key:** `email(@JsonAlias username), password`.
**Connects to:** `AuthController.loginJson`.

### `src/main/java/com/mosaic/model/dto/GoogleLoginRequest.java`
**Purpose:** Google Sign-In input.
**Key:** `id_token`.
**Connects to:** `AuthController.loginGoogle → AuthService.googleLogin`.

### `src/main/java/com/mosaic/model/dto/TokenResponse.java`
**Purpose:** Auth token output.
**Key:** `access_token, token_type=bearer` + `Builder`.
**Connects to:** Returned by login/register/google.

### `src/main/java/com/mosaic/model/dto/UpdateProfileRequest.java`
**Purpose:** Profile edit input.
**Key:** `username, avatar_url, about, phone`.
**Connects to:** `UserController.updateProfile`.

### `src/main/java/com/mosaic/model/dto/UpdatePreferredLanguageRequest.java`
**Purpose:** Global default language change (single source of truth).
**Key:** `preferred_language(NotBlank)`.
**Connects to:** `AuthController.updatePreferredLanguage` (syncs seats).

### `src/main/java/com/mosaic/model/dto/RoomCreateRequest.java`
**Purpose:** Create room input.
**Key:** `title, source_lang, target_lang, room_type, description, emoji, avatar_url, is_private`.
**Connects to:** `RoomController.createRoom`.

### `src/main/java/com/mosaic/model/dto/RoomUpdateRequest.java`
**Purpose:** Creator-only patch.
**Key:** `title,description,emoji,avatarUrl`.
**Connects to:** `RoomController.updateRoom`.

### `src/main/java/com/mosaic/model/dto/RoomResponse.java`
**Purpose:** List view for dashboard.
**Key:** `id,title,source_lang,target_lang,room_type,description,emoji,avatar_url,is_private,members_count,last_message,last_message_at,unread_count` + `Builder`. Direct rooms rewrite title/avatar to other user.
**Connects to:** Produced by `RoomService.toRoomResponse`.

### `src/main/java/com/mosaic/model/dto/RoomDetailResponse.java` extends `RoomResponse`
**Purpose:** Detail view.
**Key:** Adds `creator_id,my_language,members[],distinct_langs[]` + `DetailBuilder`.
**Connects to:** Produced by `RoomService.getRoom/updateRoom/setMyLanguage`.

### `src/main/java/com/mosaic/model/dto/MessageResponse.java`
**Purpose:** History view.
**Key:** `id,room_id,sender_*,original_text,translated_text,detected_lang,translations(Map),cultural_footnotes(Object),message_type,reply_to_id,attachment_*,delivery_status,status,is_me,created_at` + `Builder`.
**Connects to:** Produced by `RoomService.getRoomMessages` (parses JSON TEXT columns).

### `src/main/java/com/mosaic/model/dto/MemberResponse.java`
**Purpose:** Roster entry.
**Key:** `user_id,email,username,avatar_url,language,joined_at` + `Builder`.
**Connects to:** Produced by `RoomService.getRoom/Members`.

### `src/main/java/com/mosaic/model/dto/WsIncomingMessage.java`
**Purpose:** Client→server WS envelope.
**Key:** `type, text(10k), id, edited_text, reply_to_id, attachment_url/name/size, message_type, is_typing, message_id`.
**Connects to:** Parsed in `ChatWebSocketHandler.handleTextMessage`, validated by `validateIncoming()`.

### `src/main/java/com/mosaic/model/dto/WsOutgoingMessage.java`
**Purpose:** Server→client WS envelope (always include full shape).
**Key:** `type(draft_ready|message_finalized|typing|read_ack|message_deleted|error), id, sender_*, text, original/translated/detected, culturalFootnotes(Object), translations(Map), status, tts/audio, reply/attachment, delivery_status, message_type, is_typing, created_at(Long epoch)` + `Builder`.
**Connects to:** Published via `RedisPubSubService.publish`, broadcast to room sessions.

### `src/main/java/com/mosaic/model/dto/CulturalFootnotes.java`
**Purpose:** Structured cultural notes.
**Key:** `humor_explanation,idiom_breakdown,etiquette_warning` + `Builder`.
**Connects to:** Produced by `TranslationService.getCulturalFootnotes` from Groq JSON; embedded in `Message.culturalFootnotes` + WS/REST.

### `src/main/java/com/mosaic/model/dto/ContactResponse.java`
**Purpose:** Contact list entry with DM shortcut.
**Key:** `id,user_id,email,username,avatar_url,about,phone,preferred_language,direct_room_id,created_at`.
**Connects to:** Produced by `ContactService.list/add` (with direct-room lookup).

### `src/main/java/com/mosaic/model/dto/ContactRequestDto.java`
**Purpose:** Pending request view.
**Key:** `id,from_user_id/email/username/avatar_url,content,status,created_at`.
**Connects to:** Produced by `ContactService.listPending/send`.

### `src/main/java/com/mosaic/model/dto/SetLanguageRequest.java`
**Purpose:** Deprecated per-room seat change (kept for compat).
**Key:** `language(NotBlank)`.
**Connects to:** `RoomController.setMyLanguage`.

---

## 7. Services (`service/` — 8 files)

### `src/main/java/com/mosaic/service/AuthService.java`
**Purpose:** Auth + profile + user search.
**Key:** `register(), login(email,password)→TokenResponse, googleLogin(idToken)→verify via GoogleIdTokenVerifier(audiences web+android), updatePreferredLanguage()→validate LANG_MAP + participantRepository.updateLanguageByUserId, updateProfile(), searchUsers(), toUserResponse()`.
**Connects to:** Uses `UserRepository, PasswordEncoder, JwtService, ChatParticipantRepository, TranslationService.LANG_MAP`; called by `AuthController, UserController`.

### `src/main/java/com/mosaic/service/RoomService.java`
**Purpose:** Room lifecycle + reads.
**Key:** `norm(), assignSeat(room,user)→pref else source, createRoom(), getOrCreateDirectRoom(), listRooms(), listDiscoverableRooms(), joinRoom(max 50), getRoom(auto-create/heal seat, direct title/avatar swap, distinctLangs), getRoomMessages(mark read, parse translations/footnotes JSON), getRoomMembers(), updateRoom(creator-only), setMyLanguage(deprecated), toRoomResponse()`.
**Connects to:** Uses all room repos + `TranslationService, ObjectMapper`; called by `RoomController, ContactService.acceptRequest`.

### `src/main/java/com/mosaic/service/ChatService.java` (576 lines, core)
**Purpose:** WS message pipeline Draft→Confirm.
**Key:** `handleSendDraft(roomId,incoming,sender)→save draft + publish draft_ready + afterCommit processTranslationAsync; finalizeUntranslated() for emoji/attachment-only (no Groq); handleDirectSend→routes to draft; handleTyping/read_ack/delete; translateWithCache(); processTranslationAsync(@Async @Transactional)→detect lang, resolve actualSource/actualTarget from seats+preferred, cached primary + virtual-thread fan-out per listener lang, applyTranslationIfDraft atomically, publish draft_ready + footnotes, fallback on fail; handleConfirmDraft()→final + message_finalized`.
**Connects to:** Uses `Message/Room/Participant repos, TranslationService/CacheService, DetectionService, RedisPubSubService, ObjectMapper`; invoked by `ChatWebSocketHandler`.

### `src/main/java/com/mosaic/service/ContactService.java`
**Purpose:** Mutual contacts + requests + direct-room ensure.
**Key:** `listContacts(with directRoomId), addContact(mutual both directions), removeContact(symmetric delete), listPendingRequests, sendRequest(upsert pending), acceptRequest(mutual contacts + roomService.getOrCreateDirectRoom), declineRequest`.
**Connects to:** Uses `Contact/Request/User/Room repos + RoomService`; called by `ContactController`.

### `src/main/java/com/mosaic/service/TranslationService.java`
**Purpose:** Groq LLM translation + footnotes, 12 langs.
**Key:** `LANG_MAP(en,hi,es,fr,ja,ru,ar,zh,de,it,pt,ko), LATIN_SCRIPT, NAME_TO_CODE, normLang(), warmUp(@EventListener ApplicationReady virtual thread hi→es), executeGroqPrompt(prompt)→round-robin keys + primary/backup model failover via RestClient(HttpClient HTTP/2), translateText(native vs native+romanized prompts), getCulturalFootnotes()`.
**Connects to:** Uses `AppProperties, RestClient, ObjectMapper`; used by `RoomService, ChatService, AuthService`.

### `src/main/java/com/mosaic/service/TranslationCacheService.java`
**Purpose:** Redis 30-day translation cache.
**Key:** `get(text,src,dst), put(...skip [translation unavailable]), buildCacheKey(tr:sha256(lower trim):src:dst), sha256()`.
**Connects to:** Uses `StringRedisTemplate`; used by `ChatService.translateWithCache`.

### `src/main/java/com/mosaic/service/LanguageDetectionService.java`
**Purpose:** Offline heuristic detection (zero-cost).
**Key:** `detectLanguage()→Unicode block thresholds (hi,ru,ar,ko,ja,zh) else Latin keyword scoring (es,fr,de,it,pt,hi,en default)`.
**Connects to:** Used by `ChatService.processTranslationAsync` to pick `actualSource`.

### `src/main/java/com/mosaic/service/RedisPubSubService.java`
**Purpose:** Multi-instance WS fan-out.
**Key:** `roomSessions(Map room→sessions), roomListeners, addSession/removeSession, broadcastLocal(synchronized send), publish(roomId,WsOutgoingMessage→json to chat:roomId), ensure/removeListener(ChannelTopic)`.
**Connects to:** Uses `StringRedisTemplate, RedisMessageListenerContainer, ObjectMapper`; used by `ChatService` + `ChatWebSocketHandler`.

---

## 8. Controllers (`controller/` — 5 files)

### `src/main/java/com/mosaic/controller/AuthController.java` — `/api/v1/auth`
**Purpose:** Auth routes.
**Key:** `register, loginForm(form-urlencoded username|email+password), loginJson(JSON), google(id_token), me, preferred-language(PATCH)`.
**Connects to:** Delegates to `AuthService`; public except `me/language` (see `SecurityConfig`).

### `src/main/java/com/mosaic/controller/UserController.java` — `/api/v1/users`
**Purpose:** User search + profile.
**Key:** `search?q, profile(PATCH), {userId}(GET)`.
**Connects to:** Uses `AuthService + UserRepository`.

### `src/main/java/com/mosaic/controller/RoomController.java` — `/api/v1`
**Purpose:** Room lifecycle.
**Key:** `POST /rooms, PATCH /rooms/{id}, POST /rooms/direct/{userId}, GET /rooms|/discover|/{id}|/{id}/messages|/{id}/members, POST /{id}/join, POST /{id}/set-language(deprecated)`.
**Connects to:** Delegates to `RoomService`.

### `src/main/java/com/mosaic/controller/ContactController.java` — `/api/v1/contacts`
**Purpose:** Contacts + requests.
**Key:** `GET /, POST /{userId}, DELETE /{userId}, GET /requests, POST /requests/{targetUserId}(content), POST /requests/{id}/accept|decline`.
**Connects to:** Delegates to `ContactService`.

### `src/main/java/com/mosaic/controller/HealthController.java`
**Purpose:** Probes.
**Key:** `GET /→{service,status}, /health, /api/v1/health→{status:ok}` (public).
**Connects to:** None; used by Render/Actuator.

---

## 9. WebSocket + Exception

### `src/main/java/com/mosaic/websocket/ChatWebSocketHandler.java` — `extends TextWebSocketHandler`
**Purpose:** Authenticated per-room WS gateway.
**Key:** `afterConnectionEstablished()→extract roomId from /api/v1/ws/chat/{roomId} + ?token=, JwtService.decode, user active + participant check, addSession; handleTextMessage()→validateIncoming + switch ping|typing|read_ack|delete_message|send_draft|confirm_draft|send_message|direct_send → ChatService; afterConnectionClosed/removeSession, handleTransportError, sendError(type:error)`.
**Connects to:** Uses `JwtService, User/Room/Participant repos, ChatService, RedisPubSubService`; registered by `WebSocketConfig`.

### `src/main/java/com/mosaic/exception/GlobalExceptionHandler.java`
**Purpose:** Uniform error JSON.
**Key:** `@RestControllerAdvice`; handlers `MethodArgumentNotValid, ConstraintViolation, HttpMessageNotReadable|TypeMismatch, ResponseStatusException, DataIntegrityViolation→409, Exception→500`; record `ErrorResponse(timestamp,status,error,message,path,fieldErrors)`.
**Connects to:** Global for all controllers.

---

## 10. Resources + Migrations

### `src/main/resources/application.yml`
**Purpose:** Production config, single source for Spring + `app.*`.
**Key:** `server.port=${PORT:8000}`, virtual threads enabled, `datasource.url=${SPRING_DATASOURCE_URL:${DATABASE_URL}}` Hikari 10/2, `jpa.ddl-auto=validate`, `data.redis.url=${REDIS_URL}`, `flyway.enabled=true baseline-on-migrate`, `management.health/probes`, `app.jwt.secret/expiration(10080m), app.google.*, app.groq.api-key/api-key1-3/base-url/model/backup-model, app.cors.allowed-origins`.
**Connects to:** Bound by `AppProperties`, `RedisConfig`, `DataSourceConfig`, `SecurityConfig`, `AuthService(@Value google)`.

### `src/main/resources/application-local.yml`
**Purpose:** Local dev override (Flyway off, update schema).
**Key:** `jdbc:postgresql://localhost:5432/translate_app`, `redis://localhost:6379`, `ddl-auto:update`, `flyway.enabled:false`, default local `SECRET_KEY`, `GROQ_API_KEY`.
**Connects to:** Alternative profile to `application.yml`.

### `src/main/resources/db/migration/V1__initial_schema.sql`
**Purpose:** Base `users, chat_rooms, chat_participants(uq room+user), messages(draft/final)` + indexes. Mirrors core entities.
**Connects to:** Applied by Flyway on boot (`application.yml`).

### `src/main/resources/db/migration/V2__add_message_translations.sql`
**Purpose:** `ALTER messages ADD translations TEXT` — per-lang map.
**Key:** Backs `Message.translations`, `ChatService` fan-out.
**Connects to:** `MessageRepository`, `MessageResponse`.

### `src/main/resources/db/migration/V3__nlangs.sql`
**Purpose:** `idx_participants_room` + `chat_rooms.max_members DEFAULT 50`.
**Key:** Enforced in `RoomService.joinRoom`.
**Connects to:** `ChatParticipantRepository`, `ChatRoom`.

### `src/main/resources/db/migration/V4__orbit_halo_enhancements.sql`
**Purpose:** Profile (`username/avatar/about/phone`), room (`room_type/description/emoji/avatar/is_private`), message (`reply_to/attachment_*/delivery_status`), new `contacts(uq)`, `contact_requests(uq)`.
**Key:** Backs `Contact/ContactRequest` entities + `ContactService`.
**Connects to:** `User, ChatRoom, Message, Contact*`.

### `src/main/resources/db/migration/V5__avatar_url_text.sql`
**Purpose:** `avatar_url → TEXT` on users/rooms for large/base64 URLs.
**Connects to:** `User.avatarUrl, ChatRoom.avatarUrl, EditAvatarModal`.

### `src/main/resources/db/migration/V6__mutual_contacts_backfill.sql`
**Purpose:** Backfills reverse `contacts` rows (`pgcrypto gen_random_uuid`) to make friendship mutual.
**Key:** Matches `ContactService` mutual logic.
**Connects to:** `contacts` table.

---

## 11. Generated / Excluded (folder-level summary)

### `backend/target/`
**Purpose:** Maven build output — compiled `.class` files (`com/mosaic/...`), copied `application.yml`, `db/migration/*.sql`, `maven-status/*.lst`. Regenerated by `mvn clean package`.
**Key:** `classes/com/mosaic/.../*.class` mirror every `src/*.java`; `classes/application.yml`, `application-local.yml`.
**Connects to:** Built from `pom.xml + src/`; packaged into `app.jar` by `Dockerfile`. Do not edit directly.

### `backend/.idea/, backend/.vscode/` (if present)
**Purpose:** IDE settings only, no runtime effect.
