"""SQLAlchemy engine and session factory configuration.

- engine: Connects to PostgreSQL using the DATABASE_URL from settings.
  Uses pool_pre_ping to detect stale connections and pool_recycle to
  prevent long-lived connections from accumulating server-side drift.
- SessionLocal: A factory for creating new database sessions.
  Use it via `with SessionLocal() as db:` for safe auto-commit/rollback.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,           # Send a lightweight ping before each checkout
    pool_recycle=1800,            # Recycle connections after 30 min
    echo=settings.DEBUG,          # Log generated SQL when DEBUG=True (silent in production)
)

# Template for creating new database sessions.
# autocommit=False: We control commits explicitly.
# autoflush=False: Don't auto-flush before queries — prevents unexpected side effects.
# expire_on_commit=False: Keep attributes accessible after commit() without re-fetching.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)
