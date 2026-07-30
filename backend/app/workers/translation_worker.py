"""
redis based async task queue that process chat message inthe background
"""

import asyncio
import json
import logging
import os
from contextlib import contextmanager

from arq.connections import RedisSettings

# from faster_whisper import WhisperModel
from app.core.config import settings
from app.core.ollama import get_cultural_context
from app.core.redis import redis_client
from app.core.storage import minio_client
from app.core.translation import detect_language, translate_text
from app.db.models import ChatRoom, Message, User
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# logger.info("Loading Whisper on CPU...")
# whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

DEFAULT_TARGET_LANG = "es"


class Status:
    DRAFT = "draft"
    FINAL = "final"


@contextmanager
# every function should get a db session
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# calls api only if the language of source and destinaltion differ
def maybe_translate(text: str, source_lang: str, target_lang: str) -> str:
    """Skip the translation call entirely if source and target already match."""
    return text if source_lang == target_lang else translate_text(text, source_lang, target_lang)

# adds cultural context or notes about translation
async def build_cultural_footnotes(original: str, translated: str, target_lang: str) -> str | None:
    cultural = await get_cultural_context(original, translated, target_lang)
    return json.dumps(cultural) if cultural else None

# pushes json message to redis pub sub channel chat: roomid
async def publish_chat_event(room_id: str, payload: dict):
    await redis_client.publish(f"chat:{room_id}", json.dumps(payload))


# ---------------------------------------------------------------------------
# Audio feature (voice messages + live voice) — disabled for now, kept for
# when whisper/piper are wired back up. Uncomment along with the imports
# below (subprocess, tempfile, uuid) and the whisper/piper setup above.
# ---------------------------------------------------------------------------
"""
import subprocess
import tempfile
import uuid

PIPER_MODEL = "en_US-lessac-medium.onnx"


def _ensure_piper_model():
    if not os.path.exists(PIPER_MODEL):
        import urllib.request

        base = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium"
        urllib.request.urlretrieve(f"{base}/{PIPER_MODEL}", PIPER_MODEL)
        urllib.request.urlretrieve(f"{base}/{PIPER_MODEL}.json", f"{PIPER_MODEL}.json")


async def download_audio(audio_url: str, suffix: str) -> str:
    \"\"\"Fetch an object from minio into a temp file and return its path. Caller must delete it.\"\"\"
    bucket, object_name = audio_url.split("/", 1)
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    await asyncio.to_thread(minio_client.fget_object, bucket, object_name, path)
    return path


async def transcribe_audio(path: str, **kwargs) -> tuple[str, str]:
    \"\"\"Returns (text, detected_language).\"\"\"
    segs, info = await asyncio.to_thread(whisper_model.transcribe, path, **kwargs)
    text = " ".join(seg.text for seg in segs).strip()
    return text, info.language


async def synthesize_speech(text: str, filename_prefix: str = "") -> str:
    \"\"\"Runs piper TTS, uploads the result to minio, and returns its object path (e.g. 'audio/xyz.wav').\"\"\"
    fn = f"{filename_prefix}{uuid.uuid4()}.wav"
    path = f"/tmp/{fn}"
    try:
        proc = await asyncio.create_subprocess_exec(
            "piper", "--model", PIPER_MODEL, "--output_file", path,
            stdin=subprocess.PIPE,
        )
        await proc.communicate(input=text.encode())
        await asyncio.to_thread(
            lambda: minio_client.fput_object("audio", fn, path)
        )
        return f"audio/{fn}"
    finally:
        if os.path.exists(path):
            os.remove(path)
"""


async def process_translation(ctx, message_id: str, target_lang: str):
    with db_session() as db:
        try:
            # fetch message by row id
            msg = db.query(Message).filter(Message.id == message_id).first()
            if not msg:
                return

            msg.detected_lang = detect_language(msg.original_text)
            msg.translated_text = maybe_translate(msg.original_text, msg.detected_lang, target_lang)
            msg.cultural_footnotes = await build_cultural_footnotes(
                msg.original_text, msg.translated_text, target_lang
            )
            # save it to the db 
            db.commit()

            sender = db.query(User).filter(User.id == msg.sender_id).first()
            await publish_chat_event(msg.room_id, {
                "id": str(msg.id),
                "type": "draft_ready",
                "sender_email": sender.email,
                "original_text": msg.original_text,
                "translated_text": msg.translated_text,
                "cultural_footnotes": json.loads(msg.cultural_footnotes) if msg.cultural_footnotes else None,
                "detected_lang": msg.detected_lang,
                "status": Status.DRAFT,
            })
        except Exception:
            logger.exception("process_translation failed for message %s", message_id)


# ---------------------------------------------------------------------------
# Voice message + live voice worker functions — disabled for now (audio
# feature not in use). Uncomment together with the audio helpers above and
# add them back to WorkerSettings.functions below when ready.
# ---------------------------------------------------------------------------
"""
async def process_voice(ctx, message_id: str):
    with db_session() as db:
        audio_path = None
        try:
            msg = db.query(Message).filter(Message.id == message_id).first()
            if not msg or not msg.audio_url:
                return

            audio_path = await download_audio(msg.audio_url, suffix=".webm")
            msg.original_text, msg.detected_lang = await transcribe_audio(audio_path, beam_size=5)

            if not msg.original_text:
                db.delete(msg)
                db.commit()
                return

            room = db.query(ChatRoom).filter(ChatRoom.id == msg.room_id).first()
            target = room.target_lang if room else DEFAULT_TARGET_LANG

            msg.translated_text = maybe_translate(msg.original_text, msg.detected_lang, target)
            msg.cultural_footnotes = await build_cultural_footnotes(
                msg.original_text, msg.translated_text, target
            )
            msg.tts_url = await synthesize_speech(msg.translated_text)
            msg.status = Status.FINAL
            db.commit()

            sender = db.query(User).filter(User.id == msg.sender_id).first()
            await publish_chat_event(msg.room_id, {
                "id": str(msg.id),
                "type": "voice_finalized",
                "sender_email": sender.email,
                "original_text": msg.original_text,
                "translated_text": msg.translated_text,
                "audio_url": msg.audio_url,
                "tts_url": msg.tts_url,
                "cultural_footnotes": json.loads(msg.cultural_footnotes) if msg.cultural_footnotes else None,
                "detected_lang": msg.detected_lang,
                "status": Status.FINAL,
            })
        except Exception:
            logger.exception("process_voice failed for message %s", message_id)
        finally:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)


async def process_live_voice(ctx, audio_url: str, room_id: str):
    with db_session() as db:
        audio_path = None
        try:
            audio_path = await download_audio(audio_url, suffix=".wav")
            text, detected_lang = await transcribe_audio(audio_path, beam_size=1, vad_filter=True)
            if not text:
                return

            room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
            target = room.target_lang if room else DEFAULT_TARGET_LANG
            translated = translate_text(text, detected_lang, target)
            tts_url = await synthesize_speech(translated, filename_prefix="live_")

            await redis_client.publish(f"live:{room_id}", json.dumps({
                "type": "live_audio_response",
                "text": translated,
                "tts_url": tts_url,
            }))
        except Exception:
            logger.exception("process_live_voice failed for room %s", room_id)
        finally:
            if audio_path and os.path.exists(audio_path):
                os.remove(audio_path)
"""


class WorkerSettings:
    functions = [process_translation]  # add process_voice, process_live_voice once whisper/piper are enabled
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_concurrency = 1