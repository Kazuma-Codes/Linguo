from pydantic_settings import BaseSettings
# BaseSettings automatically reads env variables
class Settings(BaseSettings):
    PROJECT_NAME: str
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    class Config:
        env_file = ".env"
#loading them from env
settings = Settings()

