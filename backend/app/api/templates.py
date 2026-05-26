from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from sqlalchemy.orm import Session

from typing import List

from ..core.database import get_db

from ..core.security import get_current_user, get_optional_user

from ..models import User, UserRole

from ..schemas.template import (

    TemplateCreate,

    TemplateImportFromPublicUrl,

    ParsedTemplateFileResponse,

    TemplateUpdate,

    TemplateResponse,

    TemplateListResponse

)

from ..schemas.share_link import ShareLinkCreate, ShareLinkResponse, SharedTemplateResponse

from ..services.template_service import TemplateService

from ..services.share_link_service import ShareLinkService

from typing import Optional

import re


router = APIRouter(prefix="/templates", tags=["Templates"])


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)

def create_template(

    template_data: TemplateCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Create a new template with manual questions"""

    if template_data.session_type == "assessment" and current_user.role != UserRole.mentor:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Оціночні сесії може створювати лише ментор."

        )

    if template_data.session_type == "assessment":

        template_data.answer_mode = "voice_video"

        template_data.camera_required = True

        template_data.voice_required = True

        template_data.strict_timer = True

        template_data.max_attempts = 1

    return TemplateService.create_template(db, template_data, current_user.id)


@router.post("/parse-file", response_model=ParsedTemplateFileResponse)

async def parse_template_file(

    file: UploadFile = File(...),

    current_user: User = Depends(get_current_user)

):

    """Parse .txt or .pdf template file into selectable Q/A pairs."""

    return await TemplateService.parse_template_file_upload(file)


@router.get("", response_model=List[TemplateListResponse])

def get_templates(

    skip: int = 0,

    limit: int = 100,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get all templates owned by current user"""

    return TemplateService.get_user_templates(db, current_user.id, skip, limit)


@router.post("/import-public", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)

def import_public_template(

    import_data: TemplateImportFromPublicUrl,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Clone a template from a public /shared/{token} URL into current user's templates."""

    raw_value = import_data.url.strip()

    token = raw_value.rstrip("/").split("/")[-1]

    if not re.fullmatch(r"[A-Za-z0-9_-]{12,128}", token):

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="Встав коректний public URL або token виду /shared/{token}."

        )

    return TemplateService.import_from_public_share(db, token, current_user.id)


@router.get("/{template_id}", response_model=TemplateResponse)

def get_template(

    template_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get template by ID"""

    template = TemplateService.get_template(db, template_id)

    if not template:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Template not found"

        )

    if template.owner_id != current_user.id:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Access to this template is restricted"

        )

    return template


@router.put("/{template_id}", response_model=TemplateResponse)

def update_template(

    template_id: int,

    template_data: TemplateUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Update template"""

    return TemplateService.update_template(db, template_id, template_data, current_user.id)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)

def delete_template(

    template_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Delete template"""

    TemplateService.delete_template(db, template_id, current_user.id)

    return None


@router.post("/{template_id}/ready", response_model=TemplateResponse)

def set_template_ready(

    template_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Set template status to ready"""

    return TemplateService.set_template_ready(db, template_id, current_user.id)


@router.post("/{template_id}/share-links", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)

def create_share_link(

    template_id: int,

    share_data: ShareLinkCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Create share link for a template"""

    return ShareLinkService.create_share_link(db, template_id, share_data, current_user)


@router.post("/{template_id}/share", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)

def create_share_link_alias(

    template_id: int,

    share_data: ShareLinkCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Create share link for a template. Alias for the MVP invite flow."""

    return ShareLinkService.create_share_link(db, template_id, share_data, current_user)


@router.get("/shared/{token}", response_model=SharedTemplateResponse)

def get_shared_template(

    token: str,

    db: Session = Depends(get_db),

    current_user: Optional[User] = Depends(get_optional_user)

):

    """Get shared template by token"""

    share_link = ShareLinkService.get_template_for_share(db, token, current_user)

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

