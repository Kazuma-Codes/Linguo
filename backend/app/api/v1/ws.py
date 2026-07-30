# the websocket

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

# connection + room-listner management
class ConnectionManager:

    def __init__(self):
        # tracks all the active websockets organized by rooms
        #str -> room id (eg : room123)
        self.active_connections: dict[str, list[WebSocket]] = {}
        # stores background async io that are listnening for message or events in each room
        # async.Task => a async task running in the background
        # used to listen for messages from a message queue like pub/sub
        self._listener_tasks: dict[str,asyncio.Task] = {}
        # stores pubsumb handler for each room
        self._pubsubs: dict[str,"PubSub"] = {}

    # Called when a user joins a room
    async def connect(self, websocket: WebSocket, room_id: str):
        # Complete WebSocket handshake
        await websocket.accept()

        self.active_connections.setdefault(room_id, []).append(websocket)
        await self._ensure_listener(room_id)

    # Remove a disconnected client from the room
    async def disconnect(self, websocket: WebSocket, room_id: str) -> None:
        conns = self.active_connections.get(room_id, [])
        if websocket in conns:
            conns.remove(websocket)
        # Last person out turns off the lights: stop the shared listener.
        if not conns:
            self.active_connections.pop(room_id, None)
            await self._stop_listener(room_id)

    # Send a message to every client connected to the room
    async def broadcast_local(self, message: str, room_id: str) -> None:
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
        task = self._listener_tasks.pop(room_id, None)
        pubsub = self._pubsubs.pop(room_id, None)
        if pubsub:
            await pubsub.unsubscribe(f"chat:{room_id}")
            await pubsub.close()
        if task:
            task.cancel()

    async def _listen(self, room_id: str, pubsub) -> None:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message["data"]
            if isinstance(data, bytes):
                data = data.decode()
            await self.broadcast_local(data, room_id)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Shared arq pool (created once, reused for every job dispatch)
# ---------------------------------------------------------------------------

_arq_pool = None


async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


# ---------------------------------------------------------------------------
# Blocking DB calls, run off the event loop via asyncio.to_thread
# ---------------------------------------------------------------------------

def _db_get_user(email: str) -> User | None:
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).first()


def _db_get_room(room_id: str) -> ChatRoom | None:
    with SessionLocal() as db:
        return db.query(ChatRoom).filter(ChatRoom.id == uuid.UUID(room_id)).first()


def _db_save_message(room_id, user_id, text) -> Message:
    with SessionLocal() as db:
        msg = Message(
            room_id=room_id,
            sender_id=user_id,
            original_text=text,
            detected_lang="en",
            status="draft",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg


def _db_confirm_draft(msg_id: str, room_id, user_id, edited_text: str | None) -> Message | None:
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


# ---------------------------------------------------------------------------
# Message-type handlers (split out of the big if/elif)
# ---------------------------------------------------------------------------

async def handle_send_draft(payload: dict, room: ChatRoom, user: User) -> None:
    text = payload.get("text", "")
    if not text:
        return

    msg = await asyncio.to_thread(_db_save_message, room.id, user.id, text)

    pool = await get_arq_pool()
    await pool.enqueue_job("process_translation", str(msg.id), room.target_lang)

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


MESSAGE_HANDLERS = {
    "send_draft": handle_send_draft,
    "confirm_draft": handle_confirm_draft,
}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str):
    email = decode_token(token)
    if not email:
        await websocket.close(code=1008)
        return

    user = await asyncio.to_thread(_db_get_user, email)
    if not user:
        await websocket.close(code=1008)
        return

    room = await asyncio.to_thread(_db_get_room, room_id)
    if not room:
        await websocket.close(code=1011)
        return

    await manager.connect(websocket, room_id)
    logger.info("Connected: %s", user.email)

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
        await manager.disconnect(websocket, room_id)