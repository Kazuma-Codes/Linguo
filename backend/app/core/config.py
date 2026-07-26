from pydantic_settings import BaseSettings,SettingsConfigDict
# BaseSettings automatically reads env variables
class Settings(BaseSettings):
    PROJECT_NAME: str
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES : int = 60*24 * 7 # 7 days
    OLLAMA_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"              # Primary: translation
    OLLAMA_CULTURAL_MODEL: str = "gemma2:2b"       # Secondary: cultural analysis (loaded on-demand)
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )
#loading them from env
settings = Settings()

