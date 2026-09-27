from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.modules.content.models import Genre

router = APIRouter(tags=["Platform Settings & Metadata"])


@router.get("/settings", response_model=Dict[str, Any])
async def get_site_settings():
    return {
        "id": "v19plus-platform-settings",
        "siteName": "V19plus",
        "tagline": "Master-Grade Streaming & High-Bitrate Ingestion",
        "logoUrl": "/logo.png",
        "faviconUrl": "/favicon.ico",
        "primaryColor": "#FF5C00",
        "footerText": "© 2026 V19plus. All rights reserved. High-bitrate HLS Streaming Platform.",
    }


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_categories(db: AsyncSession = Depends(get_db_session)):
    stmt = select(Genre).order_by(Genre.name)
    res = await db.execute(stmt)
    genres = res.scalars().all()

    categories = []
    for idx, g in enumerate(genres):
        categories.append({
            "id": str(g.id),
            "name": g.name,
            "slug": g.slug,
            "icon": "film",
            "sortOrder": idx + 1,
            "isActive": True,
        })
    return categories
