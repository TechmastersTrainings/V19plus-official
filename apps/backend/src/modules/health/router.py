import time
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.redis import get_redis_client
from src.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db_session)):
    start_time = time.time()
    checks = {
        "status": "healthy",
        "service": "v19plus-api",
        "environment": settings.ENVIRONMENT,
        "region": "singapore",
        "database": "unknown",
        "redis": "unknown",
    }

    # Test Database
    try:
        db_start = time.time()
        await db.execute(text("SELECT 1"))
        checks["database"] = f"connected ({int((time.time() - db_start) * 1000)}ms)"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        checks["status"] = "degraded"

    # Test Redis
    try:
        redis = get_redis_client()
        if redis:
            r_start = time.time()
            await redis.ping()
            checks["redis"] = f"connected ({int((time.time() - r_start) * 1000)}ms)"
        else:
            checks["redis"] = "disconnected (optional caching degraded)"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    checks["latency_ms"] = int((time.time() - start_time) * 1000)

    http_status = status.HTTP_200_OK if checks["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=checks)
