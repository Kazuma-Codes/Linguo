# groups related endpoint and include them in FastAPI
from fastapi import APIRouter,Depends

from sqlalchemy.orm import Session
#base model for defining request or response schemas with automatic validation
from pydantic import BaseModel, ConfigDict
# used to type the id
from uuid import UUID
# 
from app.api.deps import get_db,get_current_user
from app.db.models import ChatRoom,User 

router = APIRouter()

class RoomCreate(BaseModel):
    title: str
    target_lang: str 

class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID 
    title: str 
    target_lang: str

@router.post("/rooms",response_model=RoomResponse)
def create_room(room_in: RoomCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = ChatRoom(creator_id=current_user.id, title=room_in.title, target_lang=room_in.target_lang)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room