from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.db.models import Message, User
from app.core.storage import minio_client, ensure_bucket
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
import uuid, io

router = APIRouter()

@router.post("/upload")
async def upload_audio(room_id: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    ensure_bucket("audio")
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
    obj = f"{uuid.uuid4()}.{ext}"
    contents = await file.read()
    minio_client.put_object("audio", obj, io.BytesIO(contents), len(contents), file.content_type)
    
    m = Message(room_id=uuid.UUID(room_id), sender_id=u.id, message_type="voice", audio_url=f"audio/{obj}", status="draft")
    db.add(m); db.commit(); db.refresh(m)
    
    pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await pool.enqueue_job('process_voice', str(m.id))
    return {"message_id": str(m.id), "status": "processing"}