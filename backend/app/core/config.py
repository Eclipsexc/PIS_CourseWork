from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):


    APP_NAME: str = "AI Preparation Platform - Backend API"

    VERSION: str = "1.0.0"

    ENVIRONMENT: str = "development"

    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    LEGACY_API_PREFIX: str = "/api"


    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/prep_system"


    SECRET_KEY: str = "your-secret-key-change-in-production"

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


    AI_ML_SERVICE_URL: str = "http://localhost:8001"

    AI_ML_SERVICE_TIMEOUT_SECONDS: int = 60


    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3002", "http://localhost:8080"]


    REDIS_URL: Optional[str] = None

    MESSAGE_BROKER_URL: Optional[str] = None


    class Config:

        env_file = ".env"

        case_sensitive = True

        extra = "ignore"


settings = Settings()
