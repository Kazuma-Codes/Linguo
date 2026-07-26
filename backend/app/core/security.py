from datetime import datetime,timedelta
from jose import JWTError,jwt
import bcrypt
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import User

def verify_password(plain_password:str,hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'),hashed_password.encode('utf-8'))

def get_password_hash(password  : str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'),salt).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

#decode the user's email
def decode_token(token : str):
    try:
        payload = jwt.decode( # gets the token, secret_key and algorithm form config
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
            )
        email: str = payload.get("sub")
        if email is None:
            return None
        return email # return the email
    except JWTError:
        return None
    
