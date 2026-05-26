from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session


from ..core.database import get_db

from ..core.security import get_current_user, get_current_mentor

from ..models import User

from ..schemas.analytics import UserAnalyticsResponse, MentorAnalyticsResponse

from ..services.analytics_service import AnalyticsService


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/user", response_model=UserAnalyticsResponse)

def get_user_analytics(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    return AnalyticsService.get_user_analytics(db, current_user.id)


@router.get("/me", response_model=UserAnalyticsResponse)

def get_my_analytics(

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    return AnalyticsService.get_user_analytics(db, current_user.id)


@router.get("/mentor", response_model=MentorAnalyticsResponse)

def get_mentor_analytics(

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    return AnalyticsService.get_mentor_analytics(db, current_mentor.id)


@router.get("/templates/{template_id}")

def get_template_analytics(

    template_id: int,

    db: Session = Depends(get_db),

    current_mentor: User = Depends(get_current_mentor)

):

    analytics = AnalyticsService.get_mentor_analytics(db, current_mentor.id)

    template = next((item for item in analytics["templates"] if item["template_id"] == template_id), None)

    return template or {"template_id": template_id, "total_attempts": 0, "average_score": 0}

