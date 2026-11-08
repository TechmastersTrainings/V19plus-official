import math
import pytest

def calculate_sprite_grid(duration: float, interval: int = 15, cols: int = 15):
    """
    Modular helper under test for scrubbing thumbnail sheet calculation.
    Must never produce 0 rows or 0 thumbs, even for 0 or negative duration.
    """
    total_thumbs = max(1, math.ceil(duration / interval)) if duration > 0 else 1
    rows = max(1, math.ceil(total_thumbs / cols))
    return total_thumbs, cols, rows

def format_vtt_timestamp(seconds: float) -> str:
    """Format float seconds to WebVTT timestamp (HH:MM:SS.mmm)."""
    seconds = max(0.0, float(seconds))
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"

def test_sprite_grid_math_standard_video():
    # 3600 seconds (1 hour) with 15s interval = 240 thumbnails
    total, cols, rows = calculate_sprite_grid(3600, interval=15, cols=15)
    assert total == 240
    assert cols == 15
    assert rows == 16 # 240 / 15 = 16

def test_sprite_grid_math_zero_duration_safe_clamp():
    """TDD Test: Duration = 0 must NOT result in 0 rows (which crashes FFmpeg tile=15x0)."""
    total, cols, rows = calculate_sprite_grid(0, interval=15, cols=15)
    assert total >= 1
    assert rows >= 1
    assert cols >= 1

def test_sprite_grid_math_short_video():
    # 7 seconds with 15s interval = 1 thumbnail
    total, cols, rows = calculate_sprite_grid(7, interval=15, cols=15)
    assert total == 1
    assert rows == 1

def test_format_vtt_timestamp():
    assert format_vtt_timestamp(0) == "00:00:00.000"
    assert format_vtt_timestamp(65.5) == "00:01:05.500"
    assert format_vtt_timestamp(3661.123) == "01:01:01.123"
    # Negative seconds must be clamped to 0
    assert format_vtt_timestamp(-10.5) == "00:00:00.000"

def test_hls_stream_mapping_generation():
    """Verify var_stream_map formatting for 4 quality tiers."""
    tiers = ["1080p", "720p", "480p", "360p"]
    stream_map = " ".join([f"v:{i},a:{i},name:{name}" for i, name in enumerate(tiers)])
    assert stream_map == "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p"

