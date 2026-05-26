from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from datetime import timedelta

from ..core.database import get_db

from ..core.security import verify_password, create_access_token, get_password_hash, get_current_user

from ..models import User, UserRole

from ..schemas.user import UserCreate, UserLogin, UserResponse, Token

from ..core.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)

def register(user_data: UserCreate, db: Session = Depends(get_db)):

    """Register a new user"""


    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST,

            detail="Email already registered"

        )


    user = User(

        email=user_data.email,

        full_name=user_data.full_name,

        password_hash=get_password_hash(user_data.password),

        role=UserRole(user_data.role)

    )

    db.add(user)

    db.commit()

    db.refresh(user)

    return user


@router.post("/login", response_model=Token)

def login(user_data: UserLogin, db: Session = Depends(get_db)):

    """Login user and return access token"""

    user = db.query(User).filter(User.email == user_data.email).first()


    if not user or not verify_password(user_data.password, user.password_hash):

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Incorrect email or password",

            headers={"WWW-Authenticate": "Bearer"},

        )


    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(

        data={"sub": str(user.id)},

        expires_delta=access_token_expires

    )


    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)

def get_current_user_info(current_user: User = Depends(get_current_user)):

    """Get current user information"""

    return current_user

