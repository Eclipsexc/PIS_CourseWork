from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean, ForeignKey

from sqlalchemy.orm import relationship

from datetime import datetime

import enum

from ..core.database import Base


class SessionType(str, enum.Enum):

    practice = "practice"

    assessment = "assessment"


class TemplateStatus(str, enum.Enum):

    draft = "draft"

    ready = "ready"

    locked = "locked"

    archived = "archived"


class AnswerMode(str, enum.Enum):

    text = "text"

    voice = "voice"

    voice_video = "voice_video"


class SessionTemplate(Base):

    __tablename__ = "session_templates"


    id = Column(Integer, primary_key=True, index=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)

    description = Column(Text)

    session_type = Column(Enum(SessionType), nullable=False)

    status = Column(Enum(TemplateStatus), default=TemplateStatus.draft, nullable=False)

    answer_mode = Column(Enum(AnswerMode), default=AnswerMode.text, nullable=False)

    duration_minutes = Column(Integer)

    allow_pause = Column(Boolean, default=True)

    max_attempts = Column(Integer)

    strict_timer = Column(Boolean, default=False)

    deadline = Column(DateTime)

    camera_required = Column(Boolean, default=False)

    voice_required = Column(Boolean, default=False)

    randomized_questions = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


    owner = relationship("User", back_populates="owned_templates", foreign_keys=[owner_id])

    questions = relationship("Question", back_populates="template", cascade="all, delete-orphan")

    attempts = relationship("SessionAttempt", back_populates="template", cascade="all, delete-orphan")

    share_links = relationship("ShareLink", back_populates="template", cascade="all, delete-orphan")

