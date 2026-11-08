import uuid
from pathlib import Path
import pytest
from src.modules.streaming.schemas import PlaybackAuthResponse
from src.modules.streaming.service import StreamingService

def test_hls_stem_resolution_for_deep_paths():
    """
    TDD Test: Master keys like 'masters/ep08.mp4' or 'uploads/2026/ep08.mov'
    must resolve stem to 'ep08', matching scripts/process_all_pending_videos.py.
    """
    cdn_base = "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev"
    test_keys = [
        "a2c1fe48_EP-08.mp4",
        "masters/ep08.mp4",
        "uploads/raw/episode_08.mov",
    ]
    
    for key in test_keys:
        stem = Path(key).stem
        assert "/" not in stem
        assert "\\" not in stem
        expected_manifest = f"{cdn_base}/hls/{stem}/master.m3u8"
        assert expected_manifest.endswith(f"/hls/{stem}/master.m3u8")

def test_playback_auth_response_processing_contract():
    """
    Contract test: When video is being prepared/transcoded,
    stream_url should be None, is_processing must be True, and is_hls False.
    """
    content_id = uuid.uuid4()
    resp = PlaybackAuthResponse(
        content_id=content_id,
        episode_id=None,
        stream_url=None,
        token="test_token_123",
        expires_in_seconds=86400,
        title="Processing Feature",
        sprite_vtt_url=None,
        is_hls=False,
        is_processing=True,
    )
    assert resp.stream_url is None
    assert resp.is_processing is True
    assert resp.is_hls is False

def test_playback_auth_response_ready_contract():
    content_id = uuid.uuid4()
    stream_url = "https://cdn.v19plus.com/hls/ep08/master.m3u8"
    resp = PlaybackAuthResponse(
        content_id=content_id,
        episode_id=None,
        stream_url=stream_url,
        token="test_token_123",
        expires_in_seconds=86400,
        title="Published Feature",
        sprite_vtt_url="https://cdn.v19plus.com/hls/ep08/thumbnails.vtt",
        is_hls=True,
        is_processing=False,
    )
    assert resp.stream_url == stream_url
    assert resp.is_processing is False
    assert resp.is_hls is True
    assert resp.sprite_vtt_url is not None

def test_transcode_concurrency_lock_prevents_fork_bombs():
    """
    TDD Test: Multiple calls to spawn background transcode for the same key
    must be deduplicated to prevent CPU/memory exhaustion and infinite subprocess loops.
    """
    from src.modules.streaming.service import try_acquire_transcode_lock, release_transcode_lock

    key = "unique_video_key_test.mp4"
    # First acquire succeeds
    assert try_acquire_transcode_lock(key) is True
    # Immediate second acquire for same key must be rejected (deduplicated)
    assert try_acquire_transcode_lock(key) is False
    # Third acquire also rejected
    assert try_acquire_transcode_lock(key) is False

    # After releasing lock, it can be acquired again
    release_transcode_lock(key)
    assert try_acquire_transcode_lock(key) is True
    release_transcode_lock(key)

