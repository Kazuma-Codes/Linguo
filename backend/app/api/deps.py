"""FastAPI dependency injection — reusable dependencies for route handlers.

Provides:
- get_db(): Yields a SQLAlchemy session, auto-closes after the request.
- get_current_user(): Extracts and validates the JWT from the Authorization header.

These are used with `Depends()` in route function signatures.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import decode_token

# OAuth2 scheme that extracts the Bearer token from the Authorization header.
# tokenUrl points to the login endpoint so Swagger UI can try it out.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_db():
    """Dependency that provides a database session.

    Usage: `db: Session = Depends(get_db)`
    The session is automatically closed after the request completes,
    even if an exception was raised.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Type aliases for cleaner function signatures using Annotated + Depends.
DbSession = Annotated[Session, Depends(get_db)]
Token = Annotated[str, Depends(oauth2_scheme)]


def get_current_user(db: DbSession, token: Token) -> User:
    """Dependency that extracts the current user from a JWT.

    Raises 401 if the token is invalid, expired, or the user doesn't exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    email = decode_token(token)
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
