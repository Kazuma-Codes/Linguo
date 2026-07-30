"""WebSocket chat endpoint — real-time translation messaging.

Endpoint:
- WS /ws/chat/{room_id}?token=<jwt>: Real-time chat connection.

Protocol (client → server):
  - {"type": "send_draft", "text": "hello"}  — Submit a message for translation.
  - {"type": "confirm_draft", "id": "<uuid>", "edited_text": "..."} — Confirm/send a translated draft.

Protocol (server → client, via Redis pub/sub):
  - {"type": "draft_ready", ...}  — Translation complete, draft ready for review.
  - {"type": "message_finalized", ...}  — Message confirmed and sent.

Architecture:
  - ConnectionManager tracks all WebSocket connections per room.
  - Each room has exactly one Redis pub/sub listener task that broadcasts
    incoming messages to all connected clients in that room.
  - Blocking DB calls are offloaded to threads via asyncio.to_thread().
"""

import json
import uuid
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.db.models import User, ChatRoom, Message
from app.core.security import decode_token
from app.core.redis import redis_client, pubsub_client
from app.db.session import SessionLocal

router = APIRouter()

logger = logging.getLogger(__name__)


# ─── Connection Manager ─────────────────────────────────────────────────────

class ConnectionManager:
    """Manages WebSocket connections grouped by chat room.

    - active_connections: room_id → list of connected WebSocket instances.
    - _listener_tasks: room_id → background asyncio.Task listening to Redis pub/sub.
    - _pubsubs: room_id → Redis PubSub handler for that room's channel.
    """

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._listener_tasks: dict[str, asyncio.Task] = {}
        self._pubsubs: dict[str, object] = {}

    async def connect(self, websocket: WebSocket, room_id: str) -> None:
        """Accept a WebSocket connection and start the room listener if needed."""
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)
        await self._ensure_listener(room_id)

    async def disconnect(self, websocket: WebSocket, room_id: str) -> None:
        """Remove a client from the room. Stops the listener if the room is empty."""
        conns = self.active_connections.get(room_id, [])
        if websocket in conns:
            conns.remove(websocket)
        # Last person out turns off the lights: stop the shared listener.
        if not conns:
            self.active_connections.pop(room_id, None)
            await self._stop_listener(room_id)

    async def broadcast_local(self, message: str, room_id: str) -> None:
        """Send a text message to every client connected to the room.

        Dead connections (e.g. closed tabs) are detected and removed.
        """
        dead = []
        for connection in self.active_connections.get(room_id, []):
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.active_connections[room_id].remove(connection)

    async def _ensure_listener(self, room_id: str) -> None:
        """Start exactly one Redis listener per room, no matter how many clients join."""
        if room_id in self._listener_tasks:
            return

        pubsub = pubsub_client.pubsub()
        await pubsub.subscribe(f"chat:{room_id}")
        self._pubsubs[room_id] = pubsub
        self._listener_tasks[room_id] = asyncio.create_task(
            self._listen(room_id, pubsub)
        )

    async def _stop_listener(self, room_id: str) -> None:
        """Cancel the Redis listener task and clean up pub/sub for a room."""
        task = self._listener_tasks.pop(room_id, None)
        pubsub = self._pubsubs.pop(room_id, None)
        if pubsub:
            await pubsub.unsubscribe(f"chat:{room_id}")
            await pubsub.close()
        if task:
            task.cancel()

    async def _listen(self, room_id: str, pubsub) -> None:
        """Background task that reads messages from Redis pub/sub and broadcasts them."""
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message["data"]
            if isinstance(data, bytes):
                data = data.decode()
            await self.broadcast_local(data, room_id)


manager = ConnectionManager()


# ─── Shared arq Pool ──────────────────────────────────────────────────────────

_arq_pool = None


async def get_arq_pool():
    """Return a shared arq connection pool (created once, reused for all job dispatches)."""
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


# ─── Blocking DB Helpers (run off the event loop via asyncio.to_thread) ────

def _db_get_user(email: str) -> User | None:
    """Fetch a user by email. Intended to be called via asyncio.to_thread()."""
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).first()


def _db_get_room(room_id: str) -> ChatRoom | None:
    """Fetch a room by UUID string. Intended to be called via asyncio.to_thread()."""
    with SessionLocal() as db:
        return db.query(ChatRoom).filter(ChatRoom.id == uuid.UUID(room_id)).first()


