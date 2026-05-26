from sqlalchemy.orm import Session, joinedload, selectinload

from typing import List, Optional

from datetime import datetime

from ..models import SessionAttempt, SessionTemplate, Answer, Question, AIEvaluation, AttemptStatus, TemplateStatus, User, UserRole, VideoAnalysis, SessionType

from ..schemas.attempt import AttemptCreate, AnswerCreate, VideoMetricsCreate

from ..services.share_link_service import ShareLinkService

from ..services.ai_ml_service import AIMLService

from ..core.database import SessionLocal

from fastapi import HTTPException, status

from collections import Counter


class AttemptService:

    """Service for managing session attempts"""


    @staticmethod

    def create_attempt(

        db: Session,

        attempt_data: AttemptCreate,

        user_id: int

    ) -> SessionAttempt:

        """Create a new attempt"""


        template = db.query(SessionTemplate).filter(

            SessionTemplate.id == attempt_data.template_id

        ).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found"

            )


        current_user = db.query(User).filter(User.id == user_id).first()


        if template.owner_id != user_id:

            if not attempt_data.share_token:

                raise HTTPException(

                    status_code=status.HTTP_403_FORBIDDEN,

                    detail="У тебе немає доступу до цього шаблону."

                )


            ShareLinkService.validate_share_access(

                db=db,

                template_id=template.id,

                token=attempt_data.share_token,

                user=current_user

            )

        elif current_user and current_user.role == UserRole.mentor:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Ментор не може проходити власний шаблон."

            )

        elif template.session_type == SessionType.assessment:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Не можна проходити власну оціночну сесію."

            )


        if template.status != TemplateStatus.ready:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Template is not ready"

            )


        if template.session_type == SessionType.assessment:

            attempts_count = db.query(SessionAttempt).filter(

                SessionAttempt.template_id == attempt_data.template_id,

                SessionAttempt.user_id == user_id

            ).count()


            max_attempts = template.max_attempts or 1

            if attempts_count >= max_attempts:

                raise HTTPException(

                    status_code=status.HTTP_400_BAD_REQUEST,

                    detail="Maximum attempts reached"

                )


        if template.session_type == SessionType.assessment and template.deadline:

            if datetime.utcnow() > template.deadline:

                raise HTTPException(

                    status_code=status.HTTP_400_BAD_REQUEST,

                    detail="Assessment deadline has passed"

                )


        attempt = SessionAttempt(

            template_id=attempt_data.template_id,

            user_id=user_id,

            status=AttemptStatus.active,

            started_at=datetime.utcnow(),

            paused_duration=0,

            paused_at=None

        )

        db.add(attempt)

        db.commit()

        db.refresh(attempt)

        return attempt


    @staticmethod

    async def submit_answer(

        db: Session,

        attempt_id: int,

        answer_data: AnswerCreate,

        user_id: int

    ) -> Answer:

        """Submit answer for a question"""


        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found"

            )


        if attempt.status != AttemptStatus.active:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Спроба не активна. Відповідати можна тільки під час активної сесії."

            )


        question = db.query(Question).filter(

            Question.id == answer_data.question_id,

            Question.template_id == attempt.template_id

        ).first()


        if not question:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Question not found in this template"

            )


        if not answer_data.audio_url and not answer_data.video_url and not (answer_data.answer_text or "").strip():

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Відповідь не може бути порожньою."

            )


        answer = db.query(Answer).filter(

            Answer.attempt_id == attempt_id,

            Answer.question_id == answer_data.question_id

        ).first()


        if answer:

            answer.answer_text = answer_data.answer_text

            answer.audio_url = answer_data.audio_url

            answer.video_url = answer_data.video_url

            answer.duration_seconds = answer_data.duration_seconds

            answer.submitted_at = datetime.utcnow()

        else:

            answer = Answer(

                attempt_id=attempt_id,

                question_id=answer_data.question_id,

                answer_text=answer_data.answer_text,

                audio_url=answer_data.audio_url,

                video_url=answer_data.video_url,

                duration_seconds=answer_data.duration_seconds,

                submitted_at=datetime.utcnow()

            )

            db.add(answer)


        if answer_data.audio_url:

            answer.transcript = AIMLService.transcribe_audio(answer_data.audio_url)

            answer.answer_text = answer.transcript


        db.commit()

        db.refresh(answer)


        return answer


    @staticmethod

    def pause_attempt(db: Session, attempt_id: int, user_id: int) -> SessionAttempt:

        """Pause practice attempt"""

        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found"

            )


        template = attempt.template

        if not template.allow_pause or template.strict_timer:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Pause not allowed for this template"

            )


        if attempt.status != AttemptStatus.active:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Can only pause active attempts"

            )


        attempt.status = AttemptStatus.paused

        attempt.paused_at = datetime.utcnow()

        db.commit()

        db.refresh(attempt)

        return attempt


    @staticmethod

    def resume_attempt(db: Session, attempt_id: int, user_id: int) -> SessionAttempt:

        """Resume paused attempt"""

        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found"

            )


        if attempt.status != AttemptStatus.paused:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Can only resume paused attempts"

            )


        if attempt.paused_at:

            paused_seconds = max(0, int((datetime.utcnow() - attempt.paused_at).total_seconds()))

            attempt.paused_duration = (attempt.paused_duration or 0) + paused_seconds


        attempt.status = AttemptStatus.active

        attempt.paused_at = None

        db.commit()

        db.refresh(attempt)

        return attempt


    @staticmethod

    def _apply_evaluation(answer: Answer, evaluation_result: dict, db: Session) -> None:

        ai_evaluation = db.query(AIEvaluation).filter(

            AIEvaluation.answer_id == answer.id

        ).first()


        if not ai_evaluation:

            ai_evaluation = AIEvaluation(answer_id=answer.id)

            db.add(ai_evaluation)


        ai_evaluation.semantic_score = evaluation_result.get("semantic_score")

        ai_evaluation.keyword_score = evaluation_result.get("keyword_score")

        ai_evaluation.structure_score = evaluation_result.get("structure_score")

        ai_evaluation.completeness_score = evaluation_result.get("completeness_score")

        ai_evaluation.speech_score = evaluation_result.get("speech_score")

        ai_evaluation.total_score = evaluation_result.get("total_score") or 0

        ai_evaluation.source = evaluation_result.get("source") or "local_embedding"

        ai_evaluation.feedback_text = evaluation_result.get("feedback_text")

        ai_evaluation.weak_points = evaluation_result.get("weak_points")

        ai_evaluation.recommendations = evaluation_result.get("recommendations")

        ai_evaluation.missing_concepts = evaluation_result.get("missing_concepts")


    @staticmethod

    async def process_attempt_evaluation(attempt_id: int) -> None:

        """Evaluate saved answers after finish without keeping the request open."""

        db = SessionLocal()

        try:

            attempt = db.query(SessionAttempt).options(

                joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

                selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

            ).filter(SessionAttempt.id == attempt_id).first()


            if not attempt:

                return


            questions = sorted(attempt.template.questions, key=lambda question: question.order_index)

            answers_by_question = {answer.question_id: answer for answer in attempt.answers}

            total_score = 0.0


            for question in questions:

                answer = answers_by_question.get(question.id)

                answer_text = (answer.answer_text or answer.transcript or "").strip() if answer else ""

                if not answer_text and answer and answer.video_url:

                    answer_text = "Відео-відповідь надано без текстової транскрипції."


                if not answer_text:

                    total_score += 0

                    continue


                if not answer.ai_evaluation:

                    evaluation_result = AIMLService.evaluate_answer(

                        answer_text=answer_text,

                        reference_answer=question.reference_answer,

                        keywords=question.keywords,

                    )

                    AttemptService._apply_evaluation(answer, evaluation_result, db)

                    db.flush()

                    total_score += float(evaluation_result.get("total_score") or 0)

                    continue


                total_score += float(answer.ai_evaluation.total_score or 0)


            question_count = len(questions)

            attempt.ai_score = total_score / question_count if question_count else 0

            attempt.total_score = attempt.ai_score


            if attempt.template.session_type == SessionType.assessment:

                attempt.status = AttemptStatus.under_review

            else:

                attempt.status = AttemptStatus.completed

                attempt.final_score = attempt.ai_score


            db.commit()

        except Exception:

            db.rollback()

            attempt = db.query(SessionAttempt).filter(SessionAttempt.id == attempt_id).first()

            if attempt:

                attempt.status = AttemptStatus.under_review

                db.commit()

        finally:

            db.close()


    @staticmethod

    async def finish_attempt(db: Session, attempt_id: int, user_id: int) -> SessionAttempt:

        """Finish attempt and schedule local evaluation."""

        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found"

            )


        if attempt.status not in [AttemptStatus.active, AttemptStatus.paused]:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Attempt is not active"

            )


        finished_at = datetime.utcnow()

        if attempt.status == AttemptStatus.paused and attempt.paused_at:

            paused_seconds = max(0, int((finished_at - attempt.paused_at).total_seconds()))

            attempt.paused_duration = (attempt.paused_duration or 0) + paused_seconds

            attempt.paused_at = None


        attempt.finished_at = finished_at


        attempt.status = AttemptStatus.processing


        db.commit()

        db.refresh(attempt)

        return attempt


    @staticmethod

    def get_attempt(db: Session, attempt_id: int, user_id: int) -> Optional[SessionAttempt]:

        """Get attempt by ID"""

        return db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


    @staticmethod

    def get_attempt_detail(db: Session, attempt_id: int, user_id: int) -> Optional[dict]:

        attempt = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation)

        ).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            return None


        if attempt.status == AttemptStatus.paused and not attempt.paused_at:

            attempt.paused_at = datetime.utcnow()

            db.commit()

            db.refresh(attempt)


        questions = sorted(attempt.template.questions, key=lambda question: question.order_index)


        return {

            "id": attempt.id,

            "template_id": attempt.template_id,

            "user_id": attempt.user_id,

            "status": attempt.status,

            "started_at": attempt.started_at,

            "finished_at": attempt.finished_at,

            "paused_at": attempt.paused_at,

            "paused_duration": attempt.paused_duration,

            "total_score": attempt.total_score,

            "final_score": attempt.final_score,

            "ai_score": attempt.ai_score,

            "mentor_score": attempt.mentor_score,

            "created_at": attempt.created_at,

            "template": attempt.template,

            "questions": questions,

            "answers": attempt.answers,

        }


    @staticmethod

    def get_user_attempts(

        db: Session,

        user_id: int,

        skip: int = 0,

        limit: int = 100

    ) -> List[SessionAttempt]:

        """Get all attempts by user"""

        return db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template)

        ).filter(

            SessionAttempt.user_id == user_id

        ).order_by(SessionAttempt.created_at.desc()).offset(skip).limit(limit).all()


    @staticmethod

    def get_attempt_result(db: Session, attempt_id: int, user_id: int) -> dict:

        attempt = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

            selectinload(SessionAttempt.video_analyses),

        ).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found"

            )


        questions = sorted(attempt.template.questions, key=lambda question: question.order_index)

        answers_by_question = {answer.question_id: answer for answer in attempt.answers}

        semantic_scores = []

        keyword_scores = []

        completeness_scores = []

        structure_scores = []

        answer_length_scores = []

        reference_coverage_scores = []

        concept_coverage_scores = []

        clarity_scores = []

        weak_points_counter = Counter()

        recommendations_counter = Counter()

        result_questions = []

        answered_count = 0

        missed_count = 0


        for question in questions:

            answer = answers_by_question.get(question.id)

            answer_text = None

            evaluation = None

            if answer:

                answer_text = (answer.answer_text or answer.transcript or "").strip() or None

                evaluation = answer.ai_evaluation


            if answer_text:

                answered_count += 1

            else:

                missed_count += 1


            if evaluation:

                if evaluation.semantic_score is not None:

                    semantic_scores.append(evaluation.semantic_score)

                if evaluation.keyword_score is not None:

                    keyword_scores.append(evaluation.keyword_score)

                if evaluation.completeness_score is not None:

                    completeness_scores.append(evaluation.completeness_score)

                if evaluation.structure_score is not None:

                    structure_scores.append(evaluation.structure_score)

                for weak_point in evaluation.weak_points or []:

                    weak_points_counter[weak_point] += 1

                for recommendation in evaluation.recommendations or []:

                    recommendations_counter[recommendation] += 1


            matched_concepts = AIMLService.matched_concepts(answer_text, question.keywords, question.reference_answer)

            answer_length_score = AIMLService.answer_length_score(answer_text, question.reference_answer)

            reference_coverage_score = AIMLService.reference_coverage_score(answer_text, question.reference_answer)

            concept_coverage_score = evaluation.keyword_score if evaluation else 0

            clarity_score = evaluation.structure_score if evaluation else 0

            weighted_total_score = evaluation.total_score if evaluation else 0

            detailed_feedback = AIMLService.detailed_feedback(

                answer_text=answer_text,

                reference_answer=question.reference_answer,

                matched_concepts=matched_concepts,

                missing_concepts=evaluation.missing_concepts if evaluation else [],

                semantic_score=evaluation.semantic_score if evaluation else 0,

                keyword_score=evaluation.keyword_score if evaluation else 0,

                completeness_score=evaluation.completeness_score if evaluation else 0,

                structure_score=evaluation.structure_score if evaluation else 0,

                original_feedback=evaluation.feedback_text if evaluation else None,

            )


            result_questions.append({

                "question_id": question.id,

                "question_text": question.question_text,

                "answer_text": answer_text,

                "reference_answer": question.reference_answer,

                "score": evaluation.total_score if evaluation else 0,

                "semantic_score": evaluation.semantic_score if evaluation else 0,

                "keyword_score": evaluation.keyword_score if evaluation else 0,

                "completeness_score": evaluation.completeness_score if evaluation else 0,

                "structure_score": evaluation.structure_score if evaluation else 0,

                "answer_length_score": answer_length_score,

                "reference_coverage_score": reference_coverage_score,

                "concept_coverage_score": concept_coverage_score,

                "clarity_score": clarity_score,

                "weighted_total_score": weighted_total_score,

                "feedback_text": detailed_feedback,

                "recommendations": evaluation.recommendations if evaluation else [],

                "missing_concepts": evaluation.missing_concepts if evaluation else [],

                "matched_concepts": matched_concepts,

            })

            answer_length_scores.append(result_questions[-1]["answer_length_score"])

            reference_coverage_scores.append(result_questions[-1]["reference_coverage_score"])

            concept_coverage_scores.append(result_questions[-1]["concept_coverage_score"])

            clarity_scores.append(result_questions[-1]["clarity_score"])


        total_score = attempt.final_score

        if total_score is None:

            total_score = attempt.ai_score

        if total_score is None and answered_count > 0:

            scores = [item["score"] for item in result_questions if item["score"] is not None]

            total_score = sum(scores) / len(scores) if scores else 0

        if total_score is None:

            total_score = 0


        average_semantic = sum(semantic_scores) / len(semantic_scores) if semantic_scores else 0

        average_keyword = sum(keyword_scores) / len(keyword_scores) if keyword_scores else 0

        average_completeness = sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0

        average_structure = sum(structure_scores) / len(structure_scores) if structure_scores else 0

        overall_recommendation = "Продовжуй тренування: додай більше ключових понять і прикладів у відповіді."

        if total_score >= 80:

            overall_recommendation = "Основні ідеї передані добре. Для посилення результату додавай точніші приклади."

        elif total_score == 0:

            overall_recommendation = "Надай відповіді хоча б на частину питань, щоб отримати змістовний результат."


        return {

            "attempt_id": attempt.id,

            "total_score": round(total_score, 2),

            "total_answers": answered_count,

            "missed_questions": missed_count,

            "average_semantic_score": round(average_semantic, 2),

            "average_keyword_score": round(average_keyword, 2),

            "average_completeness_score": round(average_completeness, 2),

            "average_structure_score": round(average_structure, 2),

            "average_answer_length_score": round(sum(answer_length_scores) / len(answer_length_scores), 2) if answer_length_scores else 0,

            "average_reference_coverage_score": round(sum(reference_coverage_scores) / len(reference_coverage_scores), 2) if reference_coverage_scores else 0,

            "average_concept_coverage_score": round(sum(concept_coverage_scores) / len(concept_coverage_scores), 2) if concept_coverage_scores else 0,

            "average_clarity_score": round(sum(clarity_scores) / len(clarity_scores), 2) if clarity_scores else 0,

            "video_metrics": AttemptService._latest_video_metrics(attempt),

            "overall_recommendation": overall_recommendation,

            "weak_points": [item for item, _ in weak_points_counter.most_common(5)],

            "recommendations": [item for item, _ in recommendations_counter.most_common(5)],

            "questions": result_questions,

        }


    @staticmethod

    def _tokens(text: Optional[str]) -> List[str]:

        return AIMLService.tokenize(text)


    @staticmethod

    def _answer_length_score(answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        return AIMLService.answer_length_score(answer_text, reference_answer)


    @staticmethod

    def _reference_coverage_score(answer_text: Optional[str], reference_answer: Optional[str]) -> float:

        return AIMLService.reference_coverage_score(answer_text, reference_answer)


    @staticmethod

    def _matched_concepts(answer_text: Optional[str], keywords: Optional[list], reference_answer: Optional[str]) -> List[str]:

        return AIMLService.matched_concepts(answer_text, keywords, reference_answer)


    @staticmethod

    def _detailed_feedback(

        answer_text: Optional[str],

        reference_answer: Optional[str],

        matched_concepts: Optional[List[str]],

        missing_concepts: Optional[List[str]],

        semantic_score: float,

        keyword_score: float,

        completeness_score: float,

        structure_score: float,

        original_feedback: Optional[str],

    ) -> str:

        if not answer_text:

            return (

                "Відповідь не зафіксована як змістовний текст, тому система не може коректно порівняти її з еталоном. "

                "Для кращої оцінки потрібні ключові поняття, коротке пояснення суті та хоча б один приклад або наслідок."

            )


        parts = []

        if original_feedback:

            parts.append(original_feedback.strip())


        matched = [str(item) for item in (matched_concepts or []) if str(item).strip()]

        missing = [str(item) for item in (missing_concepts or []) if str(item).strip()]


        if semantic_score >= 75:

            parts.append("За змістом відповідь близька до еталону: головна ідея передана достатньо впевнено.")

        elif semantic_score >= 45:

            parts.append("Зміст частково збігається з еталоном, але частина пояснення або причинно-наслідкових звʼязків лишилась неповною.")

        else:

            parts.append("Зміст суттєво відходить від еталону: відповідь потребує точнішого визначення і прямого пояснення основної ідеї.")


        if matched:

            parts.append(f"Зараховані поняття: {', '.join(matched[:6])}.")

        if missing:

            parts.append(f"Бракує понять або акцентів: {', '.join(missing[:6])}.")


        if keyword_score < 50:

            parts.append("Ключові терміни треба називати прямо, бо без них відповідь виглядає загальною навіть якщо інтуїтивно правильна.")

        if completeness_score < 50:

            parts.append("Повнота слабка: додай визначення, навіщо це потрібно, як працює, і короткий приклад застосування.")

        if structure_score < 50:

            parts.append("Структура слабка: краще відповідати схемою 'визначення -> механізм -> приклад -> висновок'.")


        if reference_answer:

            reference_tokens = AttemptService._tokens(reference_answer)

            if len(reference_tokens) >= 8:

                parts.append("Порівняй свою відповідь з еталоном і перевір, чи є в ній ті самі смислові вузли, а не лише схожі слова.")


        return " ".join(dict.fromkeys(parts))


    @staticmethod

    def _latest_video_metrics(attempt: SessionAttempt) -> Optional[VideoAnalysis]:

        summaries = [item for item in attempt.video_analyses if item.status == "summary"]

        if not summaries:

            return None

        return sorted(summaries, key=lambda item: item.created_at, reverse=True)[0]


    @staticmethod

    def save_video_metrics_summary(

        db: Session,

        attempt_id: int,

        metrics: VideoMetricsCreate,

        user_id: int,

    ) -> VideoAnalysis:

        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id,

        ).first()

        if not attempt:

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")


        analysis = db.query(VideoAnalysis).filter(

            VideoAnalysis.attempt_id == attempt_id,

            VideoAnalysis.answer_id.is_(None),

            VideoAnalysis.status == "summary",

        ).first()


        if not analysis:

            analysis = VideoAnalysis(attempt_id=attempt_id, answer_id=None, status="summary")

            db.add(analysis)


        analysis.duration_seconds = metrics.duration_seconds

        analysis.fps = metrics.fps

        analysis.resolution_width = metrics.resolution_width

        analysis.resolution_height = metrics.resolution_height

        analysis.face_presence_ratio = metrics.average_focus_ratio

        analysis.gaze_offscreen_ratio = metrics.offscreen_ratio

        analysis.blink_rate_per_minute = metrics.estimated_blink_rate

        analysis.brightness_score = metrics.average_brightness

        analysis.blur_score = metrics.average_blur_score

        analysis.quality_score = metrics.average_clarity_score

        analysis.speaking_activity_ratio = metrics.speaking_activity_ratio

        analysis.speaking_stability = metrics.speaking_stability

        analysis.confidence_heuristic = metrics.confidence_heuristic

        analysis.warnings = metrics.warnings or []

        analysis.recommendations = metrics.recommendations or []

        analysis.feedback_text = "Frontend MVP summary: technical and behavioral heuristics only."

        analysis.updated_at = datetime.utcnow()


        db.commit()

        db.refresh(analysis)

        return analysis


    @staticmethod

    async def analyze_attempt_video(

        db: Session,

        attempt_id: int,

        video_url: str,

        user_id: int,

        answer_id: Optional[int] = None,

    ) -> VideoAnalysis:

        attempt = db.query(SessionAttempt).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.user_id == user_id,

        ).first()

        if not attempt:

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")


        if answer_id:

            answer = db.query(Answer).filter(

                Answer.id == answer_id,

                Answer.attempt_id == attempt_id,

            ).first()

            if not answer:

                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")


        analysis = VideoAnalysis(

            attempt_id=attempt_id,

            answer_id=answer_id,

            status="processing",

            warnings=[],

            recommendations=[],

        )

        db.add(analysis)

        db.commit()

        db.refresh(analysis)


        try:

            result = AIMLService.analyze_video(video_url)

            analysis.status = result.get("status") or "summary"

            analysis.brightness_score = result.get("brightness_score")

            analysis.blur_score = result.get("blur_score")

            analysis.quality_score = result.get("quality_score")

            analysis.warnings = result.get("warnings") or []

            analysis.recommendations = result.get("recommendations") or []

            analysis.feedback_text = result.get("feedback_text")

        except Exception as exc:

            analysis.status = "failed"

            analysis.warnings = ["video_analysis_failed"]

            analysis.recommendations = ["Спробуйте повторити аналіз після перевірки доступності відео."]

            analysis.feedback_text = f"Не вдалося виконати технічний аналіз відео: {exc}"


        db.commit()

        db.refresh(analysis)

        return analysis

