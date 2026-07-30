"""FastAPI application factory — creates and configures the app.

This module defines:
- lifespan(): Handles startup (create DB tables) and shutdown (dispose engine).
- create_app(): Assembles middleware, routers, and metrics into a FastAPI app.
- app: The module-level app instance used by uvicorn.

Optional routers (audio, webrtc, push) are loaded only if their heavy
dependencies are installed — see _include_optional_routers().
"""

import logging
from contextlib import asynccontextmanager
from importlib import import_module

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1 import auth, rooms, ws
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)

# Optional routers that require heavy/native dependencies.
# These are gracefully skipped if their imports fail.
# Format: (module_name, url_prefix, tag)
OPTIONAL_ROUTERS = [
    ("audio",  "/api/v1/audio",  "Audio"),
    ("webrtc", "/api/v1/webrtc", "WebRTC"),
    ("push",   "/api/v1/push",   "Push"),
]


def _include_optional_routers(app: FastAPI) -> None:
    """Try to import and register optional routers. Skips gracefully on ImportError."""
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
    """Application lifespan: create tables on startup, dispose engine on shutdown."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")
    yield
    engine.dispose()
    logger.info("Database engine disposed")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="Live Translation AI", lifespan=lifespan)

    # CORS — allows the frontend and mobile to talk to the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Core routers (always available)
    app.include_router(auth.router,  prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(rooms.router, prefix="/api/v1",       tags=["Rooms"])
    app.include_router(ws.router,    prefix="/api/v1",       tags=["WebSockets"])

    # Optional routers (skip gracefully if deps are missing)
    _include_optional_routers(app)

    # Prometheus metrics — exposed at /metrics
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    @app.get("/health")
    def health():
        """Simple health check endpoint."""
        return {"status": "ok"}

    return app


# Module-level app instance used by: uvicorn app.main:app
app = create_app()
