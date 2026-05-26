from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, JSON

from sqlalchemy.orm import relationship

from datetime import datetime

import enum

from ..core.database import Base


class QuestionType(str, enum.Enum):

    text_question = "text_question"

    oral_question = "oral_question"

    coding_question = "coding_question"


class Question(Base):

    __tablename__ = "questions"


    id = Column(Integer, primary_key=True, index=True)

    template_id = Column(Integer, ForeignKey("session_templates.id"), nullable=False)

    question_text = Column(Text, nullable=False)

    question_type = Column(Enum(QuestionType), default=QuestionType.text_question, nullable=False)

    order_index = Column(Integer, nullable=False)

    difficulty = Column(String(50))

    topic = Column(String(255))

    reference_answer = Column(Text)

    keywords = Column(JSON)

    evaluation_criteria = Column(JSON)

    created_at = Column(Integer, default=lambda: int(datetime.utcnow().timestamp()))


    template = relationship("SessionTemplate", back_populates="questions")

    answers = relationship("Answer", back_populates="question")

