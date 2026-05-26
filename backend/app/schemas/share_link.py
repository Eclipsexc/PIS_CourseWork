from datetime import datetime

from typing import Optional, List


from pydantic import BaseModel


class ShareLinkCreate(BaseModel):

    access_type: str = "public"

    recipient_email: Optional[str] = None

    expires_at: Optional[datetime] = None


class ShareLinkResponse(BaseModel):

    id: int

    template_id: int

    token: str

    access_type: str

    recipient_email: Optional[str] = None

    expires_at: Optional[datetime] = None

    created_at: datetime


    class Config:

        from_attributes = True


class SharedQuestionResponse(BaseModel):

    id: int

    question_text: str

    question_type: str

    order_index: int

    difficulty: Optional[str] = None

    topic: Optional[str] = None


    class Config:

        from_attributes = True


class SharedTemplateResponse(BaseModel):

    id: int

    owner_id: int

    title: str

    description: Optional[str] = None

    session_type: str

    status: str

    answer_mode: str

    duration_minutes: Optional[int] = None

    allow_pause: bool

    max_attempts: Optional[int] = None

    strict_timer: bool

    deadline: Optional[datetime] = None

    camera_required: bool

    voice_required: bool

    randomized_questions: bool

    questions: List[SharedQuestionResponse] = []

    share: ShareLinkResponse


    class Config:

        from_attributes = True

