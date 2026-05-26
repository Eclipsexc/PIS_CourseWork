from pydantic import BaseModel

from typing import Optional, List


class MentorFeedbackCreate(BaseModel):

    final_score: float

    comment: Optional[str] = None

    override_reason: Optional[str] = None


class MentorFeedbackResponse(BaseModel):

    id: int

    attempt_id: int

    mentor_id: int

    final_score: float

    comment: Optional[str] = None

    override_reason: Optional[str] = None


    class Config:

        from_attributes = True


class AIEvaluationResponse(BaseModel):

    id: int

    answer_id: int

    semantic_score: Optional[float] = None

    keyword_score: Optional[float] = None

    structure_score: Optional[float] = None

    completeness_score: Optional[float] = None

    speech_score: Optional[float] = None

    total_score: float

    source: Optional[str] = None

    feedback_text: Optional[str] = None

    weak_points: Optional[List[str]] = None

    recommendations: Optional[List[str]] = None

    missing_concepts: Optional[List[str]] = None


    class Config:

        from_attributes = True

