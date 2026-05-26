from .auth import router as auth_router

from .templates import router as templates_router

from .attempts import router as attempts_router

from .mentor import router as mentor_router

from .analytics import router as analytics_router


__all__ = [

    "auth_router",

    "templates_router",

    "attempts_router",

    "mentor_router",

    "analytics_router",

]
