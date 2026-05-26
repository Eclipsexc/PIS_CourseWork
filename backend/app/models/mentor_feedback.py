from sqlalchemy import Column, Integer, Text, ForeignKey, Float, DateTime

from sqlalchemy.orm import relationship

from datetime import datetime

from ..core.database import Base


class MentorFeedback(Base):

    __tablename__ = "mentor_feedbacks"


    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(Integer, ForeignKey("session_attempts.id"), nullable=False)

    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    final_score = Column(Float, nullable=False)

    comment = Column(Text)

    override_reason = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    attempt = relationship("SessionAttempt", back_populates="mentor_feedback")

    mentor = relationship("User", back_populates="mentor_feedbacks", foreign_keys=[mentor_id])

