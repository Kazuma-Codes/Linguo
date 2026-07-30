import logging
from contextlib import asynccontextmanager
from importlib import import_module

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1 import auth, rooms, ws
from app.core.config import settings          # ← new: centralised config
from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)

# (module_name, prefix, tag) – routers that need optional heavy deps
OPTIONAL_ROUTERS = [
    ("audio",  "/api/v1/audio",  "Audio"),
    ("webrtc", "/api/v1/webrtc", "WebRTC"),
    ("push",   "/api/v1/push",   "Push"),
]


def _include_optional_routers(app: FastAPI) -> None:
    for module_name, prefix, tag in OPTIONAL_ROUTERS:
        try:
            module = import_module(f"app.api.v1.{module_name}")
        except ImportError as exc:
            logger.warning("Skipping %s router (missing dep): %s", tag, exc)
            continue
        app.include_router(module.router, prefix=prefix, tags=[tag])
        logger.info("Loaded %s router", tag)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")
    yield
    engine.dispose()                          # ← clean shutdown


def create_app() -> FastAPI:
    app = FastAPI(title="Live Translation AI", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,   # ← from env / .env
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Core routers
    app.include_router(auth.router,  prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(rooms.router, prefix="/api/v1",       tags=["Rooms"])
    app.include_router(ws.router,    prefix="/api/v1",       tags=["WebSockets"])

    # Optional routers (skip gracefully)
    _include_optional_routers(app)

    # Metrics
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()