def _db_save_message(room_id, user_id, text) -> Message:
    """Save a new draft message to the database. Intended to be called via asyncio.to_thread()."""
    with SessionLocal() as db:
        msg = Message(
            room_id=room_id,
            sender_id=user_id,
            original_text=text,
            detected_lang="pending",  # Will be updated by the translation worker
            status="draft",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg


def _db_confirm_draft(msg_id: str, room_id, user_id, edited_text: str | None) -> Message | None:
    """Mark a draft message as final. Intended to be called via asyncio.to_thread()."""
    with SessionLocal() as db:
        msg = (
            db.query(Message)
            .filter(Message.id == uuid.UUID(msg_id), Message.room_id == room_id)
            .first()
        )
        if not msg or msg.sender_id != user_id:
            return None

        if edited_text is not None:
            msg.translated_text = edited_text
        msg.status = "final"
        db.commit()
        db.refresh(msg)
        return msg


# ─── Message-Type Handlers ───────────────────────────────────────────────────

async def handle_send_draft(payload: dict, room: ChatRoom, user: User) -> None:
    """Handle a 'send_draft' message: save to DB, enqueue translation, notify clients."""
    text = payload.get("text", "")
    if not text:
        return

    msg = await asyncio.to_thread(_db_save_message, room.id, user.id, text)

    # Enqueue the translation job for the background worker
    pool = await get_arq_pool()
    await pool.enqueue_job("process_translation", str(msg.id), room.target_lang)

    # Publish an immediate "draft received" notification to all clients
    pub_payload = {
        "type": "draft_ready",
        "id": str(msg.id),
        "sender_email": user.email,
        "text": text,
        "translated_text": None,
    }
    await redis_client.publish(f"chat:{room.id}", json.dumps(pub_payload))
    logger.info("Published draft: %s", pub_payload)


async def handle_confirm_draft(payload: dict, room: ChatRoom, user: User) -> None:
    """Handle a 'confirm_draft' message: mark as final and notify clients."""
    msg_id = payload.get("id")
    if not msg_id:
        return

    msg = await asyncio.to_thread(
        _db_confirm_draft, msg_id, room.id, user.id, payload.get("edited_text")
    )
    if not msg:
        return

    pub_payload = {
        "type": "message_finalized",
        "id": str(msg.id),
        "sender_email": user.email,
        "text": msg.original_text,
        "translated_text": msg.translated_text,
        "detected_lang": msg.detected_lang,
        "cultural_footnotes": msg.cultural_footnotes,
    }
    await redis_client.publish(f"chat:{room.id}", json.dumps(pub_payload))
    logger.info("Published confirmed: %s", pub_payload)


# Dispatch table — maps message type strings to their handler functions.
MESSAGE_HANDLERS = {
    "send_draft": handle_send_draft,
    "confirm_draft": handle_confirm_draft,
}


# ─── WebSocket Endpoint ─────────────────────────────────────────────────────

@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str):
    """Main WebSocket endpoint for real-time chat.

    Authentication:
      The JWT token is passed as a query parameter: ?token=<jwt>
      This is standard for WebSocket auth (no headers on the upgrade request).

    Flow:
      1. Validate the JWT and resolve the user.
      2. Verify the room exists.
      3. Accept the connection and register with the ConnectionManager.
      4. Listen for incoming JSON messages and dispatch to handlers.
      5. On disconnect, clean up the connection.
    """
    # Step 1: Authenticate
    email = decode_token(token)
    if not email:
        await websocket.close(code=1008)  # Policy violation
        return

    user = await asyncio.to_thread(_db_get_user, email)
    if not user:
        await websocket.close(code=1008)
        return

    # Step 2: Verify room exists
    room = await asyncio.to_thread(_db_get_room, room_id)
    if not room:
        await websocket.close(code=1011)  # Internal error (room not found)
        return

    # Step 3: Connect
    await manager.connect(websocket, room_id)
    logger.info("Connected: %s", user.email)

    # Step 4: Message loop
    try:
        while True:
            data = await websocket.receive_text()

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue

            handler = MESSAGE_HANDLERS.get(payload.get("type"))
            if handler:
                await handler(payload, room, user)

    except WebSocketDisconnect:
        # Step 5: Cleanup
        await manager.disconnect(websocket, room_id)
