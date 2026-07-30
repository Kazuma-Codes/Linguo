"""Audio upload endpoint — handles voice message file uploads.

Endpoint:
- POST /upload: Upload an audio file to MinIO and enqueue it for transcription.

Note: This is an optional router — it's only loaded if all heavy dependencies
(aiortc, webrtcvad, av, etc.) are installed. See main.py::_include_optional_routers().
"""

import uuid
import io

from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db.models import Message, User
from app.core.storage import minio_client, ensure_bucket
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_audio(
    room_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    """Upload an audio file for voice message transcription.

    Saves the file to MinIO, creates a Message record with type='voice',
    and enqueues a 'process_voice' job for the translation worker.
    """
    # Ensure the bucket exists before uploading
    ensure_bucket("audio")

    # Derive file extension from the uploaded filename (defaults to .webm)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
    object_name = f"{uuid.uuid4()}.{ext}"

    # Read the file contents and upload to MinIO
    contents = await file.read()
    minio_client.put_object(
        "audio",
        object_name,
        io.BytesIO(contents),
        len(contents),
        file.content_type,
    )

    # Create a draft message record for this voice upload
    m = Message(
        room_id=uuid.UUID(room_id),
        sender_id=u.id,
        message_type="voice",
        audio_url=f"audio/{object_name}",
        status="draft",
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    # Enqueue the voice processing job
    pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await pool.enqueue_job('process_voice', str(m.id))

    return {"message_id": str(m.id), "status": "processing"}
