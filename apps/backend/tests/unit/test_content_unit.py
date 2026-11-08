import uuid
import pytest
from src.modules.content.service import slugify
from src.modules.content.schemas import ContentCreate, ContentUpdate
from src.modules.content.models import ContentType, ContentStatus

def test_slugify_logic():
    assert slugify("The Great Himalayan Journey") == "the-great-himalayan-journey"
    assert slugify("EIGHTH TASK - DOOM SESSION | SURVIVAL ARENA") == "eighth-task-doom-session-survival-arena"
    assert slugify("Special & Characters @ 2026!") == "special-characters-2026"
    assert slugify("   Multiple   Spaces   ") == "multiple-spaces"

def test_content_create_schema_defaults_and_validation():
    req = ContentCreate(
        title="Epic Documentary",
        description="A great story about nature.",
        content_type=ContentType.DOCUMENTARY,
        release_year=2026,
        rating="U/A 13+",
        duration_seconds=5400,
        is_original=True,
        is_featured=True,
    )
    assert req.title == "Epic Documentary"
    assert req.content_type == ContentType.DOCUMENTARY
    assert req.release_year == 2026
    assert req.duration_seconds == 5400

def test_content_update_schema():
    upd = ContentUpdate(
        title="Updated Title",
        duration_seconds=3600,
    )
    dumped = upd.model_dump(exclude_unset=True)
    assert dumped["title"] == "Updated Title"
    assert dumped["duration_seconds"] == 3600
    assert "description" not in dumped

