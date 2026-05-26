from __future__ import annotations


import base64


from fastapi import FastAPI, HTTPException


from .schemas import (

    AudioRequest,

    ConceptsRequest,

    DetailedFeedbackRequest,

    EvaluateAnswerRequest,

    ExtractTextRequest,

    GenerateTemplateRequest,

    ParseTemplateTextRequest,

    TextRequest,

    VideoRequest,

)

from .services.analysis import AIMLServiceCore


app = FastAPI(title="PrepAI AI/ML Service", version="1.0.0")


@app.get("/health")

def health() -> dict:

    return {"status": "ok", "service": "ai_ml_service"}


@app.post("/evaluate-answer")

def evaluate_answer(payload: EvaluateAnswerRequest) -> dict:

    return AIMLServiceCore.evaluate_answer(

        answer_text=payload.answer_text,

        reference_answer=payload.reference_answer,

        keywords=payload.keywords,

    )


@app.post("/tokenize")

def tokenize(payload: TextRequest) -> dict:

    return {"tokens": AIMLServiceCore.tokenize(payload.text)}


@app.post("/answer-length-score")

def answer_length_score(payload: EvaluateAnswerRequest) -> dict:

    return {

        "score": AIMLServiceCore.answer_length_score(

            payload.answer_text,

            payload.reference_answer,

        )

    }


@app.post("/reference-coverage-score")

def reference_coverage_score(payload: EvaluateAnswerRequest) -> dict:

    return {

        "score": AIMLServiceCore.reference_coverage_score(

            payload.answer_text,

            payload.reference_answer,

        )

    }


@app.post("/matched-concepts")

def matched_concepts(payload: ConceptsRequest) -> dict:

    return {

        "concepts": AIMLServiceCore.matched_concepts(

            payload.answer_text,

            payload.keywords,

            payload.reference_answer,

        )

    }


@app.post("/detailed-feedback")

def detailed_feedback(payload: DetailedFeedbackRequest) -> dict:

    return {

        "feedback": AIMLServiceCore.detailed_feedback(

            answer_text=payload.answer_text,

            reference_answer=payload.reference_answer,

            matched_concepts=payload.matched_concepts,

            missing_concepts=payload.missing_concepts,

            semantic_score=payload.semantic_score,

            keyword_score=payload.keyword_score,

            completeness_score=payload.completeness_score,

            structure_score=payload.structure_score,

            original_feedback=payload.original_feedback,

        )

    }


@app.post("/transcribe-audio")

def transcribe_audio(payload: AudioRequest) -> dict:

    return {"transcript": AIMLServiceCore.transcribe_audio(payload.audio_url)}


@app.post("/analyze-video")

def analyze_video(payload: VideoRequest) -> dict:

    return AIMLServiceCore.analyze_video(payload.video_url)


@app.post("/generate-template")

async def generate_template(payload: GenerateTemplateRequest) -> dict:

    return await AIMLServiceCore.generate_template(payload.prompt, payload.num_questions)


@app.post("/extract-text")

def extract_text(payload: ExtractTextRequest) -> dict:

    try:

        content = base64.b64decode(payload.content_base64)

    except Exception as exc:

        raise HTTPException(status_code=400, detail="Invalid base64 file content.") from exc


    filename = payload.filename.lower()

    if filename.endswith(".pdf"):

        text = AIMLServiceCore.extract_text_from_pdf(content)

    elif filename.endswith(".txt"):

        text = AIMLServiceCore.extract_text_from_txt(content)

    else:

        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")


    return {"text": text}


@app.post("/parse-template-text")

def parse_template_text(payload: ParseTemplateTextRequest) -> dict:

    return AIMLServiceCore.parse_qa_text(payload.content)


