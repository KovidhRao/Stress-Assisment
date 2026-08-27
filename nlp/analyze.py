import sys
import json
from pathlib import Path

BASE = Path(r"G:\dataset_nhaa")

sys.path.insert(0, str(BASE / "nlp"))

from utils.preprocess import preprocess_text
from indicator_extractor import analyze_text
from situation_classifier import detect_situation


def analyze_user_text(text):

    # -----------------------------
    # 1. Preprocessing
    # -----------------------------
    processed = preprocess_text(text)

    cleaned_text = processed["cleaned_text"]
    language = processed["language"]

    # -----------------------------
    # 2. Emotion + indicators
    # -----------------------------
    emotion_result = analyze_text(cleaned_text)

    # -----------------------------
    # 3. Situation detection
    # -----------------------------
    situation_result = detect_situation(cleaned_text)

    indicators = emotion_result["indicators"]

    # -----------------------------
    # 4. Final combined result
    # -----------------------------
    result = {
        "text": text,
        "language": language,

        "situation": situation_result["situation"],
        "situation_confidence": situation_result["confidence"],

        "emotion": emotion_result["emotion"],
        "emotion_confidence": emotion_result["emotion_confidence"],

        "fear": indicators.get("fear", 0.0),
        "anxiety": indicators.get("anxiety", 0.0),
        "distress": indicators.get("distress", 0.0),
        "trauma": indicators.get("trauma", 0.0),
        "threat": indicators.get("threat", 0.0),
        "isolation": indicators.get("isolation", 0.0),
        "vulnerability": indicators.get("vulnerability", 0.0),
        "stress": indicators.get("stress", 0.0),

        "matched_situation_rules":
            situation_result["matched_rules"]
    }

    return result


if __name__ == "__main__":

    test_cases = [

        "I am very worried about my exams and "
        "I cannot sleep.",

        "I feel completely alone and nobody "
        "is helping me.",

        "Someone has threatened me and I "
        "don't feel safe.",

        "We were forced to leave our home "
        "because of threats.",

        "They keep warning me to stay silent."
    ]

    print("=" * 70)
    print("NHAA COMPLETE NLP ANALYZER")
    print("=" * 70)

    for text in test_cases:

        print()
        print("-" * 70)
        print("INPUT:")
        print(text)

        result = analyze_user_text(text)

        print()
        print(json.dumps(
            result,
            indent=4
        ))

    print()
    print("=" * 70)
    print("NLP ANALYSIS COMPLETED")
    print("=" * 70)