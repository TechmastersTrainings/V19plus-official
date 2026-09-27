import logging
from typing import Optional
import redis.asyncio as aioredis
from src.config import settings

logger = logging.getLogger("v19plus.redis")

_redis_client: Optional[aioredis.Redis] = None


async def init_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=3,
                retry_on_timeout=True,
            )
            await _redis_client.ping()
            logger.info("Connected to Redis / Render Key-Value.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Fallback to mock/degraded caching.")
            _redis_client = None
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed.")


def get_redis_client() -> Optional[aioredis.Redis]:
    return _redis_client
