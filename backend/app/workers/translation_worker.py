import asyncio, logging, json, os, tempfile, subprocess, urllib.request, uuid
from arq.connections import RedisSettings
# from faster_whisper import WhisperModel
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import Message, ChatRoom, User
from app.core.translation import detect_language, translate_text
from app.core.redis import redis_client
from app.core.ollama import get_cultural_context
from app.core.storage import minio_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# logger.info("Loading Whisper on CPU...")
# whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

# PIPER_MODEL = "en_US-lessac-medium.onnx"
# if not os.path.exists(PIPER_MODEL):
#     urllib.request.urlretrieve("https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx", PIPER_MODEL)
#     urllib.request.urlretrieve("https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json", f"{PIPER_MODEL}.json")

async def process_translation(ctx, message_id: str, target_lang: str):
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(Message.id == message_id).first()
        if not msg: return
        msg.detected_lang = detect_language(msg.original_text)
        msg.translated_text = translate_text(msg.original_text, msg.detected_lang, target_lang) if msg.detected_lang != target_lang else msg.original_text
        msg.cultural_footnotes = await get_cultural_context(msg.original_text, msg.translated_text, target_lang)
        db.commit()
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        await redis_client.publish(f"chat:{msg.room_id}", json.dumps({
            "id": str(msg.id), "type": "draft_ready", "sender_email": sender.email,
            "original_text": msg.original_text, "translated_text": msg.translated_text,
            "cultural_footnotes": msg.cultural_footnotes, "detected_lang": msg.detected_lang, "status": "draft"
        }))
    except Exception as e: logger.error(e)
    finally: db.close()

async def process_voice(ctx, message_id: str):
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(Message.id == message_id).first()
        if not msg or not msg.audio_url: return
        b, o = msg.audio_url.split("/", 1)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
            minio_client.fget_object(b, o, f.name)
            segs, info = whisper_model.transcribe(f.name, beam_size=5)
            msg.original_text = " ".join([s.text for s in segs]).strip()
            msg.detected_lang = info.language
        if not msg.original_text: db.delete(msg); db.commit(); return
        
        room = db.query(ChatRoom).filter(ChatRoom.id == msg.room_id).first()
        target = room.target_lang if room else "es"
        msg.translated_text = translate_text(msg.original_text, msg.detected_lang, target) if msg.detected_lang != target else msg.original_text
        msg.cultural_footnotes = await get_cultural_context(msg.original_text, msg.translated_text, target)
        
        tts_fn = f"{uuid.uuid4()}.wav"
        tts_path = f"/tmp/{tts_fn}"
        proc = await asyncio.create_subprocess_exec("piper", "--model", PIPER_MODEL, "--output_file", tts_path, stdin=subprocess.PIPE)
        await proc.communicate(input=msg.translated_text.encode())
        with open(tts_path, "rb") as f: minio_client.put_object("audio", tts_fn, f, os.path.getsize(tts_path))
        
        msg.tts_url = f"audio/{tts_fn}"; msg.status = "final"; db.commit()
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        await redis_client.publish(f"chat:{msg.room_id}", json.dumps({
            "id": str(msg.id), "type": "voice_finalized", "sender_email": sender.email,
            "original_text": msg.original_text, "translated_text": msg.translated_text,
            "audio_url": msg.audio_url, "tts_url": msg.tts_url,
            "cultural_footnotes": msg.cultural_footnotes, "detected_lang": msg.detected_lang, "status": "final"
        }))
    except Exception as e: logger.error(e)
    finally: db.close()

async def process_live_voice(ctx, audio_url: str, room_id: str):
    db = SessionLocal()
    try:
        b, o = audio_url.split("/", 1)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            minio_client.fget_object(b, o, f.name)
            segs, info = whisper_model.transcribe(f.name, beam_size=1, vad_filter=True)
            text = " ".join([s.text for s in segs]).strip()
        if not text: return
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        target = room.target_lang if room else "es"
        translated = translate_text(text, info.language, target)
        
        tts_fn = f"live_{uuid.uuid4()}.wav"
        tts_path = f"/tmp/{tts_fn}"
        proc = await asyncio.create_subprocess_exec("piper", "--model", PIPER_MODEL, "--output_file", tts_path, stdin=subprocess.PIPE)
        await proc.communicate(input=translated.encode())
        with open(tts_path, "rb") as f: minio_client.put_object("audio", tts_fn, f, os.path.getsize(tts_path))
        
        await redis_client.publish(f"live:{room_id}", json.dumps({
            "type": "live_audio_response", "text": translated, "tts_url": f"audio/{tts_fn}"
        }))
    except Exception as e: logger.error(e)
    finally: db.close()

class WorkerSettings:
    functions = [process_translation] #, process_voice, process_live_voice]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_concurrency = 1