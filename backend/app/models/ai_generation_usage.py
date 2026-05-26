from sqlalchemy import Column, Integer, DateTime, ForeignKey

from datetime import datetime

from ..core.database import Base


class AIGenerationUsage(Base):

    __tablename__ = "ai_generation_usage"


    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

