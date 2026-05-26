from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, JSON

from sqlalchemy.orm import relationship

from datetime import datetime

from ..core.database import Base


class AIEvaluation(Base):

    __tablename__ = "ai_evaluations"


    id = Column(Integer, primary_key=True, index=True)

    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=False)

    semantic_score = Column(Float)

    keyword_score = Column(Float)

    structure_score = Column(Float)

    completeness_score = Column(Float)

    speech_score = Column(Float)

    total_score = Column(Float, nullable=False)

    source = Column(String(100), default="local_embedding", nullable=False)

    feedback_text = Column(Text)

    weak_points = Column(JSON)

    recommendations = Column(JSON)

    missing_concepts = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    answer = relationship("Answer", back_populates="ai_evaluation")

