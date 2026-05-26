from __future__ import annotations


import logging

from typing import Dict, List, Optional


import httpx


from ..core.config import settings


logger = logging.getLogger(__name__)


class AIMLService:

    """Thin backend client for the standalone ai_ml_service.

    Domain scoring, transcript hooks, text extraction and video-analysis hooks
    live in the top-level ai_ml_service app. The API backend only coordinates
    persistence and calls this client.
    """


    @classmethod

    def _post(cls, path: str, payload: dict) -> dict:

        base_url = settings.AI_ML_SERVICE_URL.rstrip("/")

        timeout = settings.AI_ML_SERVICE_TIMEOUT_SECONDS

        with httpx.Client(timeout=timeout) as client:

            response = client.post(f"{base_url}{path}", json=payload)

            response.raise_for_status()

            return response.json()


    @classmethod

    def tokenize(cls, text: Optional[str]) -> List[str]:

        return cls._post("/tokenize", {"text": text}).get("tokens", [])


    @classmethod

    def answer_length_score(cls, answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        return float(cls._post("/answer-length-score", {

            "answer_text": answer_text,

            "reference_answer": reference_answer,

        }).get("score", 0))


    @classmethod

    def reference_coverage_score(cls, answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        return float(cls._post("/reference-coverage-score", {

            "answer_text": answer_text,

            "reference_answer": reference_answer,

        }).get("score", 0))


    @classmethod

    def matched_concepts(

        cls,

        answer_text: Optional[str],

        keywords: Optional[list],

        reference_answer: Optional[str],

    ) -> List[str]:

        return cls._post("/matched-concepts", {

            "answer_text": answer_text,

            "keywords": keywords,

            "reference_answer": reference_answer,

        }).get("concepts", [])


    @classmethod

    def detailed_feedback(

        cls,

        answer_text: Optional[str],

        reference_answer: Optional[str],

        matched_concepts: Optional[List[str]],

        missing_concepts: Optional[List[str]],

        semantic_score: float,

        keyword_score: float,

        completeness_score: float,

        structure_score: float,

        original_feedback: Optional[str] = None,

    ) -> str:

        return cls._post("/detailed-feedback", {

            "answer_text": answer_text,

            "reference_answer": reference_answer,

            "matched_concepts": matched_concepts,

            "missing_concepts": missing_concepts,

            "semantic_score": semantic_score,

            "keyword_score": keyword_score,

            "completeness_score": completeness_score,

            "structure_score": structure_score,

            "original_feedback": original_feedback,

        }).get("feedback", "")


    @classmethod

    def evaluate_answer(

        cls,

        answer_text: Optional[str],

        reference_answer: Optional[str],

        keywords: Optional[list] = None,

    ) -> Dict:

        return cls._post("/evaluate-answer", {

            "answer_text": answer_text,

            "reference_answer": reference_answer,

            "keywords": keywords,

        })


    @classmethod

    def transcribe_audio(cls, audio_url: str) -> str:

        return cls._post("/transcribe-audio", {"audio_url": audio_url}).get("transcript", "")


    @classmethod

    def analyze_video(cls, video_url: str) -> Dict:

        return cls._post("/analyze-video", {"video_url": video_url})


    @classmethod

    async def generate_template(cls, prompt: str, num_questions: int) -> Dict:

        base_url = settings.AI_ML_SERVICE_URL.rstrip("/")

        timeout = settings.AI_ML_SERVICE_TIMEOUT_SECONDS

        async with httpx.AsyncClient(timeout=timeout) as client:

            response = await client.post(

                f"{base_url}/generate-template",

                json={"prompt": prompt, "num_questions": num_questions},

            )

            response.raise_for_status()

            return response.json()


    @classmethod

    async def extract_text(cls, filename: str, content_base64: str) -> str:

        base_url = settings.AI_ML_SERVICE_URL.rstrip("/")

        timeout = settings.AI_ML_SERVICE_TIMEOUT_SECONDS

        async with httpx.AsyncClient(timeout=timeout) as client:

            response = await client.post(

                f"{base_url}/extract-text",

                json={"filename": filename, "content_base64": content_base64},

            )

            response.raise_for_status()

            return response.json().get("text", "")


    @classmethod

    async def parse_template_text(cls, content: str) -> Dict:

        base_url = settings.AI_ML_SERVICE_URL.rstrip("/")

        timeout = settings.AI_ML_SERVICE_TIMEOUT_SECONDS

        async with httpx.AsyncClient(timeout=timeout) as client:

            response = await client.post(

                f"{base_url}/parse-template-text",

                json={"content": content},

            )

            response.raise_for_status()

            return response.json()

