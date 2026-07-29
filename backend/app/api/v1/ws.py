import json
import uuid
import asyncio
import logging
from functools import partial
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.api.deps import get_db
from app.db.models import User, ChatRoom, Message
from app.core.security import decode_token
from app.core.redis import redis_client, pubsub_client
from app.db.session import SessionLocal

router = APIRouter()

logger = logging.getLogger(__name__)
# Manages active WebSocket connections grouped by room
class ConnectionManager:

    def __init__(self):
        # room_id -> list of connected WebSocket clients
        self.active_connections: dict[str, list[WebSocket]] = {}

    # Called when a user joins a room
    async def connect(self, websocket: WebSocket, room_id: str):
        # Complete WebSocket handshake
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = []

        self.active_connections[room_id].append(websocket)

    # Remove a disconnected client from the room
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)

    # Send a message to every client connected to the room
    async def broadcast_local(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass


manager = ConnectionManager()


# Listen for Redis Pub/Sub messages for a specific room
# Whenever a message is published to Redis, broadcast it
# to all WebSocket clients connected to that room.
async def redis_listener(room_id: str, pubsub):

    # Subscribe to the room's Redis channel
    await pubsub.subscribe(f"chat:{room_id}")

    async for message in pubsub.listen():

        # Ignore subscription confirmation events
        if message["type"] == "message":

            data = message["data"]

            # Redis may return bytes, convert to string
            if isinstance(data, bytes):
                data = data.decode()

            await manager.broadcast_local(data, room_id)


def _db_get_user(email: str) -> User | None:
    """Run synchronous DB query in a thread pool."""
    db = SessionLocal()
    try:
        return db.query(User).filter(User.email == email).first()
    finally:
        db.close()


def _db_get_room(room_id: str) -> ChatRoom | None:
    """Run synchronous DB query in a thread pool."""
    db = SessionLocal()
    try:
        return db.query(ChatRoom).filter(ChatRoom.id == uuid.UUID(room_id)).first()
    finally:
        db.close()


def _db_save_message(room_id, user_id, text) -> Message:
    """Save a message to the database (runs in thread pool)."""
    db = SessionLocal()
    try:
        msg = Message(
            room_id=room_id,
            sender_id=user_id,
            original_text=text,
            detected_lang="en",
            status="draft"
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
    finally:
        db.close()


def _db_confirm_draft(msg_id: str, room_id, user_id, edited_text: str | None):
    """Confirm a draft message (runs in thread pool)."""
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(
            Message.id == uuid.UUID(msg_id),
            Message.room_id == room_id
        ).first()
        if msg and msg.sender_id == user_id:
            if edited_text is not None:
                msg.translated_text = edited_text
            msg.status = "final"
            db.commit()
            db.refresh(msg)
            return msg
        return None
    finally:
        db.close()


# WebSocket endpoint:
# ws://localhost:8000/api/v1/ws/chat/{room_id}?token={jwt}
@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str,
):
    # Extract email from JWT token
    email = decode_token(token)

    if not email:
        await websocket.close(code=1008)
        return

    # Fetch authenticated user (in thread pool to avoid blocking)
    user = await asyncio.to_thread(_db_get_user, email)

    if not user:
        await websocket.close(code=1008)
        return

    # Verify that the room exists (in thread pool)
    room = await asyncio.to_thread(_db_get_room, room_id)

    if not room:
        await websocket.close(code=1011)
        return

    # Register WebSocket connection
    await manager.connect(websocket, room_id)
    logger.info(f"Connected: {user.email}")

    # Start background Redis listener for this room
    pubsub = pubsub_client.pubsub()
    listener_task = asyncio.create_task(redis_listener(room_id, pubsub))

    redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))

    try:
        while True:

            # Wait for incoming message from client
            data = await websocket.receive_text()
            logger.info(f"Received: {data}")

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg_type = payload.get("type")

            if msg_type == "send_draft":
                text = payload.get("text", "")
                if not text:
                    continue

                # Save message in database (in thread pool)
                msg = await asyncio.to_thread(
                    _db_save_message, room.id, user.id, text
                )

                # offload to translation worker
                await redis_pool.enqueue_job(
                    'process_translation',
                    str(msg.id),
                    room.target_lang
                )

                # Message payload that will be sent through Redis
                pub_payload = {
                    "type": "draft_ready",
                    "id": str(msg.id),
                    "sender_email": user.email,
                    "text": text,
                    "translated_text": None,
                }

                # Publish message to Redis channel
                await redis_client.publish(
                    f"chat:{room_id}",
                    json.dumps(pub_payload),
                )
                logger.info(f"Published: {pub_payload}")

            elif msg_type == "confirm_draft":
                msg_id = payload.get("id")
                edited_text = payload.get("edited_text")
                if not msg_id:
                    continue

                # Confirm draft in database (in thread pool)
                msg = await asyncio.to_thread(
                    _db_confirm_draft, msg_id, room.id, user.id, edited_text
                )

                if msg:
                    pub_payload = {
                        "type": "message_finalized",
                        "id": str(msg.id),
                        "sender_email": user.email,
                        "text": msg.original_text,
                        "translated_text": msg.translated_text,
                        "detected_lang": msg.detected_lang,
                        "cultural_footnotes": msg.cultural_footnotes,
                    }
                    await redis_client.publish(
                        f"chat:{room_id}",
                        json.dumps(pub_payload),
                    )
                    logger.info(f"Published confirmed: {pub_payload}")
    except WebSocketDisconnect:

        # Remove disconnected client
        manager.disconnect(websocket, room_id)

        # Stop Redis listener task
        await pubsub.unsubscribe(f"chat:{room_id}")
        await pubsub.close()
        listener_task.cancel()