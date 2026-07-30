"""SQLAlchemy ORM models for the translation chat database.

Tables:
- users: Registered users with email/password auth and a preferred language.
- chat_rooms: Translation rooms defined by a source→target language pair.
- messages: Individual chat messages (text or voice) with translation status.
- chat_participants: Many-to-many join linking users to rooms they've joined.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    """A registered user who can create/join rooms and send messages."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)              # bcrypt hash
    preferred_language = Column(String, default="en", nullable=False)  # ISO 639-1 code
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    rooms_created = relationship("ChatRoom", foreign_keys="ChatRoom.creator_id", back_populates="creator")
    participations = relationship("ChatParticipant", back_populates="user", cascade="all, delete-orphan")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class ChatRoom(Base):
    """A translation room where messages are exchanged between participants.

    Defines the language pair (source_lang → target_lang) used for
    automatic translation of all messages in this room.
    """

    __tablename__ = "chat_rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=True)                           # Optional display name
    source_lang = Column(String, default="en", nullable=False)     # Source language code
    target_lang = Column(String, default="es", nullable=False)     # Target language code
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="rooms_created")
    participants = relationship("ChatParticipant", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan", order_by="Message.created_at")

    def __repr__(self) -> str:
        return f"<ChatRoom {self.id} ({self.source_lang}->{self.target_lang})>"


class Message(Base):
    """A chat message within a room. Can be text or voice.

    Lifecycle:
    1. Created with status='draft' — translation is in progress.
    2. Worker fills in translated_text, detected_lang, cultural_footnotes.
    3. Sender confirms → status becomes 'final'.
    """

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    original_text = Column(Text, nullable=True)               # Original message content
    translated_text = Column(Text, nullable=True)              # AI-translated text
    detected_lang = Column(String, nullable=True)              # fastText-detected language code
    message_type = Column(String, nullable=False, default="text")  # 'text' or 'voice'
    audio_url = Column(String, nullable=True)                 # MinIO path to audio file
    status = Column(String, nullable=False, default="draft", index=True)  # 'draft' or 'final'
    cultural_footnotes = Column(Text, nullable=True)          # JSON string with cultural context
    tts_url = Column(String, nullable=True)                    # MinIO path to TTS audio
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")

    def __repr__(self) -> str:
        return f"<Message {self.id} room={self.room_id} status={self.status}>"


class ChatParticipant(Base):
    """Join table linking users to chat rooms (many-to-many).

    A user must be a participant to view or send messages in a room.
    """

    __tablename__ = "chat_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User", back_populates="participations")

    def __repr__(self) -> str:
        return f"<ChatParticipant user={self.user_id} room={self.room_id}>"
