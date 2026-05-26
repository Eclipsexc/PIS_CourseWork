from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, JSON

from sqlalchemy.orm import relationship

from datetime import datetime

from ..core.database import Base


class VideoAnalysis(Base):

    __tablename__ = "video_analyses"


    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(Integer, ForeignKey("session_attempts.id"), nullable=False)

    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=True)

    status = Column(String(32), default="pending", nullable=False)

    duration_seconds = Column(Float)

    frame_count = Column(Integer)

    fps = Column(Float)

    resolution_width = Column(Integer)

    resolution_height = Column(Integer)

    face_presence_ratio = Column(Float)

    estimated_blink_count = Column(Integer)

    blink_rate_per_minute = Column(Float)

    gaze_offscreen_ratio = Column(Float)

    brightness_score = Column(Float)

    blur_score = Column(Float)

    quality_score = Column(Float)

    speaking_activity_ratio = Column(Float)

    speaking_stability = Column(Float)

    confidence_heuristic = Column(Float)

    warnings = Column(JSON)

    recommendations = Column(JSON)

    feedback_text = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


    attempt = relationship("SessionAttempt", back_populates="video_analyses")

    answer = relationship("Answer", back_populates="video_analyses")

