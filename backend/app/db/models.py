# the database table model 
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    rooms_created = relationship("ChatRoom", foreign_keys="ChatRoom.creator_id", back_populates="creator")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=True)
    source_lang = Column(String, default="en", nullable=False)
    target_lang = Column(String, default="es", nullable=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    creator = relationship("User", foreign_keys=[creator_id], back_populates="rooms_created")
    messages = relationship(
        "Message",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<ChatRoom {self.id} ({self.source_lang}->{self.target_lang})>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("chat_rooms.id"), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    original_text = Column(Text, nullable=True)
    translated_text = Column(Text, nullable=True)
    detected_lang = Column(String, nullable=True)
    message_type = Column(String, nullable=False, default="text")
    audio_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft", index=True)
    cultural_footnotes = Column(Text, nullable=True)
    tts_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")

    def __repr__(self) -> str:
        return f"<Message {self.id} room={self.room_id} status={self.status}>"