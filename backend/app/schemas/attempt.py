from pydantic import BaseModel, Field

from typing import Optional, List

from datetime import datetime

from .template import QuestionResponse


class AnswerBase(BaseModel):

    question_id: int

    answer_text: Optional[str] = None

    audio_url: Optional[str] = None

    video_url: Optional[str] = None

    duration_seconds: Optional[int] = None


class AnswerCreate(AnswerBase):

    pass


class AIEvaluationResponse(BaseModel):

    semantic_score: Optional[float] = None

    keyword_score: Optional[float] = None

    structure_score: Optional[float] = None

    completeness_score: Optional[float] = None

    speech_score: Optional[float] = None

    total_score: float

    source: str

    feedback_text: Optional[str] = None

    weak_points: Optional[List[str]] = None

    recommendations: Optional[List[str]] = None

    missing_concepts: Optional[List[str]] = None


    class Config:

        from_attributes = True


class AnswerResponse(AnswerBase):

    id: int

    attempt_id: int

    transcript: Optional[str] = None

    submitted_at: datetime

    ai_evaluation: Optional[AIEvaluationResponse] = None


    class Config:

        from_attributes = True


class AttemptBase(BaseModel):

    template_id: int


class AttemptCreate(AttemptBase):

    share_token: Optional[str] = None


class AttemptTemplateResponse(BaseModel):

    id: int

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


    class Config:

        from_attributes = True


class AttemptMentorFeedbackResponse(BaseModel):

    final_score: float

    comment: Optional[str] = None

    override_reason: Optional[str] = None


    class Config:

        from_attributes = True


class AttemptResponse(BaseModel):

    id: int

    template_id: int

    user_id: int

    status: str

    started_at: datetime

    finished_at: Optional[datetime] = None

    paused_at: Optional[datetime] = None

    paused_duration: int

    total_score: Optional[float] = None

    final_score: Optional[float] = None

    ai_score: Optional[float] = None

    mentor_score: Optional[float] = None

    created_at: datetime

    template: Optional[AttemptTemplateResponse] = None

    mentor_feedback: Optional[AttemptMentorFeedbackResponse] = None


    class Config:

        from_attributes = True


class AttemptDetailResponse(AttemptResponse):

    template: Optional[AttemptTemplateResponse] = None

    questions: List[QuestionResponse] = []

    answers: List[AnswerResponse] = []


    class Config:

        from_attributes = True


class AttemptFinish(BaseModel):

    pass


class AttemptPause(BaseModel):

    pass


class VideoAnalysisCreate(BaseModel):

    video_url: str

    answer_id: Optional[int] = None


class VideoMetricsCreate(BaseModel):

    average_focus_ratio: Optional[float] = Field(default=None, ge=0, le=1)

    average_brightness: Optional[float] = Field(default=None, ge=0, le=1)

    average_blur_score: Optional[float] = Field(default=None, ge=0, le=1)

    average_clarity_score: Optional[float] = Field(default=None, ge=0, le=1)

    estimated_blink_rate: Optional[float] = Field(default=None, ge=0)

    offscreen_ratio: Optional[float] = Field(default=None, ge=0, le=1)

    speaking_activity_ratio: Optional[float] = Field(default=None, ge=0, le=1)

    speaking_stability: Optional[float] = Field(default=None, ge=0, le=1)

    confidence_heuristic: Optional[float] = Field(default=None, ge=0, le=1)

    fps: Optional[float] = Field(default=None, ge=0)

    resolution_width: Optional[int] = Field(default=None, ge=0)

    resolution_height: Optional[int] = Field(default=None, ge=0)

    duration_seconds: Optional[float] = Field(default=None, ge=0)

    warnings: Optional[List[str]] = None

    recommendations: Optional[List[str]] = None


class VideoAnalysisResponse(BaseModel):

    id: int

    attempt_id: int

    answer_id: Optional[int] = None

    status: str

    duration_seconds: Optional[float] = None

    frame_count: Optional[int] = None

    fps: Optional[float] = None

    resolution_width: Optional[int] = None

    resolution_height: Optional[int] = None

    face_presence_ratio: Optional[float] = None

    estimated_blink_count: Optional[int] = None

    blink_rate_per_minute: Optional[float] = None

    gaze_offscreen_ratio: Optional[float] = None

    brightness_score: Optional[float] = None

    blur_score: Optional[float] = None

    quality_score: Optional[float] = None

    speaking_activity_ratio: Optional[float] = None

    speaking_stability: Optional[float] = None

    confidence_heuristic: Optional[float] = None

    warnings: Optional[List[str]] = None

    recommendations: Optional[List[str]] = None

    feedback_text: Optional[str] = None


    class Config:

        from_attributes = True


class AttemptResultQuestion(BaseModel):

    question_id: int

    question_text: str

    answer_text: Optional[str] = None

    reference_answer: Optional[str] = None

    score: float

    semantic_score: float = 0

    keyword_score: float = 0

    completeness_score: float = 0

    structure_score: float = 0

    answer_length_score: float = 0

    reference_coverage_score: float = 0

    concept_coverage_score: float = 0

    clarity_score: float = 0

    weighted_total_score: float = 0

    feedback_text: Optional[str] = None

    missing_concepts: Optional[List[str]] = None

    recommendations: Optional[List[str]] = None

    matched_concepts: Optional[List[str]] = None


class AttemptResultResponse(BaseModel):

    attempt_id: int

    total_score: float

    total_answers: int

    missed_questions: int

    average_semantic_score: float

    average_keyword_score: float

    average_completeness_score: float = 0

    average_structure_score: float = 0

    average_answer_length_score: float = 0

    average_reference_coverage_score: float = 0

    average_concept_coverage_score: float = 0

    average_clarity_score: float = 0

    video_metrics: Optional[VideoAnalysisResponse] = None

    overall_recommendation: Optional[str] = None

    weak_points: List[str] = []

    recommendations: List[str] = []

    questions: List[AttemptResultQuestion] = []

