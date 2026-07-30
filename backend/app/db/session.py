# connect to databaset to perform operations
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,       # recycle connections after 30 min (avoids stale-connection drops)
    echo=settings.DEBUG,     # log generated SQL when DEBUG=True, silent in production
) #from here to 
# template for creating connection
SessionLocal = sessionmaker( # here
    autocommit = False,
    autoflush = False,
    bind = engine,
    expire_on_commit=False,  # keep attributes accessible after commit (see note below)
)