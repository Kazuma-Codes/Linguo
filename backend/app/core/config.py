from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    PROJECT_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALLOWED_ORIGINS: list[str] = [                   # ← merged in
        "http://localhost:3000",
        "http://localhost:8081",
    ]

    # --- Database / Cache ---
    DATABASE_URL: str
    REDIS_URL: str

    # --- Ollama (LLM) ---
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"               # primary: translation
    OLLAMA_CULTURAL_MODEL: str = "gemma2:2b"        # secondary: cultural analysis

    # --- MinIO (object storage) ---
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v


settings = Settings()