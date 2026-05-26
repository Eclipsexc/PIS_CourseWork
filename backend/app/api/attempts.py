from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from sqlalchemy.orm import Session

from typing import List

from ..core.database import get_db

from ..core.security import get_current_user

from ..models import User

from ..schemas.attempt import (

    AttemptCreate,

    AttemptResponse,

    AttemptDetailResponse,

    AttemptResultResponse,

    AnswerCreate,

    AnswerResponse,

    VideoAnalysisCreate,

    VideoAnalysisResponse,

    VideoMetricsCreate,

)

from ..services.attempt_service import AttemptService


router = APIRouter(prefix="/attempts", tags=["Attempts"])


@router.post("", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)

def create_attempt(

    attempt_data: AttemptCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Start a new attempt"""

    return AttemptService.create_attempt(db, attempt_data, current_user.id)


@router.get("", response_model=List[AttemptResponse])

def get_attempts(

    skip: int = 0,

    limit: int = 100,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get all attempts by current user"""

    return AttemptService.get_user_attempts(db, current_user.id, skip, limit)


@router.get("/{attempt_id}", response_model=AttemptDetailResponse)

def get_attempt(

    attempt_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get attempt details"""

    attempt = AttemptService.get_attempt_detail(db, attempt_id, current_user.id)

    if not attempt:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,

            detail="Attempt not found"

        )

    return attempt


@router.get("/{attempt_id}/result", response_model=AttemptResultResponse)

def get_attempt_result(

    attempt_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Get aggregated attempt result"""

    return AttemptService.get_attempt_result(db, attempt_id, current_user.id)


@router.post("/{attempt_id}/answers", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED)

async def submit_answer(

    attempt_id: int,

    answer_data: AnswerCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Submit an answer for a question"""

    return await AttemptService.submit_answer(db, attempt_id, answer_data, current_user.id)


@router.post("/{attempt_id}/pause", response_model=AttemptResponse)

def pause_attempt(

    attempt_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Pause practice attempt"""

    return AttemptService.pause_attempt(db, attempt_id, current_user.id)


@router.post("/{attempt_id}/resume", response_model=AttemptResponse)

def resume_attempt(

    attempt_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Resume paused attempt"""

    return AttemptService.resume_attempt(db, attempt_id, current_user.id)


@router.post("/{attempt_id}/finish", response_model=AttemptResponse)

async def finish_attempt(

    attempt_id: int,

    background_tasks: BackgroundTasks,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Finish attempt and generate final report"""

    attempt = await AttemptService.finish_attempt(db, attempt_id, current_user.id)

    background_tasks.add_task(AttemptService.process_attempt_evaluation, attempt.id)

    return attempt


@router.post("/{attempt_id}/video-analysis", response_model=VideoAnalysisResponse)

async def analyze_video(

    attempt_id: int,

    payload: VideoAnalysisCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Run MVP technical video analysis for an attempt video."""

    return await AttemptService.analyze_attempt_video(

        db=db,

        attempt_id=attempt_id,

        video_url=payload.video_url,

        answer_id=payload.answer_id,

        user_id=current_user.id,

    )


@router.post("/{attempt_id}/video-metrics", response_model=VideoAnalysisResponse)

def save_video_metrics(

    attempt_id: int,

    payload: VideoMetricsCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)

):

    """Persist summarized live voice_video metrics only, never raw frames/video."""

    return AttemptService.save_video_metrics_summary(db, attempt_id, payload, current_user.id)

