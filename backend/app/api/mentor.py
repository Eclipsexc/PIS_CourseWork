from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from typing import List

from ..core.database import get_db

from ..core.security import get_current_mentor, get_current_user

from ..models import User

from ..schemas.attempt import AttemptDetailResponse

from ..schemas.evaluation import MentorFeedbackCreate, MentorFeedbackResponse

from ..services.mentor_service import MentorService


router = APIRouter(prefix="/mentor", tags=["Mentor"])


@router.get("/assessments", response_model=List[AttemptDetailResponse])

def get_assessments_for_review(

    skip: int = 0,

    limit: int = 100,

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    """Get all assessment attempts that need mentor review"""

    return MentorService.get_assessment_attempts_for_review(db, current_mentor.id, skip, limit)


@router.get("/invitations")

def get_my_invitations(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get private mentor invitations for the signed-in user."""

    return MentorService.get_user_invitations(db, current_user.email)


@router.get("/review-results", response_model=List[AttemptDetailResponse])

def get_review_results(

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    """Get assessment attempts for templates owned by this mentor."""

    return MentorService.get_reviewed_attempts(db, current_mentor.id)


@router.get("/my-results", response_model=List[AttemptDetailResponse])

def get_my_mentor_results(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get current user's assessment results and mentor feedback."""

    return MentorService.get_user_mentor_results(db, current_user.id)


@router.get("/attempts/{attempt_id}", response_model=AttemptDetailResponse)

def get_attempt_for_review(

    attempt_id: int,

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    """Get specific attempt for mentor review"""

    return MentorService.get_attempt_for_review(db, attempt_id, current_mentor.id)


@router.post("/attempts/{attempt_id}/review", response_model=MentorFeedbackResponse, status_code=status.HTTP_201_CREATED)

def submit_mentor_feedback(

    attempt_id: int,

    feedback_data: MentorFeedbackCreate,

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    """Submit mentor feedback and final score"""

    return MentorService.submit_mentor_feedback(db, attempt_id, feedback_data, current_mentor.id)


@router.get("/analytics/{template_id}")

def get_assessment_analytics(

    template_id: int,

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    """Get analytics for assessment template"""

    return MentorService.get_assessment_analytics(db, template_id, current_mentor.id)

