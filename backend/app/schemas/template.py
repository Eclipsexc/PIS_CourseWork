from pydantic import BaseModel, Field, field_validator, model_validator

from typing import Optional, List

from datetime import datetime


class QuestionBase(BaseModel):

    question_text: str = Field(..., min_length=5)

    question_type: str = "text_question"

    order_index: int

    difficulty: Optional[str] = None

    topic: Optional[str] = None

    reference_answer: Optional[str] = Field(default=None, min_length=10)

    keywords: Optional[List[str]] = None

    evaluation_criteria: Optional[dict] = None


    @field_validator("question_text", "reference_answer", mode="before")

    @classmethod

    def strip_text_fields(cls, value):

        if isinstance(value, str):

            return value.strip()

        return value


class QuestionCreate(QuestionBase):

    pass


class QuestionResponse(QuestionBase):

    id: int

    template_id: int

    created_at: int


    class Config:

        from_attributes = True


class TemplateBase(BaseModel):

    title: str = Field(..., min_length=1, max_length=255)

    description: Optional[str] = None

    session_type: str

    answer_mode: str = "text"

    duration_minutes: int = Field(..., ge=5, le=60)

    allow_pause: bool = True

    max_attempts: Optional[int] = None

    strict_timer: bool = False

    deadline: Optional[datetime] = None

    camera_required: bool = False

    voice_required: bool = False

    randomized_questions: bool = False


class TemplateCreate(TemplateBase):

    questions: Optional[List[QuestionCreate]] = None


    @model_validator(mode="after")

    def validate_questions(self):

        if not self.questions:

            raise ValueError("Шаблон має містити хоча б одне питання з відповіддю.")


        for index, question in enumerate(self.questions, start=1):

            if not question.question_text or len(question.question_text.strip()) < 5:

                raise ValueError(f"Питання Q{index} має містити щонайменше 5 символів.")

            if not question.reference_answer or len(question.reference_answer.strip()) < 10:

                raise ValueError(f"Відповідь A{index} має містити щонайменше 10 символів.")


        return self


class TemplateCreateWithFile(TemplateBase):

    file_content: str


class TemplateCreateWithAI(TemplateBase):

    prompt: str = Field(..., min_length=10, max_length=2000)

    num_questions: int = Field(..., ge=1, le=10)


class TemplateImportFromPublicUrl(BaseModel):

    url: str = Field(..., min_length=8, max_length=2000)


class ParsedTemplateQuestion(BaseModel):

    question: str

    answer: str


class ParsedTemplateFileResponse(BaseModel):

    questions: List[ParsedTemplateQuestion] = []

    warnings: List[str] = []


class TemplateUpdate(BaseModel):

    title: Optional[str] = None

    description: Optional[str] = None

    status: Optional[str] = None


class TemplateResponse(TemplateBase):

    id: int

    owner_id: int

    status: str

    created_at: datetime

    updated_at: datetime

    questions: List[QuestionResponse] = []

    ai_source: Optional[str] = None

    ai_warning: Optional[str] = None

    ai_diagnostic_code: Optional[str] = None

    ai_provider_warning: Optional[str] = None


    class Config:

        from_attributes = True


class TemplateListResponse(BaseModel):

    id: int

    title: str

    description: Optional[str]

    session_type: str

    status: str

    created_at: datetime


    class Config:

        from_attributes = True

