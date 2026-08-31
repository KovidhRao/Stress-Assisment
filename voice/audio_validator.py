"""
Audio Validation Utility for NHAA Voice Module
===============================================
Validates uploaded or recorded audio files prior to ASR (Faster-Whisper)
and acoustic processing.

NOTE: All acoustic features and voice metrics are supporting signals to aid
human response coordination and are NOT clinical or medical diagnoses.
"""

from pathlib import Path
from typing import Dict, Any, Tuple

SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
MIN_DURATION_SECONDS = 0.5
MAX_DURATION_SECONDS = 300.0  # 5 minutes


def validate_audio_file(
    file_path: str | Path,
    max_size: int = MAX_FILE_SIZE_BYTES
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates that the file exists, has a supported format, and is within size limits.

    Returns:
        (is_valid, error_message, file_info)
    """
    path = Path(file_path).resolve()

    if not path.exists():
        return False, f"Audio file does not exist: {path.name}", {}

    if not path.is_file():
        return False, f"Path is not a regular file: {path.name}", {}

    file_size = path.stat().st_size
    if file_size == 0:
        return False, "Audio file is empty (0 bytes).", {}

    if file_size > max_size:
        return (
            False,
            f"Audio file exceeds maximum size limit ({file_size / (1024*1024):.1f}MB > {max_size / (1024*1024):.0f}MB).",
            {"size_bytes": file_size}
        )

    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        return (
            False,
            f"Unsupported audio format '{suffix}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
            {"size_bytes": file_size, "extension": suffix}
        )

    file_info = {
        "file_name": path.name,
        "size_bytes": file_size,
        "extension": suffix,
        "absolute_path": str(path),
    }

    return True, "", file_info
