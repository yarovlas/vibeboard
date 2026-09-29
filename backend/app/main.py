from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings

FRONTEND_DIR = Path(__file__).parent / "frontend"


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


class CORSMiddlewareForErrors(BaseHTTPMiddleware):
    """Add CORS headers to all responses, including error responses (401, 403, etc.)."""

    def __init__(self, app, allow_origins: list[str], allow_origin_regex: str | None):
        super().__init__(app)
        self.allow_origins = allow_origins
        self.allow_origin_regex = allow_origin_regex

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        response = await call_next(request)

        if origin:
            if origin in self.allow_origins or (
                self.allow_origin_regex
                and __import__("re").match(self.allow_origin_regex, origin)
            ):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"

        return response


if settings.SENTRY_DSN and settings.FASTAPI_ENV != "development":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

allow_origin_regex = (
    r"https?://(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?"
    if settings.FASTAPI_ENV == "development"
    else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_HOST],
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    CORSMiddlewareForErrors,
    allow_origins=[settings.FRONTEND_HOST],
    allow_origin_regex=allow_origin_regex,
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.frontend("/", directory=FRONTEND_DIR)
