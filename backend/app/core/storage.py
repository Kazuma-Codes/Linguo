"""MinIO client initialization for S3-compatible object storage.

Used to store and retrieve audio files (voice messages, live-voice WAV segments,
TTS output). Buckets are created on demand via ensure_bucket().
"""

from minio import Minio

from app.core.config import settings

# S3-compatible client pointed at the MinIO instance defined in settings.
# secure=False because MinIO runs without TLS by default in development.
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False,
)


def ensure_bucket(bucket_name: str) -> None:
    """Create the bucket if it doesn't already exist. Idempotent — safe to call every time."""
    if not minio_client.bucket_exists(bucket_name):
        minio_client.make_bucket(bucket_name)