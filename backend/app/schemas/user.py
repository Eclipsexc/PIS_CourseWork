from pydantic import BaseModel, EmailStr, Field

from typing import Literal, Optional

from datetime import datetime


class UserBase(BaseModel):

    email: EmailStr

    full_name: str


class UserCreate(UserBase):

    password: str = Field(..., min_length=6)

    role: Literal["user", "mentor"] = "user"


class UserLogin(BaseModel):

    email: EmailStr

    password: str


class UserResponse(UserBase):

    id: int

    role: str

    created_at: datetime


    class Config:

        from_attributes = True


class Token(BaseModel):

    access_token: str

    token_type: str


class TokenData(BaseModel):

    user_id: Optional[int] = None

