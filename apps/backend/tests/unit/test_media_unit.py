import math
import pytest
from src.modules.media.schemas import InitiateMultipartUploadRequest

def calculate_multipart_chunks(file_size_bytes: int, chunk_size_bytes: int = 64 * 1024 * 1024):
    """Calculate total parts for multipart upload."""
    if file_size_bytes <= 0:
        return 0
    return math.ceil(file_size_bytes / chunk_size_bytes)

def test_multipart_chunk_math_25gb():
    file_25gb_bytes = 25 * 1024 * 1024 * 1024 # 26,843,545,600 bytes
    total_parts = calculate_multipart_chunks(file_25gb_bytes, 64 * 1024 * 1024)
    assert total_parts == 400

def test_multipart_chunk_math_small_and_boundary_files():
    # Exactly 64MB
    assert calculate_multipart_chunks(64 * 1024 * 1024, 64 * 1024 * 1024) == 1
    # 64MB + 1 byte
    assert calculate_multipart_chunks(64 * 1024 * 1024 + 1, 64 * 1024 * 1024) == 2
    # 10MB
    assert calculate_multipart_chunks(10 * 1024 * 1024, 64 * 1024 * 1024) == 1
    # 0 bytes
    assert calculate_multipart_chunks(0, 64 * 1024 * 1024) == 0

def test_initiate_multipart_upload_schema():
    req = InitiateMultipartUploadRequest(
        filename="Test_Episode_08_Master.mp4",
        file_size_bytes=5 * 1024 * 1024 * 1024,
        content_type="video/mp4",
    )
    assert req.filename == "Test_Episode_08_Master.mp4"
    assert req.file_size_bytes == 5 * 1024 * 1024 * 1024

