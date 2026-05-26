import base64


from sqlalchemy.orm import Session

from typing import List, Optional

from datetime import datetime, timedelta

from ..models import AccessType, SessionTemplate, Question, ShareLink, TemplateStatus, AIGenerationUsage, AIGenerationCache

from ..schemas.template import TemplateBase, TemplateCreate, TemplateUpdate

from ..services.ai_ml_service import AIMLService

from fastapi import HTTPException, status

import logging

import copy

import hashlib

import json


logger = logging.getLogger(__name__)

ai_ml_client = AIMLService


class TemplateService:

    """Service for managing session templates"""


    AI_GENERATION_LIMIT = 5

    AI_GENERATION_WINDOW_MINUTES = 60


    @staticmethod

    async def parse_template_file_upload(file) -> dict:

        filename = (file.filename or "").lower()

        if not (filename.endswith(".txt") or filename.endswith(".pdf")):

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Підтримуються тільки .txt та .pdf файли."

            )


        content = await file.read()

        if not content:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Файл порожній."

            )


        try:

            extracted_text = await ai_ml_client.extract_text(

                file.filename or "template.txt",

                base64.b64encode(content).decode("ascii"),

            )

            parsed = await ai_ml_client.parse_template_text(extracted_text)

        except Exception as exc:

            logger.exception("Template file parsing failed")

            raise HTTPException(

                status_code=status.HTTP_502_BAD_GATEWAY,

                detail=f"Не вдалося обробити файл через AI/ML сервіс: {exc}"

            )


        errors = parsed.get("errors") or []

        if errors:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail=errors[0]

            )


        questions = parsed.get("questions") or []

        if not questions:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Не знайдено жодної пари Q/A."

            )


        return {"questions": questions, "warnings": []}


    @staticmethod

    def build_generation_cache_key(prompt: str, num_questions: int, session_type: str) -> tuple[str, str]:

        normalized_prompt = " ".join((prompt or "").strip().lower().split())

        payload = {

            "prompt": normalized_prompt,

            "num_questions": num_questions,

            "session_type": session_type,

            "language": "uk",

        }

        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True)

        return hashlib.sha256(serialized.encode("utf-8")).hexdigest(), normalized_prompt


    @staticmethod

    def enforce_ai_generation_limit(db: Session, user_id: int) -> None:

        now = datetime.utcnow()

        window_start = now - timedelta(minutes=TemplateService.AI_GENERATION_WINDOW_MINUTES)


        recent_requests = db.query(AIGenerationUsage).filter(

            AIGenerationUsage.user_id == user_id,

            AIGenerationUsage.created_at >= window_start

        ).order_by(AIGenerationUsage.created_at.asc()).all()


        if len(recent_requests) >= TemplateService.AI_GENERATION_LIMIT:

            reset_at = recent_requests[0].created_at + timedelta(minutes=TemplateService.AI_GENERATION_WINDOW_MINUTES)

            retry_after_seconds = max(1, int((reset_at - now).total_seconds()))

            retry_minutes = max(1, int((retry_after_seconds + 59) / 60))

            raise HTTPException(

                status_code=status.HTTP_429_TOO_MANY_REQUESTS,

                detail=(

                    f"Ліміт AI-генерацій вичерпано: {TemplateService.AI_GENERATION_LIMIT} запитів на годину. "

                    f"Спробуй знову приблизно через {retry_minutes} хв."

                ),

                headers={"Retry-After": str(retry_after_seconds)}

            )


        db.add(AIGenerationUsage(user_id=user_id, created_at=now))

        db.commit()


    @staticmethod

    def create_template(

        db: Session,

        template_data: TemplateCreate,

        owner_id: int

    ) -> SessionTemplate:

        """Create a new template"""

        if not template_data.questions:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Шаблон має містити хоча б одне питання з відповіддю."

            )


        template = SessionTemplate(

            owner_id=owner_id,

            title=template_data.title,

            description=template_data.description,

            session_type=template_data.session_type,

            answer_mode=template_data.answer_mode,

            duration_minutes=template_data.duration_minutes,

            allow_pause=template_data.allow_pause,

            max_attempts=template_data.max_attempts,

            strict_timer=template_data.strict_timer,

            deadline=template_data.deadline,

            camera_required=template_data.camera_required,

            voice_required=template_data.voice_required,

            randomized_questions=template_data.randomized_questions,

            status=TemplateStatus.ready

        )

        db.add(template)

        db.commit()

        db.refresh(template)


        if template_data.questions:

            for q_data in template_data.questions:

                question = Question(

                    template_id=template.id,

                    question_text=q_data.question_text,

                    question_type=q_data.question_type,

                    order_index=q_data.order_index,

                    difficulty=q_data.difficulty,

                    topic=q_data.topic,

                    reference_answer=q_data.reference_answer,

                    keywords=q_data.keywords,

                    evaluation_criteria=q_data.evaluation_criteria

                )

                db.add(question)

            db.commit()

            db.refresh(template)


        return template


    @staticmethod

    async def create_template_with_ai(

        db: Session,

        prompt: str,

        num_questions: int,

        template_data: TemplateBase,

        owner_id: int

    ) -> SessionTemplate:

        """Create template using AI generation"""

        prompt_hash, normalized_prompt = TemplateService.build_generation_cache_key(

            prompt=prompt,

            num_questions=num_questions,

            session_type=template_data.session_type,

        )

        TemplateService.enforce_ai_generation_limit(db, owner_id)


        cached_generation = db.query(AIGenerationCache).filter(

            AIGenerationCache.prompt_hash == prompt_hash

        ).first()


        if cached_generation:

            ai_response = copy.deepcopy(cached_generation.response_json)

            ai_response["source"] = "cache"

            ai_response["warning"] = "Використано раніше згенерований шаблон."

            ai_response["diagnostic_code"] = None

            logger.info("AI template generation served from cache: prompt_hash=%s", prompt_hash)

        else:

            try:

                ai_response = await ai_ml_client.generate_template(prompt, num_questions)

            except Exception as exc:

                raise HTTPException(

                    status_code=status.HTTP_502_BAD_GATEWAY,

                    detail=f"AI service unavailable or returned an error: {str(exc)}"

                )


            db.add(AIGenerationCache(

                prompt_hash=prompt_hash,

                prompt_text=normalized_prompt,

                num_questions=num_questions,

                session_type=template_data.session_type,

                response_json=ai_response,

                source=ai_response.get("source") or "ai_ml_service",

            ))

            db.commit()


        ai_source = ai_response.get("source") or "unknown"

        ai_warning = ai_response.get("warning") or ai_response.get("provider_warning")

        ai_diagnostic_code = ai_response.get("diagnostic_code")

        if ai_source != "gemini":

            logger.warning(

                "AI template generation used fallback: source=%s, diagnostic_code=%s, warning=%s",

                ai_source,

                ai_diagnostic_code,

                ai_warning,

            )

        else:

            logger.info("AI template generation succeeded with Gemini: questions=%s", len(ai_response.get("questions", [])))


        template = SessionTemplate(

            owner_id=owner_id,

            title=template_data.title,

            description=template_data.description,

            session_type=template_data.session_type,

            answer_mode=template_data.answer_mode,

            duration_minutes=max(5, min(60, ai_response.get("recommended_duration", template_data.duration_minutes))),

            allow_pause=template_data.allow_pause,

            max_attempts=template_data.max_attempts,

            strict_timer=template_data.strict_timer,

            deadline=template_data.deadline,

            camera_required=template_data.camera_required,

            voice_required=template_data.voice_required,

            randomized_questions=template_data.randomized_questions,

            status=TemplateStatus.ready

        )

        db.add(template)

        db.commit()

        db.refresh(template)


        for idx, q in enumerate(ai_response.get("questions", [])):

            question = Question(

                template_id=template.id,

                question_text=q["question_text"],

                question_type=q.get("question_type", "text_question"),

                order_index=idx,

                difficulty=q.get("difficulty"),

                topic=q.get("topic"),

                reference_answer=q.get("reference_answer"),

                keywords=q.get("keywords"),

                evaluation_criteria=q.get("evaluation_criteria")

            )

            db.add(question)


        db.commit()

        db.refresh(template)

        template.ai_source = ai_source

        template.ai_warning = ai_warning

        template.ai_diagnostic_code = ai_diagnostic_code

        template.ai_provider_warning = ai_warning

        return template


    @staticmethod

    def get_template(db: Session, template_id: int) -> Optional[SessionTemplate]:

        """Get template by ID"""

        return db.query(SessionTemplate).filter(SessionTemplate.id == template_id).first()


    @staticmethod

    def get_user_templates(

        db: Session,

        user_id: int,

        skip: int = 0,

        limit: int = 100

    ) -> List[SessionTemplate]:

        """Get all templates owned by user"""

        return db.query(SessionTemplate).filter(

            SessionTemplate.owner_id == user_id

        ).offset(skip).limit(limit).all()


    @staticmethod

    def import_from_public_share(db: Session, token: str, owner_id: int) -> SessionTemplate:

        share_link = db.query(ShareLink).filter(ShareLink.token == token).first()

        if not share_link or share_link.access_type != AccessType.public:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Публічний шаблон за цим посиланням не знайдено."

            )


        source = share_link.template

        if not source:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Шаблон для цього посилання більше не існує."

            )


        template = SessionTemplate(

            owner_id=owner_id,

            title=f"{source.title} (імпорт)",

            description=source.description,

            session_type=source.session_type,

            answer_mode=source.answer_mode,

            duration_minutes=source.duration_minutes,

            allow_pause=source.allow_pause,

            max_attempts=source.max_attempts,

            strict_timer=source.strict_timer,

            deadline=source.deadline,

            camera_required=source.camera_required,

            voice_required=source.voice_required,

            randomized_questions=source.randomized_questions,

            status=TemplateStatus.ready,

        )

        db.add(template)

        db.commit()

        db.refresh(template)


        for source_question in sorted(source.questions, key=lambda item: item.order_index):

            db.add(Question(

                template_id=template.id,

                question_text=source_question.question_text,

                question_type=source_question.question_type,

                order_index=source_question.order_index,

                difficulty=source_question.difficulty,

                topic=source_question.topic,

                reference_answer=source_question.reference_answer,

                keywords=source_question.keywords,

                evaluation_criteria=source_question.evaluation_criteria,

            ))


        db.commit()

        db.refresh(template)

        return template


    @staticmethod

    def update_template(

        db: Session,

        template_id: int,

        template_data: TemplateUpdate,

        user_id: int

    ) -> SessionTemplate:

        """Update template"""

        template = db.query(SessionTemplate).filter(

            SessionTemplate.id == template_id,

            SessionTemplate.owner_id == user_id

        ).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found"

            )


        if template.status == TemplateStatus.locked:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Cannot edit locked template"

            )


        if template_data.title is not None:

            template.title = template_data.title

        if template_data.description is not None:

            template.description = template_data.description

        if template_data.status is not None:

            template.status = template_data.status


        template.updated_at = datetime.utcnow()

        db.commit()

        db.refresh(template)

        return template


    @staticmethod

    def delete_template(db: Session, template_id: int, user_id: int) -> bool:

        """Delete template"""

        template = db.query(SessionTemplate).filter(

            SessionTemplate.id == template_id,

            SessionTemplate.owner_id == user_id

        ).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found"

            )


        if template.status == TemplateStatus.locked:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Cannot delete locked template"

            )


        db.delete(template)

        db.commit()

        return True


    @staticmethod

    def set_template_ready(db: Session, template_id: int, user_id: int) -> SessionTemplate:

        """Set template status to ready"""

        template = db.query(SessionTemplate).filter(

            SessionTemplate.id == template_id,

            SessionTemplate.owner_id == user_id

        ).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found"

            )


        questions_count = db.query(Question).filter(Question.template_id == template_id).count()

        if questions_count == 0:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Template must have at least one question"

            )


        template.status = TemplateStatus.ready

        db.commit()

        db.refresh(template)

        return template

