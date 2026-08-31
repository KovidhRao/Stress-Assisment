"""
Acoustic Feature Extractor for NHAA Voice Module
================================================
Extracts acoustic features from an audio file using librosa.
Reuses the feature extraction logic from process_voice.py (RMS, ZCR, Spectral Centroid,
Spectral Bandwidth, and MFCCs 1-13) and adds fundamental frequency (F0), voiced ratio,
configurable voice activity / pause detection, and transcript-based speech rate.

NOTE: All acoustic features and voice metrics are observational supporting signals
to assist response coordination and are NOT clinical, medical, or psychiatric diagnoses.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
import librosa

DISCLAIMER_TEXT = (
    "Acoustic features are observational supporting signals to assist response "
    "coordination and are NOT clinical or medical diagnoses."
)


def _safe_float(val: Any, default: float = 0.0, ndigits: int = 4) -> float:
    """Safely converts a numpy/float value to rounded Python float, replacing NaN/Inf with default."""
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return round(f, ndigits)
    except (TypeError, ValueError):
        return default


def _empty_features(
    file_id: str,
    duration: float = 0.0,
    top_db: float = 25.0,
    transcript: Optional[str] = None
) -> Dict[str, Any]:
    """Returns a structured, zeroed feature dictionary for silent or unvoiced audio."""
    words = transcript.strip().split() if transcript else []
    words_count = len(words)
    wpm = round((words_count / (duration / 60.0)), 1) if duration > 0 and words_count > 0 else 0.0

    return {
        "success": True,
        "file_id": file_id,
        "duration_seconds": round(duration, 3),
        "pitch": {
            "mean_pitch_hz": 0.0,
            "min_pitch_hz": 0.0,
            "max_pitch_hz": 0.0,
            "pitch_std_hz": 0.0,
            "voiced_ratio": 0.0,
        },
        "energy": {
            "rms_mean": 0.0,
            "rms_max": 0.0,
        },
        "voice_activity": {
            "speech_duration_seconds": 0.0,
            "pause_duration_seconds": round(duration, 3),
            "pause_duration_ratio": 1.0 if duration > 0 else 0.0,
            "pause_count": 0,
            "top_db_threshold": float(top_db),
        },
        "speech_rate": {
            "words_count": words_count,
            "speech_rate_wpm": wpm,
        },
        "spectral": {
            "zero_crossing_rate_mean": 0.0,
            "spectral_centroid_mean": 0.0,
            "spectral_bandwidth_mean": 0.0,
        },
        "mfcc": {f"mfcc_{i}": 0.0 for i in range(1, 14)},
        "disclaimer": DISCLAIMER_TEXT,
    }


def extract_acoustic_features(
    audio_path: str | Path,
    transcript: Optional[str] = None,
    top_db: float = 25.0,
    target_sr: int = 16000,
    fmin: float = 65.0,
    fmax: float = 500.0,
) -> Dict[str, Any]:
    """
    Extracts acoustic features from an audio file.

    Args:
        audio_path: Path to the audio file (.wav, .mp3, .webm, .ogg, .m4a, .flac).
        transcript: Optional transcript text from Phase 1 to calculate speech rate.
        top_db: The threshold (in decibels) below reference to consider as silence
                in librosa.effects.split(). Configurable for different noise conditions.
        target_sr: Target sample rate in Hz (default: 16000).
        fmin: Minimum frequency in Hz for pitch tracking (default: 65.0, ~C2).
        fmax: Maximum frequency in Hz for pitch tracking (default: 500.0, ~B4).

    Returns:
        Structured dictionary containing acoustic measurements and observational signals.
    """
    path = Path(audio_path).resolve()
    file_id = path.stem

    if not path.exists():
        return {
            "success": False,
            "file_id": file_id,
            "error": f"Audio file does not exist: {path}",
            "disclaimer": DISCLAIMER_TEXT,
        }

    if not path.is_file() or path.stat().st_size == 0:
        return {
            "success": False,
            "file_id": file_id,
            "error": f"Audio file is empty or not a regular file: {path.name}",
            "disclaimer": DISCLAIMER_TEXT,
        }

    try:
        y, sr = librosa.load(str(path), sr=target_sr, mono=True)
    except Exception as e:
        return {
            "success": False,
            "file_id": file_id,
            "error": f"Failed to decode audio file ({type(e).__name__}): {str(e)}",
            "disclaimer": DISCLAIMER_TEXT,
        }

    total_samples = len(y)
    if total_samples == 0:
        return _empty_features(file_id, duration=0.0, top_db=top_db, transcript=transcript)

    duration = float(total_samples / sr)

    # Check for near-total silence
    max_amp = float(np.max(np.abs(y))) if total_samples > 0 else 0.0
    if max_amp < 1e-6:
        return _empty_features(file_id, duration=duration, top_db=top_db, transcript=transcript)

    # ── 1. Energy / RMS (reusing process_voice.py logic) ───────────────────
    rms = librosa.feature.rms(y=y)[0]
    rms_mean = _safe_float(np.mean(rms), 0.0, 5)
    rms_max = _safe_float(np.max(rms), 0.0, 5)

    # ── 2. Zero Crossing Rate (reusing process_voice.py logic) ─────────────
    zcr = librosa.feature.zero_crossing_rate(y=y)[0]
    zero_crossing_rate_mean = _safe_float(np.mean(zcr), 0.0, 5)

    # ── 3. Spectral Centroid (reusing process_voice.py logic) ──────────────
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spectral_centroid_mean = _safe_float(np.mean(spectral_centroid), 0.0, 2)

    # ── 4. Spectral Bandwidth (reusing process_voice.py logic) ─────────────
    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    spectral_bandwidth_mean = _safe_float(np.mean(spectral_bandwidth), 0.0, 2)

    # ── 5. 13 MFCC Features (reusing process_voice.py logic) ──────────────
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = np.mean(mfcc, axis=1)
    mfcc_dict = {
        f"mfcc_{i + 1}": _safe_float(mfcc_means[i], 0.0, 3)
        for i in range(13)
    }

    # ── 6. Pitch / Fundamental Frequency (F0) & Voiced Ratio ──────────────
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=fmin,
            fmax=fmax,
            sr=sr,
            frame_length=2048,
            hop_length=512,
        )
        valid_f0 = f0[voiced_flag & ~np.isnan(f0)] if voiced_flag is not None else np.array([])
        total_frames = len(voiced_flag) if voiced_flag is not None else 0
        voiced_frames = len(valid_f0)

        voiced_ratio = _safe_float(voiced_frames / total_frames, 0.0, 4) if total_frames > 0 else 0.0
        mean_pitch = _safe_float(np.mean(valid_f0), 0.0, 2) if voiced_frames > 0 else 0.0
        min_pitch = _safe_float(np.min(valid_f0), 0.0, 2) if voiced_frames > 0 else 0.0
        max_pitch = _safe_float(np.max(valid_f0), 0.0, 2) if voiced_frames > 0 else 0.0
        pitch_std = _safe_float(np.std(valid_f0), 0.0, 2) if voiced_frames > 1 else 0.0
    except Exception as e:
        # Graceful fallback if pitch estimation encounters any numerical anomaly
        mean_pitch = min_pitch = max_pitch = pitch_std = voiced_ratio = 0.0

    # ── 7. Voice Activity & Pause Detection (Configurable top_db) ──────────
    try:
        intervals = librosa.effects.split(y, top_db=top_db)
        if len(intervals) > 0:
            speech_samples = sum(int(end - start) for start, end in intervals)
            speech_duration = _safe_float(speech_samples / sr, 0.0, 3)
            pause_duration = _safe_float(max(0.0, duration - speech_duration), 0.0, 3)
            pause_ratio = _safe_float(pause_duration / duration, 0.0, 3) if duration > 0 else 0.0

            # Count pauses: gaps between speech intervals (> 200 ms) + start/end margins
            pause_count = 0
            min_gap_samples = int(sr * 0.20)  # 200 ms minimum silence to count as distinct pause
            if intervals[0][0] >= min_gap_samples:
                pause_count += 1
            for i in range(len(intervals) - 1):
                gap = intervals[i + 1][0] - intervals[i][1]
                if gap >= min_gap_samples:
                    pause_count += 1
            if total_samples - intervals[-1][1] >= min_gap_samples:
                pause_count += 1
        else:
            speech_duration = 0.0
            pause_duration = _safe_float(duration, 0.0, 3)
            pause_ratio = 1.0
            pause_count = 0
    except Exception:
        speech_duration = _safe_float(duration, 0.0, 3)
        pause_duration = 0.0
        pause_ratio = 0.0
        pause_count = 0

    # ── 8. Speech Rate (WPM) using Transcript ──────────────────────────────
    words = transcript.strip().split() if transcript else []
    words_count = len(words)
    duration_min = duration / 60.0
    speech_rate_wpm = _safe_float(words_count / duration_min, 0.0, 1) if duration_min > 0 and words_count > 0 else 0.0

    return {
        "success": True,
        "file_id": file_id,
        "duration_seconds": round(duration, 3),
        "pitch": {
            "mean_pitch_hz": mean_pitch,
            "min_pitch_hz": min_pitch,
            "max_pitch_hz": max_pitch,
            "pitch_std_hz": pitch_std,
            "voiced_ratio": voiced_ratio,
        },
        "energy": {
            "rms_mean": rms_mean,
            "rms_max": rms_max,
        },
        "voice_activity": {
            "speech_duration_seconds": speech_duration,
            "pause_duration_seconds": pause_duration,
            "pause_duration_ratio": pause_ratio,
            "pause_count": pause_count,
            "top_db_threshold": float(top_db),
        },
        "speech_rate": {
            "words_count": words_count,
            "speech_rate_wpm": speech_rate_wpm,
        },
        "spectral": {
            "zero_crossing_rate_mean": zero_crossing_rate_mean,
            "spectral_centroid_mean": spectral_centroid_mean,
            "spectral_bandwidth_mean": spectral_bandwidth_mean,
        },
        "mfcc": mfcc_dict,
        "disclaimer": DISCLAIMER_TEXT,
    }


def main():
    parser = argparse.ArgumentParser(description="Extract acoustic features from audio file")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--transcript", "-t", default=None, help="Transcript text to calculate speech rate")
    parser.add_argument("--top_db", type=float, default=25.0, help="VAD silence threshold in dB (default: 25.0)")

    args = parser.parse_args()
    features = extract_acoustic_features(
        audio_path=args.audio_path,
        transcript=args.transcript,
        top_db=args.top_db
    )
    print(json.dumps(features, indent=2))


if __name__ == "__main__":
    main()
