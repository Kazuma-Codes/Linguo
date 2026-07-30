"""Chat room endpoints — create, list, and join translation rooms.

Endpoints:
- POST /rooms: Create a new room (auto-joins the creator as first participant).
- GET /rooms: List all rooms the current user is a participant of.
- POST /rooms/{room_id}/join: Join an existing room by ID.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_db, get_current_user
from app.db.models import ChatRoom, User, ChatParticipant

router = APIRouter()


# ─── Request / Response Schemas ───────────────────────────────────────────────

class RoomCreate(BaseModel):
    """Schema for creating a new room."""
    title: Optional[str] = None           # Optional display name for the room
    source_lang: str = "en"               # Source language code
    target_lang: str                       # Target language code


class RoomResponse(BaseModel):
    """Schema for returning room data."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: Optional[str]
    source_lang: str
    target_lang: str


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/rooms", response_model=RoomResponse)
def create_room(
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new translation room and add the creator as the first participant."""
    room = ChatRoom(
        creator_id=current_user.id,
        title=room_in.title,
        source_lang=room_in.source_lang,
        target_lang=room_in.target_lang,
    )
    db.add(room)

    # Auto-join the creator so they don't have to join their own room
    participant = ChatParticipant(room_id=room.id, user_id=current_user.id)
    db.add(participant)

    db.commit()
    db.refresh(room)
    return room


@router.get("/rooms", response_model=list[RoomResponse])
def list_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all rooms the current user is a participant of."""
    participations = db.query(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id
    ).all()
    room_ids = [p.room_id for p in participations]
    rooms = db.query(ChatRoom).filter(ChatRoom.id.in_(room_ids)).all()
    return rooms


@router.post("/rooms/{room_id}/join")
def join_room(
    room_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join an existing room by its UUID."""
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if already a participant
    existing = db.query(ChatParticipant).filter(
        ChatParticipant.room_id == room_id,
        ChatParticipant.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a participant in this room")

    participant = ChatParticipant(room_id=room_id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return {"status": "joined", "room_id": str(room_id)}
