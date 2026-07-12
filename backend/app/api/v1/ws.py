import json
import uuid
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db.models import User, ChatRoom, Message
from app.core.security import decode_token
from app.core.redis import redis_client, pubsub_client

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
async def redis_listener(room_id: str):

    pubsub = pubsub_client.pubsub()

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


# WebSocket endpoint:
# ws://localhost:8000/api/v1/ws/chat/{room_id}?token={jwt}
@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str,
    db: Session = Depends(get_db),
):
    print("connected")
    # Extract email from JWT token
    email = decode_token(token)

    if not email:
        await websocket.close(code=1008)
        return

    # Fetch authenticated user
    user = db.query(User).filter(User.email == email).first()

    if not user:
        await websocket.close(code=1008)
        return

    # Verify that the room exists
    room = (
        db.query(ChatRoom)
        .filter(ChatRoom.id == uuid.UUID(room_id))
        .first()
    )

    if not room:
        await websocket.close(code=1011)
        return

    # Register WebSocket connection
    await manager.connect(websocket, room_id)
    logger.info(f"Connected: {user.email}")

    # Start background Redis listener for this room
    listener_task = asyncio.create_task(redis_listener(room_id))

    try:
        while True:

            # Wait for incoming message from client
            data = await websocket.receive_text()
            logger.info(f"Received: {data}")

            # Save message in database
            msg = Message(
                room_id=room.id,
                sender_id=user.id,
                original_text=data,
                detected_lang="en",
            )

            db.add(msg)
            db.commit()
            db.refresh(msg)

            # Message payload that will be sent through Redis
            payload = {
                "id": str(msg.id),
                "sender_email": user.email,
                "text": data,
                "translated_text": None,
            }

            # Publish message to Redis channel
            await redis_client.publish(
                f"chat:{room_id}",
                json.dumps(payload),
            )
            logger.info(f"Published: {payload}")
    except WebSocketDisconnect:

        # Remove disconnected client
        manager.disconnect(websocket, room_id)

        # Stop Redis listener task
        listener_task.cancel()