"""Authentication endpoints — user registration, login, and profile retrieval.

Endpoints:
- POST /register: Create a new account (returns user info, no token yet).
- POST /login: Authenticate with email/password (returns JWT access token).
- GET /me: Fetch the current user's profile (requires Bearer token).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.db.models import User
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()


# ─── Request / Response Schemas ───────────────────────────────────────────

class UserCreate(BaseModel):
    """Schema for user registration input."""
    email: EmailStr
    password: str
    preferred_language: str = "en"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    """Schema for login input (not directly used — OAuth2PasswordRequestForm is used instead)."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for the JWT response returned after successful login."""
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    """Schema for returning user data (excludes sensitive fields like hashed_password)."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    preferred_language: str = "en"


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account.

    Checks that the email isn't already taken, hashes the password,
    and saves the user to the database. Returns the new user's profile.
    """
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        preferred_language=user_in.preferred_language,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate a user with email and password.

    Uses OAuth2PasswordRequestForm (application/x-www-form-urlencoded)
    so Swagger UI's "Authorize" button works out of the box.
    Returns a JWT access token on success.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user
