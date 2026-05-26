from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings

from .api.v1.router import api_router

from .core.exceptions.handlers import register_exception_handlers


app = FastAPI(

    title=settings.APP_NAME,

    version=settings.VERSION,

    debug=settings.DEBUG

)


register_exception_handlers(app)


app.add_middleware(

    CORSMiddleware,

    allow_origins=settings.BACKEND_CORS_ORIGINS,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


app.include_router(api_router, prefix=settings.API_V1_PREFIX)

app.include_router(api_router, prefix=settings.LEGACY_API_PREFIX)


@app.get("/")

def root():

    return {

        "message": "AI-Driven Session-Based Preparation and Assessment Platform",

        "version": settings.VERSION,

        "docs": "/docs"

    }


@app.get("/health")

def health_check():

    return {"status": "healthy"}

