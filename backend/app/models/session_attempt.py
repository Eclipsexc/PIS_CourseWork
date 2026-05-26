from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float

from sqlalchemy.orm import relationship

from datetime import datetime

import enum

from ..core.database import Base


class AttemptStatus(str, enum.Enum):

    active = "active"

    in_progress = "in_progress"

    paused = "paused"

    processing = "processing"

    completed = "completed"

    failed = "failed"

    cancelled = "cancelled"

    under_review = "under_review"

    reviewed = "reviewed"

    expired = "expired"

    auto_submitted = "auto_submitted"


class SessionAttempt(Base):

    __tablename__ = "session_attempts"


    id = Column(Integer, primary_key=True, index=True)

    template_id = Column(Integer, ForeignKey("session_templates.id"), nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(AttemptStatus), default=AttemptStatus.active, nullable=False)

    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    finished_at = Column(DateTime)

    paused_at = Column(DateTime)

    paused_duration = Column(Integer, default=0)

    total_score = Column(Float)

    final_score = Column(Float)

    ai_score = Column(Float)

    mentor_score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    template = relationship("SessionTemplate", back_populates="attempts")

    user = relationship("User", back_populates="attempts", foreign_keys=[user_id])

    answers = relationship("Answer", back_populates="attempt", cascade="all, delete-orphan")

    mentor_feedback = relationship("MentorFeedback", back_populates="attempt", uselist=False, cascade="all, delete-orphan")

    video_analyses = relationship("VideoAnalysis", back_populates="attempt", cascade="all, delete-orphan")

