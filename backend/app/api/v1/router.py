from fastapi import APIRouter


from app.api import attempts_router, auth_router, mentor_router, templates_router, analytics_router

from app.api.share import router as share_router


api_router = APIRouter()

api_router.include_router(auth_router)

api_router.include_router(templates_router)

api_router.include_router(attempts_router)

api_router.include_router(mentor_router)

api_router.include_router(analytics_router)

api_router.include_router(share_router)
