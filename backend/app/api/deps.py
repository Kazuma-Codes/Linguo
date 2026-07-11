#dependency injection

from fastapi import Depends,HTTPException,status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_db():
    db = SessionLocal() # a real session object is created
    # can now do things like db.add(user)
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail= "could not validate credentials",
        headers={"WWW-Authenticate":"Bearer"},
    )
    email = decode_token(token)
    if email is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user 
