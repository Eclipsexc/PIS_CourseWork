from sqlalchemy import Column, Integer, String, DateTime, Enum

from sqlalchemy.orm import relationship

from datetime import datetime

import enum

from ..core.database import Base


class UserRole(str, enum.Enum):

    user = "user"

    mentor = "mentor"


class User(Base):

    __tablename__ = "users"


    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)

    password_hash = Column(String, nullable=False)

    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


    owned_templates = relationship("SessionTemplate", back_populates="owner", foreign_keys="SessionTemplate.owner_id")

    attempts = relationship("SessionAttempt", back_populates="user", foreign_keys="SessionAttempt.user_id")

    mentor_feedbacks = relationship("MentorFeedback", back_populates="mentor", foreign_keys="MentorFeedback.mentor_id")

