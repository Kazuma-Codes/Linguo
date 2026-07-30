"""arq background worker — processes chat messages asynchronously.

This worker handles:
- process_translation: Detect language, translate text via Ollama, generate cultural footnotes.
- (Disabled) process_voice: Transcribe audio via Whisper, translate, generate TTS.
- (Disabled) process_live_voice: Transcribe live audio, translate, generate TTS.

The worker connects to Redis (same instance as the app) and picks up jobs
enqueued by the WebSocket endpoint. Only one job runs at a time
(max_concurrency=1) to avoid overwhelming the local Ollama LLM.

Run with: arq app.workers.translation_worker.WorkerSettings
"""

import asyncio
import json
import logging
from contextlib import contextmanager

from arq.connections import RedisSettings

from app.core.config import settings
from app.core.ollama import get_cultural_context
from app.core.redis import redis_client
from app.core.translation import detect_language, translate_text
from app.db.models import ChatRoom, Message, User
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_TARGET_LANG = "es"


class Status:
    """Message status constants."""
    DRAFT = "draft"
    FINAL = "final"


@contextmanager
def db_session():
    """Provide a database session for worker functions.

    Usage:
        with db_session() as db:
            db.query(...)
    Automatically closes the session when the block exits.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def maybe_translate(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text only if source and target languages differ.

    Avoids an unnecessary LLM call when both languages are the same.
    """
    return text if source_lang == target_lang else translate_text(text, source_lang, target_lang)


async def build_cultural_footnotes(original: str, translated: str, target_lang: str) -> str | None:
    """Generate cultural context notes for a translated message.

    Returns a JSON string with humor, idiom, and etiquette analysis,
    or None if the LLM call fails.
    """
    cultural = await get_cultural_context(original, translated, target_lang)
    return json.dumps(cultural) if cultural else None


async def publish_chat_event(room_id: str, payload: dict):
    """Publish a JSON message to the room's Redis pub/sub channel.

    The WebSocket handler's listener task picks this up and broadcasts
    it to all connected clients in the room.
    """
    await redis_client.publish(f"chat:{room_id}", json.dumps(payload))


# ─── Active Worker Functions ─────────────────────────────────────────────────

async def process_translation(ctx, message_id: str, target_lang: str):
    """Process a text message: detect language, translate, add cultural footnotes.

    This is the main worker function, enqueued by the WebSocket handler
    when a user sends a draft message.

    Args:
        ctx: arq job context (provides access to Redis, etc.).
        message_id: UUID string of the Message record.
        target_lang: Target language code for translation.
    """
    with db_session() as db:
        try:
            # Fetch the message
            msg = db.query(Message).filter(Message.id == message_id).first()
            if not msg:
                return

            # Step 1: Detect the source language
            msg.detected_lang = detect_language(msg.original_text)

            # Step 2: Translate to the target language
            msg.translated_text = maybe_translate(msg.original_text, msg.detected_lang, target_lang)

            # Step 3: Generate cultural context notes
            msg.cultural_footnotes = await build_cultural_footnotes(
                msg.original_text, msg.translated_text, target_lang
            )

            db.commit()

            # Step 4: Notify all clients in the room via Redis pub/sub
            sender = db.query(User).filter(User.id == msg.sender_id).first()
            await publish_chat_event(msg.room_id, {
                "id": str(msg.id),
                "type": "draft_ready",
                "sender_email": sender.email if sender else "unknown",
                "original_text": msg.original_text,
                "translated_text": msg.translated_text,
                "cultural_footnotes": json.loads(msg.cultural_footnotes) if msg.cultural_footnotes else None,
                "detected_lang": msg.detected_lang,
                "status": Status.DRAFT,
            })
        except Exception:
            logger.exception("process_translation failed for message %s", message_id)


# ─── Disabled Voice Functions (uncomment when whisper/piper are wired back up) ─
# These require faster-whisper and piper-tts, which are heavy dependencies.
# See the commented-out helper functions in the docstring block below.

"""
DISABLED — see audio helpers block above for the full implementation.

async def process_voice(ctx, message_id: str):
    ...

async def process_live_voice(ctx, audio_url: str, room_id: str):
    ...
"""


# ─── Worker Settings ─────────────────────────────────────────────────────────

class WorkerSettings:
    """arq worker configuration.

    - functions: List of async functions this worker can execute.
    - redis_settings: Connection to the Redis instance.
    - max_concurrency: Only 1 job at a time — the local Ollama model can't
      handle parallel requests without significant slowdown.
    """
    functions = [process_translation]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_concurrency = 1
