from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from typing import Optional


from ..core.database import get_db

from ..core.security import get_current_user, get_optional_user

from ..models import User

from ..schemas.attempt import AttemptCreate, AttemptResponse

from ..schemas.share_link import SharedTemplateResponse

from ..services.attempt_service import AttemptService

from ..services.share_link_service import ShareLinkService


router = APIRouter(prefix="/share", tags=["Share"])


def _shared_template_payload(share_link):

    template = share_link.template

    questions = [] if template.session_type == "assessment" else sorted(template.questions, key=lambda question: question.order_index)

    return {

        "id": template.id,

        "owner_id": template.owner_id,

        "title": template.title,

        "description": template.description,

        "session_type": template.session_type,

        "status": template.status,

        "answer_mode": template.answer_mode,

        "duration_minutes": template.duration_minutes,

        "allow_pause": template.allow_pause,

        "max_attempts": template.max_attempts,

        "strict_timer": template.strict_timer,

        "deadline": template.deadline,

        "camera_required": template.camera_required,

        "voice_required": template.voice_required,

        "randomized_questions": template.randomized_questions,

        "questions": questions,

        "share": share_link,

    }


@router.get("/{token}", response_model=SharedTemplateResponse)

def get_share(

    token: str,

    db: Session = Depends(get_db),

    current_user: Optional[User] = Depends(get_optional_user),

):

    share_link = ShareLinkService.get_template_for_share(db, token, current_user)

    return _shared_template_payload(share_link)


@router.post("/{token}/start-attempt", response_model=AttemptResponse)

def start_attempt_from_share(

    token: str,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    share_link = ShareLinkService.get_template_for_share(db, token, current_user)

    return AttemptService.create_attempt(

        db,

        AttemptCreate(template_id=share_link.template_id, share_token=token),

        current_user.id,

    )

