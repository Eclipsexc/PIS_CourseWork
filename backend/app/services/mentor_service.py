from sqlalchemy.orm import Session, joinedload, selectinload

from typing import List

from ..models import SessionAttempt, MentorFeedback, AttemptStatus, ShareLink, AccessType, SessionTemplate, Answer, SessionType, User

from ..schemas.evaluation import MentorFeedbackCreate

from fastapi import HTTPException, status


class MentorService:

    """Service for mentor review operations"""


    @staticmethod

    def get_assessment_attempts_for_review(

        db: Session,

        mentor_id: int,

        skip: int = 0,

        limit: int = 100

    ) -> List[SessionAttempt]:

        """Get all assessment attempts that need mentor review"""

        attempts = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

        ).join(

            SessionAttempt.template

        ).filter(

            SessionAttempt.template.has(owner_id=mentor_id),

            SessionAttempt.status == AttemptStatus.under_review

        ).offset(skip).limit(limit).all()

        return [MentorService._attempt_detail_payload(attempt) for attempt in attempts]


    @staticmethod

    def get_attempt_for_review(

        db: Session,

        attempt_id: int,

        mentor_id: int

    ) -> SessionAttempt:

        """Get specific attempt for mentor review"""

        attempt = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

        ).join(

            SessionAttempt.template

        ).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.template.has(owner_id=mentor_id)

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found or you don't have permission"

            )


        return MentorService._attempt_detail_payload(attempt)


    @staticmethod

    def get_reviewed_attempts(db: Session, mentor_id: int) -> List[dict]:

        attempts = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

        ).join(SessionAttempt.template).filter(

            SessionAttempt.template.has(owner_id=mentor_id),

            SessionAttempt.status.in_([AttemptStatus.reviewed, AttemptStatus.completed, AttemptStatus.under_review])

        ).order_by(SessionAttempt.created_at.desc()).limit(100).all()


        return [MentorService._attempt_detail_payload(attempt) for attempt in attempts]


    @staticmethod

    def submit_mentor_feedback(

        db: Session,

        attempt_id: int,

        feedback_data: MentorFeedbackCreate,

        mentor_id: int

    ) -> MentorFeedback:

        """Submit mentor feedback and final score"""


        attempt = db.query(SessionAttempt).join(

            SessionAttempt.template

        ).filter(

            SessionAttempt.id == attempt_id,

            SessionAttempt.template.has(owner_id=mentor_id)

        ).first()


        if not attempt:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Attempt not found or you don't have permission"

            )


        if attempt.status != AttemptStatus.under_review:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Attempt is not under review"

            )


        mentor_feedback = MentorFeedback(

            attempt_id=attempt_id,

            mentor_id=mentor_id,

            final_score=feedback_data.final_score,

            comment=feedback_data.comment,

            override_reason=feedback_data.override_reason

        )

        db.add(mentor_feedback)


        attempt.mentor_score = feedback_data.final_score

        attempt.final_score = feedback_data.final_score

        attempt.status = AttemptStatus.reviewed


        db.commit()

        db.refresh(mentor_feedback)

        return mentor_feedback


    @staticmethod

    def get_assessment_analytics(

        db: Session,

        template_id: int,

        mentor_id: int

    ) -> dict:

        """Get analytics for assessment template"""


        from ..models import SessionTemplate

        template = db.query(SessionTemplate).filter(

            SessionTemplate.id == template_id,

            SessionTemplate.owner_id == mentor_id

        ).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found or you don't have permission"

            )


        attempts = db.query(SessionAttempt).filter(

            SessionAttempt.template_id == template_id

        ).all()


        total_attempts = len(attempts)

        completed = len([a for a in attempts if a.status == AttemptStatus.reviewed])

        under_review = len([a for a in attempts if a.status == AttemptStatus.under_review])


        scores = [a.final_score for a in attempts if a.final_score is not None]

        avg_score = sum(scores) / len(scores) if scores else 0


        return {

            "template_id": template_id,

            "total_attempts": total_attempts,

            "completed": completed,

            "under_review": under_review,

            "average_score": avg_score

        }

    @staticmethod

    def _attempt_detail_payload(attempt: SessionAttempt) -> dict:

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

            "mentor_feedback": attempt.mentor_feedback,

        }


    @staticmethod

    def get_user_invitations(db: Session, user_email: str) -> List[dict]:

        invites = db.query(ShareLink).options(

            joinedload(ShareLink.template).joinedload(SessionTemplate.owner)

        ).filter(

            ShareLink.access_type == AccessType.private,

            ShareLink.recipient_email == user_email

        ).order_by(ShareLink.created_at.desc()).all()


        result = []

        for invite in invites:

            user = db.query(User).filter(User.email == user_email).first()

            existing_attempt = None

            if user:

                existing_attempt = db.query(SessionAttempt).filter(

                    SessionAttempt.template_id == invite.template_id,

                    SessionAttempt.user_id == user.id,

                ).first()

            if invite.template.session_type == SessionType.assessment and existing_attempt:

                continue

            result.append(

            {

                "id": invite.id,

                "token": invite.token,

                "access_type": invite.access_type,

                "recipient_email": invite.recipient_email,

                "created_at": invite.created_at,

                "expires_at": invite.expires_at,

                "template": {

                    "id": invite.template.id,

                    "title": invite.template.title,

                    "description": invite.template.description,

                    "session_type": invite.template.session_type,

                    "answer_mode": invite.template.answer_mode,

                    "status": invite.template.status,

                    "owner_name": invite.template.owner.full_name if invite.template.owner else None,

                },

            }

            )

        return result


    @staticmethod

    def get_user_mentor_results(db: Session, user_id: int) -> List[dict]:

        attempts = db.query(SessionAttempt).options(

            joinedload(SessionAttempt.template).selectinload(SessionTemplate.questions),

            selectinload(SessionAttempt.answers).selectinload(Answer.ai_evaluation),

            joinedload(SessionAttempt.mentor_feedback),

        ).join(SessionAttempt.template).filter(

            SessionAttempt.user_id == user_id,

            SessionTemplate.session_type == SessionType.assessment,

            SessionAttempt.status.in_([AttemptStatus.under_review, AttemptStatus.reviewed])

        ).order_by(SessionAttempt.created_at.desc()).all()


        return [MentorService._attempt_detail_payload(attempt) for attempt in attempts]

