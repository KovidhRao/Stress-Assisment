import librosa
import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm

BASE = Path(r"G:\dataset_nhaa")

AUDIO_DIR = BASE / "data" / "ravdess" / "audio"
OUTPUT = BASE / "data" / "voice_features.csv"

# RAVDESS emotion codes
EMOTIONS = {
    "01": "neutral",
    "02": "calm",
    "03": "happy",
    "04": "sad",
    "05": "angry",
    "06": "fearful",
    "07": "disgust",
    "08": "surprised"
}

rows = []

files = list(AUDIO_DIR.rglob("*.wav"))

print("======================================")
print("NHAA RAVDESS VOICE FEATURE EXTRACTION")
print("======================================")
print("WAV files found:", len(files))
print()

for i, file in enumerate(tqdm(files), start=1):

    try:
        # Load audio at 16 kHz
        y, sr = librosa.load(file, sr=16000, mono=True)

        # Filename format:
        # 03-01-06-01-02-01-12.wav
        parts = file.stem.split("-")

        if len(parts) != 7:
            continue

        emotion_code = parts[2]
        emotion = EMOTIONS.get(emotion_code, "unknown")

        # Duration
        duration = len(y) / sr

        # RMS energy
        rms = librosa.feature.rms(y=y)[0]
        energy = float(np.mean(rms))

        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zero_crossing_rate = float(np.mean(zcr))

        # MFCC features
        mfcc = librosa.feature.mfcc(
            y=y,
            sr=sr,
            n_mfcc=13
        )

        mfcc_means = np.mean(mfcc, axis=1)

        # Spectral centroid
        spectral_centroid = librosa.feature.spectral_centroid(
            y=y,
            sr=sr
        )[0]

        spectral_centroid_mean = float(
            np.mean(spectral_centroid)
        )

        # Spectral bandwidth
        spectral_bandwidth = librosa.feature.spectral_bandwidth(
            y=y,
            sr=sr
        )[0]

        spectral_bandwidth_mean = float(
            np.mean(spectral_bandwidth)
        )

        rows.append({
            "file_id": file.stem,
            "emotion": emotion,
            "duration": duration,
            "energy": energy,
            "zero_crossing_rate": zero_crossing_rate,
            "spectral_centroid": spectral_centroid_mean,
            "spectral_bandwidth": spectral_bandwidth_mean,

            "mfcc_1": mfcc_means[0],
            "mfcc_2": mfcc_means[1],
            "mfcc_3": mfcc_means[2],
            "mfcc_4": mfcc_means[3],
            "mfcc_5": mfcc_means[4],
            "mfcc_6": mfcc_means[5],
            "mfcc_7": mfcc_means[6],
            "mfcc_8": mfcc_means[7],
            "mfcc_9": mfcc_means[8],
            "mfcc_10": mfcc_means[9],
            "mfcc_11": mfcc_means[10],
            "mfcc_12": mfcc_means[11],
            "mfcc_13": mfcc_means[12]
        })

    except Exception as e:
        print("\nERROR:", file)
        print(e)

# Create DataFrame
df = pd.DataFrame(rows)

# Create output folder
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# Save CSV
df.to_csv(OUTPUT, index=False)

print()
print("======================================")
print("VOICE FEATURES CREATED SUCCESSFULLY")
print("======================================")
print("File:", OUTPUT)
print("Rows:", len(df))
print("Columns:", len(df.columns))
print()
print("Emotion distribution:")
print(df["emotion"].value_counts())