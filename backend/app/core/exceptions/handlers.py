from fastapi import FastAPI, Request

from fastapi.exceptions import RequestValidationError

from fastapi.responses import JSONResponse

from starlette import status

from starlette.exceptions import HTTPException as StarletteHTTPException


def _json_safe_errors(errors: list) -> list:

    safe_errors = []

    for error in errors:

        safe_error = dict(error)

        if "ctx" in safe_error and isinstance(safe_error["ctx"], dict):

            safe_error["ctx"] = {

                key: str(value)

                for key, value in safe_error["ctx"].items()

            }

        safe_errors.append(safe_error)

    return safe_errors


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(StarletteHTTPException)

    async def http_exception_handler(

        request: Request,

        exc: StarletteHTTPException,

    ) -> JSONResponse:

        return JSONResponse(

            status_code=exc.status_code,

            headers=exc.headers,

            content={

                "error": {

                    "type": "http_error",

                    "message": exc.detail,

                    "path": str(request.url.path),

                }

            },

        )


    @app.exception_handler(RequestValidationError)

    async def validation_exception_handler(

        request: Request,

        exc: RequestValidationError,

    ) -> JSONResponse:

        return JSONResponse(

            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,

            content={

                "error": {

                    "type": "validation_error",

                    "message": "Request validation failed",

                    "path": str(request.url.path),

                    "details": _json_safe_errors(exc.errors()),

                }

            },

        )

