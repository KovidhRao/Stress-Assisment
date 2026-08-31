"""
Unit Tests for Voice Acoustic Feature Extractor (Phase 2)
=========================================================
Tests:
1. Normal speech-like audio (F0, RMS, spectral, MFCC, voice activity)
2. Pure silence (safe zeroing, 1.0 pause ratio)
3. Invalid / corrupt audio (graceful error handling)
4. Transcript + speech rate calculation (WPM)
"""

import os
import wave
import struct
import tempfile
import unittest
import numpy as np

from voice.acoustic_extractor import extract_acoustic_features


def _create_wav_file(samples: np.ndarray, sr: int = 16000) -> str:
    """Helper to write float numpy samples [-1.0, 1.0] to a temporary 16-bit PCM WAV file."""
    temp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_path = temp.name
    temp.close()

    clipped = np.clip(samples, -1.0, 1.0)
    int_samples = (clipped * 32767).astype(np.int16)

    with wave.open(temp_path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(int_samples.tobytes())

    return temp_path


class TestAcousticExtractor(unittest.TestCase):

    def test_1_normal_speech_audio(self):
        """Test extraction on speech-like harmonic signal with a pause interval."""
        sr = 16000
        duration = 2.5
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)

        # 200 Hz tone with harmonic at 400 Hz for speech simulation
        tone = 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 400 * t)

        # Introduce a 0.5s pause in the middle (t between 1.0s and 1.5s)
        pause_mask = (t >= 1.0) & (t <= 1.5)
        tone[pause_mask] = 0.0

        wav_path = _create_wav_file(tone, sr=sr)
        try:
            result = extract_acoustic_features(wav_path, top_db=20.0)

            self.assertTrue(result["success"])
            self.assertAlmostEqual(result["duration_seconds"], 2.5, delta=0.1)

            # Energy / RMS
            self.assertIn("rms_mean", result["energy"])
            self.assertIn("rms_max", result["energy"])
            self.assertGreater(result["energy"]["rms_mean"], 0.0)
            self.assertGreaterEqual(result["energy"]["rms_max"], result["energy"]["rms_mean"])

            # Pitch / F0
            self.assertIn("mean_pitch_hz", result["pitch"])
            self.assertAlmostEqual(result["pitch"]["mean_pitch_hz"], 200.0, delta=20.0)
            self.assertGreater(result["pitch"]["voiced_ratio"], 0.3)

            # Voice Activity
            va = result["voice_activity"]
            self.assertGreater(va["speech_duration_seconds"], 1.0)
            self.assertGreater(va["pause_duration_seconds"], 0.2)
            self.assertGreater(va["pause_count"], 0)
            self.assertEqual(va["top_db_threshold"], 20.0)

            # Spectral features
            sp = result["spectral"]
            self.assertGreater(sp["spectral_centroid_mean"], 0.0)
            self.assertGreater(sp["spectral_bandwidth_mean"], 0.0)
            self.assertGreater(sp["zero_crossing_rate_mean"], 0.0)

            # MFCCs 1-13
            mfcc = result["mfcc"]
            for i in range(1, 14):
                self.assertIn(f"mfcc_{i}", mfcc)
                self.assertIsInstance(mfcc[f"mfcc_{i}"], float)

            # Disclaimer
            self.assertIn("disclaimer", result)
            self.assertIn("observational supporting signals", result["disclaimer"])
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    def test_2_silence(self):
        """Test extraction on pure silence (safe zeroing, no division by zero)."""
        sr = 16000
        duration = 2.0
        silence = np.zeros(int(sr * duration), dtype=np.float32)

        wav_path = _create_wav_file(silence, sr=sr)
        try:
            result = extract_acoustic_features(wav_path)

            self.assertTrue(result["success"])
            self.assertAlmostEqual(result["duration_seconds"], 2.0, delta=0.05)

            # Pure silence checks
            self.assertEqual(result["energy"]["rms_mean"], 0.0)
            self.assertEqual(result["energy"]["rms_max"], 0.0)
            self.assertEqual(result["pitch"]["mean_pitch_hz"], 0.0)
            self.assertEqual(result["pitch"]["voiced_ratio"], 0.0)
            self.assertEqual(result["voice_activity"]["speech_duration_seconds"], 0.0)
            self.assertAlmostEqual(result["voice_activity"]["pause_duration_ratio"], 1.0, delta=0.01)

            for i in range(1, 14):
                self.assertEqual(result["mfcc"][f"mfcc_{i}"], 0.0)
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    def test_3_invalid_and_corrupt_audio(self):
        """Test extraction handles non-existent or corrupted files safely."""
        # Non-existent file
        result_missing = extract_acoustic_features("non_existent_audio_file.wav")
        self.assertFalse(result_missing["success"])
        self.assertIn("error", result_missing)

        # Corrupt file (plain text disguised as wav)
        temp_corrupt = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_corrupt.write(b"NOT_A_REAL_AUDIO_FILE_DATA_CORRUPT")
        temp_corrupt_path = temp_corrupt.name
        temp_corrupt.close()

        try:
            result_corrupt = extract_acoustic_features(temp_corrupt_path)
            self.assertFalse(result_corrupt["success"])
            self.assertIn("error", result_corrupt)
        finally:
            if os.path.exists(temp_corrupt_path):
                os.remove(temp_corrupt_path)

    def test_4_transcript_and_speech_rate(self):
        """Test speech rate calculation combining transcript with duration."""
        sr = 16000
        duration = 3.0  # 3 seconds = 0.05 minutes
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        tone = 0.4 * np.sin(2 * np.pi * 220 * t)

        wav_path = _create_wav_file(tone, sr=sr)
        try:
            # 8 words in 3.0 seconds -> 8 / (3 / 60) = 160.0 WPM
            transcript_sample = "This is a test speech transcript for rate."
            result = extract_acoustic_features(wav_path, transcript=transcript_sample)

            self.assertTrue(result["success"])
            sr_info = result["speech_rate"]
            self.assertEqual(sr_info["words_count"], 8)
            self.assertAlmostEqual(sr_info["speech_rate_wpm"], 160.0, delta=1.0)
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)


if __name__ == "__main__":
    unittest.main()
