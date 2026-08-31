"""
Speech-to-Text Transcriber using Faster-Whisper
==============================================
Provides local, fast multilingual speech-to-text transcription.

NOTE: All acoustic features and voice metrics are supporting signals to aid
human response coordination and are NOT clinical or medical diagnoses.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

# Supported language code mapping
LANGUAGE_MAP = {
    "hindi": "hi",
    "english": "en",
    "telugu": "te",
    "tamil": "ta",
    "marathi": "mr",
    "bengali": "bn",
    "kannada": "kn",
    "gujarati": "gu",
    "punjabi": "pa",
    "urdu": "ur",
    "malayalam": "ml",
    "odia": "or",
}

# Cache for the loaded Whisper model to avoid reloading on repeated calls
_MODEL_CACHE: Dict[str, Any] = {}


def get_whisper_model(model_size: str = "tiny"):
    """
    Returns a cached Faster-Whisper WhisperModel instance running on CPU with int8 quantization.
    """
    from faster_whisper import WhisperModel

    if model_size not in _MODEL_CACHE:
        # device="cpu", compute_type="int8" provides fast inference with low memory overhead
        _MODEL_CACHE[model_size] = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8"
        )
    return _MODEL_CACHE[model_size]


def normalize_language_code(lang: Optional[str]) -> Optional[str]:
    """
    Normalizes language name or regional code (e.g., 'hi-IN', 'Hindi', 'hi') to standard ISO 639-1.
    """
    if not lang:
        return None
    cleaned = lang.strip().lower().split("-")[0].split("_")[0]
    return LANGUAGE_MAP.get(cleaned, cleaned)


def transcribe_audio(
    audio_path: str | Path,
    language: Optional[str] = None,
    model_size: str = "tiny"
) -> Dict[str, Any]:
    """
    Transcribes an audio file using Faster-Whisper.

    Args:
        audio_path: Path to the audio file (.wav, .mp3, .webm, .ogg, .m4a).
        language: Optional language code (e.g., 'hi', 'en', 'te'). If None, auto-detects.
        model_size: Faster-Whisper model size ('tiny', 'base', 'small'). Default: 'tiny'.

    Returns:
        Dict containing success status, transcript, detected language, duration, words count, and segments.
    """
    path = Path(audio_path).resolve()
    if not path.exists():
        return {
            "success": False,
            "error": f"Audio file not found: {path}",
            "transcript": "",
            "language": language or "en",
            "duration_seconds": 0.0,
            "words_count": 0,
        }

    lang_code = normalize_language_code(language)

    try:
        model = get_whisper_model(model_size=model_size)
        segments, info = model.transcribe(
            str(path),
            language=lang_code,
            beam_size=5,
            vad_filter=True,  # Voice Activity Detection filter to strip leading/trailing silence
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        segment_list = []
        transcript_parts = []

        for seg in segments:
            text = seg.text.strip()
            if text:
                transcript_parts.append(text)
                segment_list.append({
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text,
                })

        full_transcript = " ".join(transcript_parts).strip()
        duration_seconds = round(float(info.duration), 2)
        detected_lang = info.language or lang_code or "en"
        words_count = len(full_transcript.split()) if full_transcript else 0

        return {
            "success": True,
            "transcript": full_transcript,
            "language": detected_lang,
            "language_probability": round(float(info.language_probability), 4) if hasattr(info, "language_probability") else 1.0,
            "duration_seconds": duration_seconds,
            "words_count": words_count,
            "segments": segment_list,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "transcript": "",
            "language": lang_code or "en",
            "duration_seconds": 0.0,
            "words_count": 0,
        }


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio using Faster-Whisper")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--language", "-l", default=None, help="Spoken language code (e.g., 'hi', 'en')")
    parser.add_argument("--model", "-m", default="tiny", help="Whisper model size ('tiny', 'base', 'small')")

    args = parser.parse_args()
    result = transcribe_audio(
        audio_path=args.audio_path,
        language=args.language,
        model_size=args.model
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
