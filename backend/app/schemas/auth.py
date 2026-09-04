from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthenticatedUserResponse(BaseModel):
    id: str
    username: str
    role: str

class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str
    user: AuthenticatedUserResponse
