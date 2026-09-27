from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.modules.content.models import ContentType
from src.modules.content.schemas import SearchResponse, SearchSuggestionResponse
from src.modules.content.service import ContentService

router = APIRouter(prefix="/search", tags=["Search & Discovery"])


@router.get("", response_model=SearchResponse)
async def search_content(
    q: str = Query(..., min_length=1, description="Search query string"),
    type: Optional[ContentType] = Query(None, description="Filter by content type"),
    genre: Optional[str] = Query(None, description="Filter by genre slug"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    items = await service.search(query=q, content_type=type, genre_slug=genre, limit=limit)
    return SearchResponse(results=items, query=q, total=len(items))


@router.get("/suggestions", response_model=List[SearchSuggestionResponse])
async def search_suggestions(
    q: str = Query(..., min_length=1, description="Prefix/substring query"),
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.get_suggestions(query=q, limit=limit)
