from datetime import datetime

from typing import List, Optional


from pydantic import BaseModel


class AttemptSummary(BaseModel):

    id: int

    template_id: int

    template_title: Optional[str] = None

    status: str

    started_at: datetime

    final_score: Optional[float] = None


class ScoreTrendPoint(BaseModel):

    attempt_id: int

    date: datetime

    score: float


class WeakConceptStat(BaseModel):

    concept: str

    count: int


class WeakTopicStat(BaseModel):

    topic: str

    average_score: float


class UserAnalyticsResponse(BaseModel):

    total_attempts: int

    completed_attempts: int

    processing_attempts: int = 0

    new_ready_results_count: int = 0

    average_score: float

    completion_rate: float

    recent_attempts: List[AttemptSummary] = []

    score_trend: List[ScoreTrendPoint] = []

    weak_concepts: List[WeakConceptStat] = []

    weak_topics: List[WeakTopicStat] = []


class MentorTemplateStat(BaseModel):

    template_id: int

    title: str

    session_type: str

    total_attempts: int

    average_score: float


class MentorQuestionStat(BaseModel):

    question_id: int

    question_text: str

    template_id: int

    template_title: Optional[str] = None

    average_score: float


class MentorAnalyticsResponse(BaseModel):

    total_templates: int

    active_invites: int = 0

    total_attempts: int

    attempts_under_review: int

    templates: List[MentorTemplateStat] = []

    hardest_questions: List[MentorQuestionStat] = []

    lowest_average_questions: List[MentorQuestionStat] = []

