"""Centralized application settings loaded from environment variables / .env file.

Uses pydantic-settings so all config is type-safe, validated at import time,
and documented in one place. Add new settings here rather than scattering
os.environ calls throughout the codebase.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Singleton settings object. Values are resolved from (highest priority first):
    1. Environment variables
    2. .env file (see model_config below)
    3. Defaults defined here
    """

    # --- Application ---
    PROJECT_NAME: str = "Live Translation AI"
    SECRET_KEY: str                       # JWT signing key — MUST be >= 32 chars
    ALGORITHM: str = "HS256"              # JWT algorithm
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEBUG: bool = False                  # Enables SQL echo logging, verbose errors, etc.
    ALLOWED_ORIGINS: list[str] = [       # CORS allowed origins (merged with env)
        "http://localhost:3000",
        "http://localhost:8081",
    ]

    # --- Database / Cache ---
    DATABASE_URL: str                     # PostgreSQL connection string
    REDIS_URL: str                        # Redis connection string (used for cache + pub/sub + arq)

    # --- Ollama (local LLM for translation & cultural analysis) ---
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"               # Primary model: translation + cultural notes
    OLLAMA_CULTURAL_MODEL: str = "gemma2:2b"        # (Reserved) Secondary model for cultural analysis

    # --- MinIO (S3-compatible object storage for audio files) ---
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",      # Ignore unexpected env vars instead of raising
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_must_be_strong(cls, v: str) -> str:
        """Ensure the JWT secret is long enough to resist brute-force attacks."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v


# Global singleton — import `from app.core.config import settings` everywhere
settings = Settings()