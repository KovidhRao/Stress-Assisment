"""
NHAA Voice Module
=================
Provides speech-to-text (Faster-Whisper), audio validation, and acoustic feature extraction.

NOTE: All acoustic features and voice metrics are supporting signals to aid
human response coordination and are NOT clinical or medical diagnoses.
"""

from .audio_validator import validate_audio_file
from .transcriber import transcribe_audio

def extract_acoustic_features(*args, **kwargs):
    from .acoustic_extractor import extract_acoustic_features as _fn
    return _fn(*args, **kwargs)

__all__ = ["validate_audio_file", "transcribe_audio", "extract_acoustic_features"]
