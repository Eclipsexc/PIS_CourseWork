from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum

from sqlalchemy.orm import relationship

from datetime import datetime

import enum

from ..core.database import Base


class AccessType(str, enum.Enum):

    public = "public"

    private = "private"


class ShareLink(Base):

    __tablename__ = "share_links"


    id = Column(Integer, primary_key=True, index=True)

    template_id = Column(Integer, ForeignKey("session_templates.id"), nullable=False)

    token = Column(String(255), unique=True, index=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    recipient_email = Column(String(255))

    expires_at = Column(DateTime)

    access_type = Column(Enum(AccessType), default=AccessType.public, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    template = relationship("SessionTemplate", back_populates="share_links")

    creator = relationship("User", foreign_keys=[created_by])

