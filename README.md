<div align="center">

# 🌐 Mosaic (Linguo)
### Realtime Omnilingual AI Chat Engine with Cultural Footnotes & Virtual Thread Fan-Out

[![Java 21](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot 3.4](https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_/_Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Redis-Upstash_Cloud-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Groq Cloud](https://img.shields.io/badge/Groq-LPU_Inference-F55036?style=for-the-badge&logo=fastapi&logoColor=white)](https://groq.com/)

<p align="center">
  <b>Communicate across languages seamlessly.</b><br/>
  Mosaic breaks language barriers with an <i>omni-language</i> room architecture, an interactive <i>Send Draft → AI Translate → Confirm</i> flow, zero-latency <i>Redis SHA-256 caching</i>, and <i>cultural footnote analysis</i> (humor explanations, idioms, etiquette) powered by Groq LPUs.
</p>

---

</div>

## 📑 Table of Contents
- [Key Innovations & Features](#-key-innovations--features)
- [System Architecture](#-system-architecture)
  - [High-Level Distributed Architecture](#1-high-level-distributed-architecture)
  - [Realtime Many-to-Many Translation Lifecycle](#2-realtime-many-to-many-translation-lifecycle)
  - [Database Entity Relationship Diagram](#3-database-entity-relationship-diagram)
- [WebSocket Protocol Specification](#-websocket-protocol-specification)
- [Tech Stack & Engineering Decisions](#-tech-stack--engineering-decisions)
- [Repository Structure](#-repository-structure)
- [Zero-Docker Cloud Quickstart](#-zero-docker-cloud-quickstart)
  - [1. Provision Cloud Infrastructure (2 minutes)](#1-provision-cloud-infrastructure-free)
  - [2. Backend Configuration](#2-backend-configuration)
  - [3. Run the Backend](#3-run-the-backend)
  - [4. Frontend Configuration & Launch](#4-frontend-configuration--launch)
- [Environment Variables Reference](#-environment-variables-reference)
- [License](#-license)

---

## 🌟 Key Innovations & Features

### 1. 🔄 Omni-Language Room Architecture
Unlike traditional chat rooms that enforce static source/target language pairs, Mosaic chat rooms support **Many-to-Many multilingual conversations**:
- Each participant chooses an independent **Language Seat** upon entering (or inherits their global account preference).
- When a user sends a message, Mosaic dynamically identifies all distinct languages across current room participants and translates the message in parallel.
- A single message can be read simultaneously in Japanese, Spanish, German, Hindi, French, and English according to each participant's preferred seat.

### 2. ✍️ "Send Draft → AI Translate → Confirm Draft" Flow
Never send an embarrassing mistranslation:
1. Sender enters text in their native language and clicks **Draft**.
2. Mosaic's backend performs the translations in the background and delivers a private `draft_ready` preview back to the sender.
3. The sender inspects the AI translations and cultural footnotes, makes manual adjustments if desired, and clicks **Confirm & Send** to broadcast to the room.

### 3. 🧠 Cultural Footnotes Engine
Literal translation often destroys nuances, sarcasm, and idioms. Mosaic's Groq pipeline outputs structured JSON containing:
- **Humor & Sarcasm Context**: Explains comedic nuance that would otherwise fall flat.
- **Idiom Breakdowns**: Deconstructs localized expressions (e.g., *"Break a leg"* → theatrical encouragement, not physical harm).
- **Etiquette & Politeness Warnings**: Flags potential honorific or politeness clashes (critical for Japanese, Korean, and formal European languages).

### 4. 👁️ Translated-First Bubble UX with Detailed Inspection Drawer (ⓘ)
- **Recipients** see incoming messages rendered directly in their chosen seat language with zero visual clutter.
- A subtle info button (**ⓘ**) allows readers to slide open an inspection drawer showing:
  - The original transcript and detected language.
  - Granular cultural footnotes, idiom explanations, and humor notes.
- **Senders** see their original composed message with quick-look pills displaying outbound translations.

### 5. ⚡ Sub-Millisecond Redis SHA-256 Translation Cache
To prevent redundant LLM inference costs and avoid rate limits:
- Backend hashes incoming text with SHA-256 and computes cache keys: `tr:{sha256}:{sourceLang}:{targetLang}`.
- Cache hits bypass the Groq API entirely, returning instant cached translations with a 30-day TTL.
- Groq is only invoked for fresh, uncached phrases.

---

## 🏛️ System Architecture

### 1. High-Level Distributed Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Next.js 14)"]
        UI["Web App (Tailwind CSS + Zustand)"]
        WSClient["WebSocket Client (Auto-Reconnect + Heartbeat)"]
    end

    subgraph GatewayLayer ["Application Gateway & API (Spring Boot 3.4)"]
        WSHandler["ChatWebSocketHandler (Session Management)"]
        RESTCtrl["REST Controllers (Auth / Rooms / Members)"]
        Security["Spring Security (Stateless JWT + BCrypt)"]
    end

    subgraph ServiceLayer ["Core Business & Concurrency Engine"]
        ChatSvc["ChatService (Orchestrator)"]
        VTExec["Java 21 Virtual Threads (Loom Executor)"]
        CacheSvc["TranslationCacheService (Redis SHA-256)"]
        TransSvc["TranslationService (Groq Client & Failover)"]
        PubSub["RedisPubSubService (Cross-Node Event Bus)"]
    end

    subgraph DataLayer ["State & External Services"]
        PG[("PostgreSQL Database (Neon / Supabase)")]
        RedisDB[("Redis Cache & Pub/Sub (Upstash)")]
        GroqAPI["Groq Cloud API (Multi-Key LPU Inference)"]
    end

    UI --> RESTCtrl
    WSClient <-->|WebSocket wss://| WSHandler
    RESTCtrl --> Security
    WSHandler --> ChatSvc
    ChatSvc --> VTExec
    VTExec --> CacheSvc
    CacheSvc -->|Cache Hit| RedisDB
    CacheSvc -->|Cache Miss| TransSvc
    TransSvc -->|Inference| GroqAPI
    ChatSvc -->|Persist History| PG
    ChatSvc -->|Publish Event| PubSub
    PubSub --> RedisDB
    RedisDB -->|Broadcast| WSHandler
```

---

### 2. Realtime Many-to-Many Translation Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Alice (Sender, en)
    participant WS as WebSocket Gateway
    participant CS as ChatService
    participant DB as PostgreSQL
    participant Cache as Redis Cache
    participant Groq as Groq AI Engine
    actor Bob as Bob (Receiver, ja)
    actor Carlos as Carlos (Receiver, es)

    Alice->>WS: send_draft {"text": "Break a leg tonight!"}
    WS->>CS: handleDraftMessage()
    CS->>DB: INSERT draft message (status: DRAFT)
    Note over CS,Groq: Transaction commits -> Virtual Thread fan-out starts
    
    par Translation for Japanese (ja)
        CS->>Cache: GET tr:{sha256}:en:ja
        alt Cache Hit
            Cache-->>CS: Cached translation & footnotes
        else Cache Miss
            CS->>Groq: Prompt: Translate en->ja + Footnotes (JSON)
            Groq-->>CS: Japanese text + cultural footnote
            CS->>Cache: SETEX tr:{sha256}:en:ja (TTL: 30d)
        end
    and Translation for Spanish (es)
        CS->>Cache: GET tr:{sha256}:en:es
        alt Cache Hit
            Cache-->>CS: Cached translation & footnotes
        else Cache Miss
            CS->>Groq: Prompt: Translate en->es + Footnotes (JSON)
            Groq-->>CS: Spanish text + cultural footnote
            CS->>Cache: SETEX tr:{sha256}:en:es (TTL: 30d)
        end
    end

    CS->>DB: UPDATE message with translations & footnotes
    CS->>WS: notify draft_ready
    WS-->>Alice: draft_ready {id, translations, footnotes}

    Note over Alice: Alice reviews AI translation & cultural notes
    Alice->>WS: confirm_draft {message_id, optional_edited_text}
    WS->>CS: finalizeMessage()
    CS->>DB: UPDATE message (status: SENT)
    
    par Realtime Broadcast
        CS-->>Alice: message_finalized (Sender sees original: "Break a leg tonight!")
        CS-->>Bob: message_finalized (Bob sees ja: "今夜は頑張って！" + ⓘ Footnote)
        CS-->>Carlos: message_finalized (Carlos sees es: "¡Mucha mierda!" + ⓘ Footnote)
    end
```

---

### 3. Database Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ chat_participants : "joins"
    users ||--o{ messages : "authors"
    chat_rooms ||--o{ chat_participants : "contains"
    chat_rooms ||--o{ messages : "hosts"

    users {
        uuid id PK
        string email UK
        string password_hash
        string preferred_language
        boolean is_active
        timestamp created_at
    }

    chat_rooms {
        uuid id PK
        string title
        string source_lang
        string target_lang
        int max_members
        uuid creator_id FK
        timestamp created_at
    }

    chat_participants {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        string language
        timestamp joined_at
    }

    messages {
        uuid id PK
        uuid room_id FK
        uuid sender_id FK
        text original_text
        text translated_text
        text translations
        string status
        jsonb cultural_footnotes
        timestamp created_at
    }
```

---

## 📡 WebSocket Protocol Specification

WebSocket connections are initiated at `/api/v1/ws/chat/{roomId}?token={jwt}`. All messages adhere to standardized JSON envelopes:

### Client $\to$ Server Frames

| Event Type | Payload Fields | Purpose |
| :--- | :--- | :--- |
| `send_draft` | `room_id`, `text`, `target_lang` (optional) | Initiates draft translation flow. |
| `confirm_draft` | `room_id`, `message_id`, `edited_text` (optional) | Confirms and finalizes draft for room broadcast. |
| `ping` | _None_ | Heartbeat frame to maintain keep-alive. |

#### Example: `send_draft`
```json
{
  "type": "send_draft",
  "room_id": "a5d8b74c-4e89-40e8-963a-2a1f0a5ef302",
  "text": "Could we table this discussion until Monday morning?",
  "target_lang": "de"
}
```

---

### Server $\to$ Client Frames

| Event Type | Payload Content | Purpose |
| :--- | :--- | :--- |
| `draft_ready` | `id`, `original_text`, `translations` map, `cultural_footnotes` | Private response to sender with translated previews. |
| `message_finalized` | `id`, `sender_id`, `original_text`, `translations` map, `cultural_footnotes`, `created_at` | Broadcast to all room members upon confirmation. |
| `pong` | _None_ | Server heartbeat response. |
| `error` | `error` (description string) | Error feedback (e.g. rate limit, validation failure). |

#### Example: `message_finalized`
```json
{
  "type": "message_finalized",
  "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "room_id": "a5d8b74c-4e89-40e8-963a-2a1f0a5ef302",
  "sender_id": "99b0c442-98fc-1c14-9afb-4c8996fb9111",
  "original_text": "Could we table this discussion until Monday morning?",
  "translations": {
    "es": "¿Podríamos posponer esta discusión hasta el lunes por la mañana?",
    "de": "Könnten wir diese Diskussion auf Montagmorgen verschieben?",
    "ja": "この件については月曜日の朝まで持ち越してもよろしいでしょうか？"
  },
  "cultural_footnotes": {
    "humor_explanation": null,
    "idiom_breakdown": "In US English, 'to table' means to postpone, whereas in British English it can mean to bring forward for immediate discussion.",
    "etiquette_warning": "Polite business phrasing; suitable for professional contexts."
  },
  "created_at": "2026-09-20T14:30:00Z"
}
```

---

## 🛠️ Tech Stack & Engineering Decisions

| Layer | Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Java 21 (OpenJDK)** | Leverages **Project Loom Virtual Threads** (`Executors.newVirtualThreadPerTaskExecutor()`) to handle concurrent multi-language LLM fan-outs without thread starvation or memory exhaustion. |
| **Backend Framework** | **Spring Boot 3.4.3** | High-performance enterprise backbone with native virtual thread dispatching, declarative transaction management, Flyway schema migrations, and Spring WebSocket. |
| **Concurrency Control** | `afterCommit` Hook | Uses Spring's `TransactionSynchronizationManager.registerSynchronization(afterCommit)` to guarantee that database records are committed before dispatching async translation tasks, preventing phantom read race conditions. |
| **Database** | **PostgreSQL** | Relational integrity with foreign key constraints, `idx_participants_room` indexes for fast fan-out queries, and native JSON storage for dynamic translations and footnotes. |
| **Cache & Pub/Sub** | **Redis (Lettuce Client)** | Multi-purpose engine: provides cross-node Redis Pub/Sub for horizontal scaling and a 30-day SHA-256 translation cache (`tr:{sha256}:{src}:{dst}`). |
| **AI Inference** | **Groq Cloud API** | Ultra-low latency LPU inference using `openai/gpt-oss-20b` (with automatic fallback to `openai/gpt-oss-120b`). Configured with multi-key round-robin rotation and JSON mode enforcement. |
| **Frontend** | **Next.js 14 App Router** | Server-side routing, React 18 concurrent features, TypeScript static typing, and high-speed modular component rendering. |
| **State Management** | **Zustand** | Lightweight, decoupled global store for authentication, active room session, message streams, drafts, and theme preferences. |
| **Styling** | **Tailwind CSS** | Responsive dark/light theme support with design tokens, glassmorphic drawers, and responsive layouts. |

---

## 📂 Repository Structure

```text
cross-language/
├── ARCHITECTURE.md                  # Comprehensive architectural deep-dive & file map
├── README.md                        # Master project documentation
│
├── backend/                         # Spring Boot 3.4 + Java 21 Backend
│   ├── pom.xml                      # Maven dependencies & build configuration
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml      # Base Spring Boot configuration
│       │   ├── application-local.yml# Local development overrides
│       │   └── db/migration/        # Flyway SQL migrations (V1, V2, V3)
│       └── java/com/mosaic/
│           ├── config/              # Security, Async, WebSocket, Redis, & App configs
│           ├── controller/          # REST API endpoints (Auth, Rooms, Health)
│           ├── exception/           # RFC-compliant Global Exception Handler
│           ├── model/
│           │   ├── dto/             # Request/response JSON transfer models
│           │   └── entity/          # JPA entities (User, ChatRoom, Participant, Message)
│           ├── repository/          # Spring Data JPA repositories with @EntityGraph
│           ├── service/             # ChatService, TranslationService, CacheService, etc.
│           └── websocket/           # ChatWebSocketHandler & Session Registry
│
└── frontend/                        # Next.js 14 (App Router) + TypeScript Frontend
    ├── package.json                 # Dependencies & scripts
    ├── tailwind.config.ts           # Styling configuration
    └── src/
        ├── app/
        │   ├── page.tsx             # Home dashboard & authentication gateway
        │   ├── chat/[roomId]/page.tsx# Realtime chat room orchestrator
        │   └── layout.tsx           # Root HTML layout & font definitions
        ├── components/
        │   ├── auth/                # AuthScreen (Split layout & validation)
        │   ├── chat/                # ChatMessageBubble, CulturalFootnotes, DraftPreview, etc.
        │   ├── dashboard/           # DashboardHeader, CreateRoomCard, JoinRoomCard, etc.
        │   └── common/              # Modals (LogoutConfirmModal, SeatModal, etc.)
        ├── store/                   # Zustand stores (useAuthStore, useChatStore, useThemeStore)
        └── lib/                     # API client (lib/api.ts) & Language definitions (lib/languages.ts)
```

---

## 🚀 Zero-Docker Cloud Quickstart

You can run Mosaic completely locally in under 5 minutes without needing Docker or local database engines.

### 1. Provision Cloud Infrastructure (Free)
1. **Groq API Key**: Sign up at [console.groq.com](https://console.groq.com) and create an API key.
2. **PostgreSQL Database**: Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and copy the connection string.
3. **Redis Database**: Create a free serverless Redis database on [Upstash.com](https://upstash.com) and copy the `redis://...` URL.

---

### 2. Backend Configuration

Create or update `backend/.env` (or supply environment variables):

```env
# Groq API Keys (comma-separated for automatic round-robin rotation)
GROQ_API_KEY=gsk_your_groq_api_key_here

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@your-neon-host.tech/neondb?sslmode=require

# Redis Connection URL
REDIS_URL=redis://default:your_upstash_password@your-upstash-host.upstash.io:6379

# JWT Signing Key (must be at least 32 characters)
SECRET_KEY=supersecretkey_must_be_at_least_32_characters_long!

# Allowed Frontend Origins
ALLOWED_ORIGINS=http://localhost:3000
```

---

### 3. Run the Backend

Make sure you have **JDK 21** and **Maven** installed.

```bash
cd backend
mvn clean spring-boot:run
```

- Backend will start on port **`8000`**.
- Flyway automatically applies all migrations (`V1__initial_schema.sql`, `V2__add_message_translations.sql`, `V3__nlangs.sql`) to your PostgreSQL database.
- Health check is live at: `http://localhost:8000/api/v1/health`

---

### 4. Frontend Configuration & Launch

Make sure you have **Node.js 18+** installed.

```bash
cd frontend
npm install
npm run dev
```

- Open **`http://localhost:3000`** in your browser!
- Register an account, create a chat room, invite a friend (or open an incognito window with a different language seat), and experience realtime AI translation in action.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env` or OS Environment)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `GROQ_API_KEY` | **Yes** | — | Comma-delimited list of Groq Cloud API keys for round-robin rotation. |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (supports Neon SSL: `?sslmode=require`). |
| `REDIS_URL` | **Yes** | — | Redis connection URL (`redis://:password@host:port`). |
| `SECRET_KEY` | **Yes** | — | HMAC-SHA256 secret for signing JWT tokens (min. 32 chars). |
| `PORT` | No | `8000` | Backend server port. |
| `ALLOWED_ORIGINS`| No | `http://localhost:3000`| Allowed CORS origins for REST and WebSockets. |
| `DATABASE_USERNAME` | No | Extracted from URL | DB user (if not embedded in `DATABASE_URL`). |
| `DATABASE_PASSWORD` | No | Extracted from URL | DB password (if not embedded in `DATABASE_URL`). |

### Frontend (`frontend/.env.local` - Optional)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000/api/v1` | Backend REST API base URL. |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:8000` | Backend WebSocket base URL. |

---

## 🔒 Production & Security Highlights

- **Stateless JWT Security**: Passwords are encrypted using BCrypt (`strength=12`). Authentication uses signed stateless JWT tokens passed via Authorization headers for REST and query validation for WebSocket handshakes.
- **Race Condition Immunity**: Database writes are strictly isolated; multi-language async translation triggers only run in post-commit transaction synchronization hooks.
- **Virtual Thread Scalability**: Groq network I/O calls do not block OS carrier threads; tens of thousands of concurrent fan-out translation tasks can execute concurrently.
- **Rate-Limiting & Cache Shield**: The SHA-256 translation cache prevents API denial-of-wallet attacks by serving repeated expressions directly from RAM.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it as needed.
