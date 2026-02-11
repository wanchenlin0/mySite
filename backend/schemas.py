from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ===== Auth Schemas =====

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str


# ===== Record Schemas =====

class RecordCreate(BaseModel):
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    title: str
    content: str
    tags: Optional[List[str]] = []

class RecordUpdate(BaseModel):
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class RecordResponse(BaseModel):
    id: str
    user_id: str
    date: str
    start_time: Optional[str]
    end_time: Optional[str]
    title: str
    content: str
    tags: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ===== Profile Schemas =====

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    interests: Optional[str] = None
    email: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    company: str
    position: str
    interests: Optional[str]
    email: Optional[str]
    github: Optional[str]
    linkedin: Optional[str]

    class Config:
        from_attributes = True


# ===== LLM Schemas =====

class SummarizeRequest(BaseModel):
    content: str

class SummarizeResponse(BaseModel):
    summary: str
