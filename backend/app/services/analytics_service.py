from collections import Counter, defaultdict

from typing import Dict, List


from sqlalchemy.orm import Session, joinedload, selectinload


from ..models import (

    SessionAttempt,

    SessionTemplate,

    Answer,

    AttemptStatus,

    Question,

    ShareLink,

)


class AnalyticsService:

    """Service for dashboard analytics."""


    @staticmethod

    def get_user_analytics(db: Session, user_id: int) -> Dict:

        attempts = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template)

        ).filter(

            SessionAttempt.user_id == user_id

        ).order_by(SessionAttempt.started_at.desc()).all()


        total_attempts = len(attempts)

        completed_statuses = {

            AttemptStatus.completed,

            AttemptStatus.reviewed,

            AttemptStatus.under_review,

            AttemptStatus.auto_submitted,

            AttemptStatus.cancelled,

            AttemptStatus.expired,

        }

        completed_attempts = [attempt for attempt in attempts if attempt.status in completed_statuses]

        completed_count = len(completed_attempts)

        processing_count = len([attempt for attempt in attempts if attempt.status == AttemptStatus.processing])


        scored_attempts = []

        for attempt in completed_attempts:

            score = attempt.final_score

            if score is None:

                score = attempt.ai_score

            if score is None:

                score = attempt.total_score

            if score is not None:

                scored_attempts.append((attempt, float(score)))


        average_score = (

            sum(score for _, score in scored_attempts) / len(scored_attempts)

            if scored_attempts

            else 0

        )


        completion_rate = (completed_count / total_attempts * 100) if total_attempts else 0


        recent_attempts = [

            {

                "id": attempt.id,

                "template_id": attempt.template_id,

                "template_title": attempt.template.title if attempt.template else None,

                "status": attempt.status,

                "started_at": attempt.started_at,

                "final_score": attempt.final_score,

            }

            for attempt in attempts[:5]

        ]


        recent_scored_attempts = sorted(scored_attempts, key=lambda item: item[0].started_at)

        score_trend = [

            {

                "attempt_id": attempt.id,

                "date": attempt.finished_at or attempt.started_at,

                "score": score,

            }

            for attempt, score in recent_scored_attempts

        ]


        answers = db.query(Answer).options(

            selectinload(Answer.ai_evaluation),

            joinedload(Answer.question)

        ).join(SessionAttempt).filter(

            SessionAttempt.user_id == user_id

        ).all()


        concept_counter = Counter()

        topic_scores = defaultdict(list)


        for answer in answers:

            evaluation = answer.ai_evaluation

            question = answer.question

            if evaluation:

                for concept in evaluation.missing_concepts or []:

                    concept_counter[str(concept)] += 1

                if question and question.topic:

                    topic_scores[str(question.topic)].append(evaluation.total_score or 0)


        weak_concepts = [

            {"concept": concept, "count": count}

            for concept, count in concept_counter.most_common(5)

        ]


        weak_topics = []

        for topic, scores in topic_scores.items():

            if scores:

                weak_topics.append({

                    "topic": topic,

                    "average_score": sum(scores) / len(scores)

                })


        weak_topics = sorted(weak_topics, key=lambda item: item["average_score"])[:5]


        return {

            "total_attempts": total_attempts,

            "completed_attempts": completed_count,

            "processing_attempts": processing_count,

            "new_ready_results_count": len([

                attempt for attempt in completed_attempts

                if attempt.finished_at and (attempt.final_score is not None or attempt.ai_score is not None)

            ]),

            "average_score": round(average_score, 2),

            "completion_rate": round(completion_rate, 2),

            "recent_attempts": recent_attempts,

            "score_trend": score_trend,

            "weak_concepts": weak_concepts,

            "weak_topics": weak_topics,

        }


    @staticmethod

    def get_mentor_analytics(db: Session, mentor_id: int) -> Dict:

        templates = db.query(SessionTemplate).filter(

            SessionTemplate.owner_id == mentor_id

        ).all()


        template_ids = [template.id for template in templates]

        active_invites = db.query(ShareLink).filter(

            ShareLink.template_id.in_(template_ids) if template_ids else False

        ).count()

        attempts = db.query(SessionAttempt).filter(

            SessionAttempt.template_id.in_(template_ids) if template_ids else False

        ).all()


        attempts_under_review = len([attempt for attempt in attempts if attempt.status == AttemptStatus.under_review])


        template_stats = []

        for template in templates:

            template_attempts = [attempt for attempt in attempts if attempt.template_id == template.id]

            scores = []

            for attempt in template_attempts:

                score = attempt.final_score

                if score is None:

                    score = attempt.ai_score

                if score is None:

                    score = attempt.total_score

                if score is not None:

                    scores.append(float(score))

            average_score = sum(scores) / len(scores) if scores else 0

            template_stats.append({

                "template_id": template.id,

                "title": template.title,

                "session_type": template.session_type,

                "total_attempts": len(template_attempts),

                "average_score": round(average_score, 2),

            })


        answers = db.query(Answer).options(

            selectinload(Answer.ai_evaluation),

            joinedload(Answer.question).joinedload(Question.template)

        ).join(SessionAttempt).filter(

            SessionAttempt.template_id.in_(template_ids) if template_ids else False

        ).all()


        question_scores: Dict[int, List[float]] = defaultdict(list)

        semantic_scores: Dict[int, List[float]] = defaultdict(list)

        question_meta = {}


        for answer in answers:

            evaluation = answer.ai_evaluation

            question = answer.question

            if not question:

                continue

            question_meta[question.id] = {

                "question_text": question.question_text,

                "template_id": question.template_id,

                "template_title": question.template.title if question.template else None,

            }

            if evaluation:

                question_scores[question.id].append(evaluation.total_score or 0)

                if evaluation.semantic_score is not None:

                    semantic_scores[question.id].append(evaluation.semantic_score)


        def build_question_stats(score_map: Dict[int, List[float]]) -> List[Dict]:

            stats = []

            for question_id, scores in score_map.items():

                if not scores:

                    continue

                meta = question_meta.get(question_id, {})

                stats.append({

                    "question_id": question_id,

                    "question_text": meta.get("question_text", ""),

                    "template_id": meta.get("template_id"),

                    "template_title": meta.get("template_title"),

                    "average_score": sum(scores) / len(scores),

                })

            return stats


        hardest_questions = sorted(

            build_question_stats(question_scores),

            key=lambda item: item["average_score"]

        )[:5]


        lowest_average_questions = sorted(

            build_question_stats(semantic_scores) if semantic_scores else build_question_stats(question_scores),

            key=lambda item: item["average_score"]

        )[:5]


        return {

            "total_templates": len(templates),

            "active_invites": active_invites,

            "total_attempts": len(attempts),

            "attempts_under_review": attempts_under_review,

            "templates": template_stats,

            "hardest_questions": hardest_questions,

            "lowest_average_questions": lowest_average_questions,

        }

