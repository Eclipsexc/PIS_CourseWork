import secrets

from datetime import datetime

from typing import Optional


from fastapi import HTTPException, status

from sqlalchemy.orm import Session


from ..models import ShareLink, AccessType, SessionTemplate

from ..models.user import User, UserRole

from ..schemas.share_link import ShareLinkCreate


class ShareLinkService:

    """Service for creating and resolving template share links."""


    @staticmethod

    def _generate_unique_token(db: Session) -> str:

        for _ in range(5):

            token = secrets.token_urlsafe(32)

            exists = db.query(ShareLink).filter(ShareLink.token == token).first()

            if not exists:

                return token

        raise HTTPException(

            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail="Не вдалося створити унікальний share token. Спробуй ще раз."

        )


    @staticmethod

    def _ensure_template_owner(template: SessionTemplate, user: User) -> None:

        if template.owner_id != user.id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="У тебе немає доступу до цього шаблону."

            )


    @staticmethod

    def create_share_link(

        db: Session,

        template_id: int,

        share_data: ShareLinkCreate,

        user: User,

    ) -> ShareLink:

        template = db.query(SessionTemplate).filter(SessionTemplate.id == template_id).first()


        if not template:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Template not found"

            )


        ShareLinkService._ensure_template_owner(template, user)


        if template.session_type == "assessment" and user.role != UserRole.mentor:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Оціночні шаблони може поширювати лише ментор."

            )


        try:

            access_type = AccessType(share_data.access_type)

        except ValueError as exc:

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Access type must be public або private."

            ) from exc


        if access_type == AccessType.private and not (share_data.recipient_email or "").strip():

            raise HTTPException(

                status_code=status.HTTP_400_BAD_REQUEST,

                detail="Для приватного доступу вкажи логін/email користувача."

            )


        share_link = ShareLink(

            template_id=template.id,

            token=ShareLinkService._generate_unique_token(db),

            created_by=user.id,

            recipient_email=share_data.recipient_email.strip() if share_data.recipient_email else None,

            expires_at=share_data.expires_at,

            access_type=access_type,

        )

        db.add(share_link)

        db.commit()

        db.refresh(share_link)

        return share_link


    @staticmethod

    def resolve_share_link(db: Session, token: str) -> ShareLink:

        share_link = db.query(ShareLink).filter(ShareLink.token == token).first()


        if not share_link:

            raise HTTPException(

                status_code=status.HTTP_404_NOT_FOUND,

                detail="Share link not found"

            )


        if share_link.expires_at and share_link.expires_at < datetime.utcnow():

            raise HTTPException(

                status_code=status.HTTP_410_GONE,

                detail="Share link expired"

            )


        return share_link


    @staticmethod

    def get_template_for_share(

        db: Session,

        token: str,

        user: Optional[User],

    ) -> ShareLink:

        share_link = ShareLinkService.resolve_share_link(db, token)


        if share_link.access_type == AccessType.private and user is None:

            raise HTTPException(

                status_code=status.HTTP_401_UNAUTHORIZED,

                detail="Share link is private. Please sign in to continue."

            )


        if (

            share_link.access_type == AccessType.private

            and share_link.recipient_email

            and user.email.lower() != share_link.recipient_email.lower()

        ):

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Цей private invite призначений для іншого email."

            )


        return share_link


    @staticmethod

    def validate_share_access(

        db: Session,

        template_id: int,

        token: str,

        user: Optional[User],

    ) -> ShareLink:

        share_link = ShareLinkService.resolve_share_link(db, token)


        if share_link.template_id != template_id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Share link не відповідає цьому шаблону."

            )


        if share_link.access_type == AccessType.private and user is None:

            raise HTTPException(

                status_code=status.HTTP_401_UNAUTHORIZED,

                detail="Share link є приватним. Увійди, щоб продовжити."

            )


        if (

            share_link.access_type == AccessType.private

            and share_link.recipient_email

            and user.email.lower() != share_link.recipient_email.lower()

        ):

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Цей private invite призначений для іншого email."

            )


        return share_link

