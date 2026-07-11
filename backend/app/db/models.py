import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship 
from datetime import datetime
from app.db.base import Base 

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    email = Column(String,unique=True,index= True,nullable=False)
    #hashed
    hashed_password = Column(String,nullable=False)
    is_active = Column(Boolean,default= True)
    rooms_created = relationship("ChatRoom", foreign_keys="ChatRoom.creator_id", back_populates="creator")

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id = Column(UUID(as_uuid=True),primary_key=True,default = uuid.uuid4)
    title  = Column(String,nullable=True)
    source_lang = Column(String,default= "en")

    target_lang = Column(String,default="es")
    creator_id = Column()
    creator_at = Column()

    creator  = relationship("User",foreign_keys=[creator_id],back_populates="rooms_created")
    message  = relationship("Message",back_populates="room",cascade="all,delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True),ForeignKey("chat_rooms.id"))
    sender_id = Column(UUID(as_uuid=True),ForeignKey("users.id"))
    original_text = Column(Text,nullable=False)
    translated_text = Column(Text,nullable=True)
    detected_lang = Column(String,nullable=True)
    created_at = Column(DateTime,default=datetime.utcnow)
    # this connects the chatrom and messages
    room = relationship("ChatRoom",back_populates="messages")