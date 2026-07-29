from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.api.v1 import auth, ws, rooms, audio, webrtc, push
from app.db.base import Base
from app.db.session import engine

app = FastAPI(title="Live Translation AI")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:8081"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(rooms.router, prefix="/api/v1", tags=["Rooms"])
app.include_router(ws.router, prefix="/api/v1", tags=["WebSockets"])
app.include_router(audio.router, prefix="/api/v1/audio", tags=["Audio"])
app.include_router(webrtc.router, prefix="/api/v1/webrtc", tags=["WebRTC"])
app.include_router(push.router, prefix="/api/v1/push", tags=["Push"])

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

@app.on_event("startup")
def on_startup():
    # Auto-create all tables if they don't exist yet
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health(): return {"status": "ok"}