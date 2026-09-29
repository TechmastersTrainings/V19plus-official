import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.database import async_engine
from src.redis import init_redis, close_redis
from src.core.exceptions import V19plusException, v19plus_exception_handler
from src.modules.health.router import router as health_router
from src.modules.auth.router import router as auth_router
from src.modules.content.router import router as content_router
from src.modules.media.router import router as media_router
from src.modules.streaming.router import router as streaming_router
from src.modules.payments.router import router as payments_router
from src.modules.video_jobs.router import router as video_jobs_router
from src.modules.content.search_router import router as search_router
from src.modules.streaming.watchlist_router import router as watchlist_router
from src.modules.content.settings_router import router as settings_router
from src.modules.admin.router import router as admin_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("v19plus.api")

# Optional Sentry initialization
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.2 if settings.ENVIRONMENT == "production" else 1.0,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        )
        logger.info("Sentry monitoring initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Sentry: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Starting V19plus API server in Singapore region...")
    await init_redis()
    yield
    # Shutdown sequence
    logger.info("Shutting down V19plus API server...")
    await close_redis()
    await async_engine.dispose()
    logger.info("All connection pools closed cleanly.")


app = FastAPI(
    title="V19plus OTT Platform API",
    description="Production-grade API for V19plus OTT streaming, large-scale media ingestion, and entitlement management.",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "ETag"],
)

# Register Exception Handlers
app.add_exception_handler(V19plusException, v19plus_exception_handler)

# Mount Routes under /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(streaming_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(video_jobs_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(watchlist_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "V19plus Platform API",
        "version": "1.0.0",
        "domain": "https://v19plus.com",
        "region": "singapore",
        "status": "operational",
    }
