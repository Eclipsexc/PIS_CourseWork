from __future__ import annotations


from typing import List, Optional


from pydantic import BaseModel


class EvaluateAnswerRequest(BaseModel):

    answer_text: Optional[str] = None

    reference_answer: Optional[str] = None

    keywords: Optional[List[str]] = None


class TextRequest(BaseModel):

    text: Optional[str] = None


class ConceptsRequest(BaseModel):

    answer_text: Optional[str] = None

    keywords: Optional[List[str]] = None

    reference_answer: Optional[str] = None


class DetailedFeedbackRequest(BaseModel):

    answer_text: Optional[str] = None

    reference_answer: Optional[str] = None

    matched_concepts: Optional[List[str]] = None

    missing_concepts: Optional[List[str]] = None

    semantic_score: float = 0

    keyword_score: float = 0

    completeness_score: float = 0

    structure_score: float = 0

    original_feedback: Optional[str] = None


class AudioRequest(BaseModel):

    audio_url: str


class VideoRequest(BaseModel):

    video_url: str


class GenerateTemplateRequest(BaseModel):

    prompt: str

    num_questions: int


class ExtractTextRequest(BaseModel):

    filename: str

    content_base64: str


class ParseTemplateTextRequest(BaseModel):

    content: str


