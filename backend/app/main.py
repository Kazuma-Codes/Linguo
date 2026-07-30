import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)

app = FastAPI(title="Live Translation AI")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:8081"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Core routers (always loaded) ---
from app.api.v1 import auth, ws, rooms
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(rooms.router, prefix="/api/v1", tags=["Rooms"])
app.include_router(ws.router, prefix="/api/v1", tags=["WebSockets"])

# --- Optional routers (gracefully skip if dependencies are missing) ---
try:
    from app.api.v1 import audio
    app.include_router(audio.router, prefix="/api/v1/audio", tags=["Audio"])
    logger.info("Audio router loaded successfully")
except ImportError as e:
    logger.warning(f"Audio router skipped (missing dependency): {e}")

try:
    from app.api.v1 import webrtc
    app.include_router(webrtc.router, prefix="/api/v1/webrtc", tags=["WebRTC"])
    logger.info("WebRTC router loaded successfully")
except ImportError as e:
    logger.warning(f"WebRTC router skipped (missing dependency): {e}")

try:
    from app.api.v1 import push
    app.include_router(push.router, prefix="/api/v1/push", tags=["Push"])
    logger.info("Push router loaded successfully")
except ImportError as e:
    logger.warning(f"Push router skipped (missing dependency): {e}")

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

@app.on_event("startup")
def on_startup():
    # Auto-create all tables if they don't exist yet
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

@app.get("/health")
def health(): return {"status": "ok"}