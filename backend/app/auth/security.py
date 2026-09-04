from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
import secrets
from jose import jwt
from passlib.context import CryptContext
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], username: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "username": username,
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

# ---------------------------------------------------------------------------
# Device API Key helpers
# ---------------------------------------------------------------------------

def generate_device_api_key() -> str:
    """Generate a cryptographically-secure URL-safe token (256-bit entropy)."""
    return secrets.token_urlsafe(32)

def hash_device_api_key(plain_key: str) -> str:
    """Hash device API key with bcrypt — identical mechanism to password hashing."""
    return pwd_context.hash(plain_key)

def verify_device_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verify a plaintext device key against its stored bcrypt hash."""
    return pwd_context.verify(plain_key, hashed_key)
