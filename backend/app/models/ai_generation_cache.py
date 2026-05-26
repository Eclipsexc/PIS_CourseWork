from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, UniqueConstraint

from datetime import datetime

from ..core.database import Base


class AIGenerationCache(Base):

    __tablename__ = "ai_generation_cache"


    id = Column(Integer, primary_key=True, index=True)

    prompt_hash = Column(String(64), nullable=False, unique=True, index=True)

    prompt_text = Column(Text, nullable=False)

    num_questions = Column(Integer, nullable=False)

    session_type = Column(String(50), nullable=False)

    response_json = Column(JSON, nullable=False)

    source = Column(String(50), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    __table_args__ = (

        UniqueConstraint("prompt_hash", name="uq_ai_generation_cache_prompt_hash"),

    )

