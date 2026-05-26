from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime

from sqlalchemy.orm import relationship

from datetime import datetime

from ..core.database import Base


class Answer(Base):

    __tablename__ = "answers"


    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(Integer, ForeignKey("session_attempts.id"), nullable=False)

    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)

    answer_text = Column(Text)

    audio_url = Column(String(500))

    video_url = Column(String(500))

    transcript = Column(Text)

    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    duration_seconds = Column(Integer)


    attempt = relationship("SessionAttempt", back_populates="answers")

    question = relationship("Question", back_populates="answers")

    ai_evaluation = relationship("AIEvaluation", back_populates="answer", uselist=False)

    video_analyses = relationship("VideoAnalysis", back_populates="answer", cascade="all, delete-orphan")

