import sys
import json
from pathlib import Path


# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE = Path(r"G:\dataset_nhaa")

NLP_DIR = BASE / "nlp"
UTILS_DIR = NLP_DIR / "utils"

# Allow Python to find modules in:
# G:\dataset_nhaa\nlp
# G:\dataset_nhaa\nlp\utils

sys.path.insert(0, str(NLP_DIR))
sys.path.insert(0, str(UTILS_DIR))


# ============================================================
# PROJECT MODULES
# ============================================================

from preprocess import preprocess_text
from indicator_extractor import analyze_text
from situation_classifier import detect_situation
from svi_engine import analyze_svi


# ============================================================
# OUTPUT DIRECTORY
# ============================================================

OUTPUT_DIR = BASE / "nlp" / "output"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# NHAA DAY 2 COMPLETE PIPELINE
# ============================================================
#
# TEXT
#   ↓
# Preprocessing
#   ↓
# Language Detection
#   ↓
# Emotion Analysis
#   ↓
# Indicator Extraction
#   ↓
# Situation Classification
#   ↓
# SVI Calculation
#   ↓
# Risk Category
#   ↓
# JSON Output
#
# Prototype only.
# SVI weights are not clinically validated.
# ============================================================


def analyze(text):

    # ========================================================
    # 1. PREPROCESSING
    # ========================================================

    preprocess_result = preprocess_text(text)

    if isinstance(preprocess_result, dict):

        cleaned_text = preprocess_result.get(
            "cleaned_text",
            text
        )

        language = preprocess_result.get(
            "language",
            "unknown"
        )

    else:

        cleaned_text = text
        language = "unknown"


    # ========================================================
    # 2. EMOTION + INDICATOR EXTRACTION
    # ========================================================

    emotion_result = analyze_text(
        cleaned_text
    )

    if not isinstance(
        emotion_result,
        dict
    ):

        raise ValueError(
            "indicator_extractor.analyze_text() "
            "must return a dictionary."
        )


    # ========================================================
    # 3. SITUATION CLASSIFICATION
    # ========================================================

    situation_result = detect_situation(
        cleaned_text
    )

    if not isinstance(
        situation_result,
        dict
    ):

        raise ValueError(
            "situation_classifier.detect_situation() "
            "must return a dictionary."
        )


    # ========================================================
    # 4. GET RAW INDICATORS
    # ========================================================

    raw_indicators = emotion_result.get(
        "indicators",
        {}
    )

    if not isinstance(
        raw_indicators,
        dict
    ):

        raw_indicators = {}


    # ========================================================
    # 5. STANDARDIZED INDICATORS
    # ========================================================
    #
    # Keep all indicators in one consistent structure.
    # ========================================================

    indicators = {

        "stress": float(
            raw_indicators.get(
                "stress",
                0.0
            )
        ),

        "fear": float(
            raw_indicators.get(
                "fear",
                0.0
            )
        ),

        "anxiety": float(
            raw_indicators.get(
                "anxiety",
                0.0
            )
        ),

        "distress": float(
            raw_indicators.get(
                "distress",
                0.0
            )
        ),

        "trauma": float(
            raw_indicators.get(
                "trauma",
                0.0
            )
        ),

        "threat": float(
            raw_indicators.get(
                "threat",
                0.0
            )
        ),

        "violence": float(
            raw_indicators.get(
                "violence",
                0.0
            )
        ),

        "immediate_danger": float(
            raw_indicators.get(
                "immediate_danger",
                0.0
            )
        ),

        "isolation": float(
            raw_indicators.get(
                "isolation",
                0.0
            )
        ),

        "vulnerability": float(
            raw_indicators.get(
                "vulnerability",
                0.0
            )
        )
    }


    # ========================================================
    # 6. EMOTION
    # ========================================================

    emotion = emotion_result.get(
        "emotion",
        "unknown"
    )

    emotion_confidence = float(
        emotion_result.get(
            "emotion_confidence",
            0.0
        )
    )


    # ========================================================
    # 7. SITUATION
    # ========================================================

    situation = situation_result.get(
        "situation",
        "UNKNOWN"
    )

    situation_confidence = float(
        situation_result.get(
            "confidence",
            0.0
        )
    )

    matched_rules = situation_result.get(
        "matched_rules",
        []
    )


    # ========================================================
    # 8. SVI
    # ========================================================
    #
    # This is the important integration:
    #
    # indicators
    # situation
    # situation confidence
    # emotion confidence
    #
    # are passed to the SVI engine.
    # ========================================================

    svi_result = analyze_svi(

        indicators=indicators,

        situation=situation,

        situation_confidence=
            situation_confidence,

        emotion_confidence=
            emotion_confidence
    )


    # ========================================================
    # 9. FINAL STANDARD AI OUTPUT
    # ========================================================

    result = {

        "text":
            text,

        "cleaned_text":
            cleaned_text,

        "language":
            language,

        "situation":
            situation,

        "situation_confidence":
            round(
                situation_confidence,
                4
            ),

        "emotion":
            emotion,

        "emotion_confidence":
            round(
                emotion_confidence,
                4
            ),

        "indicators":
            indicators,

        "svi":
            svi_result.get(
                "svi",
                0.0
            ),

        "risk_category":
            svi_result.get(
                "risk_category",
                "LOW"
            ),

        "svi_confidence":
            svi_result.get(
                "confidence",
                0.0
            ),

        "contributing_factors":
            svi_result.get(
                "contributing_factors",
                []
            ),

        "matched_situation_rules":
            matched_rules
    }


    return result


# ============================================================
# PRINT RESULT
# ============================================================

def print_result(
    test_name,
    text,
    result
):

    print()
    print("-" * 70)

    print(
        "TEST:",
        test_name
    )

    print(
        "INPUT:",
        text
    )

    print()

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )


# ============================================================
# SAVE RESULTS
# ============================================================

def save_results(results):

    output_file = (
        OUTPUT_DIR /
        "day2_pipeline_results.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            results,
            file,
            indent=4,
            ensure_ascii=False
        )

    return output_file


# ============================================================
# TEST CASES
# ============================================================

TEST_CASES = [

    (
        "ACADEMIC STRESS",

        "I am extremely stressed about my exams and my grades. I cannot sleep."
    ),

    (
        "ANXIETY",

        "I am constantly worried and anxious about my future."
    ),

    (
        "THREAT",

        "Someone has threatened me and I don't feel safe."
    ),

    (
        "SOCIAL ISOLATION",

        "I feel completely alone and nobody is helping me."
    ),

    (
        "DISPLACEMENT",

        "We were forced to leave our home because of threats."
    ),

    (
        "INTIMIDATION",

        "They keep warning me to stay silent."
    ),

    (
        "VIOLENCE",

        "Someone attacked me and I am afraid they may hurt me again."
    ),

    (
        "GRIEF",

        "I lost someone important to me and I feel deeply sad and empty."
    ),

    (
        "LOW",

        "I had a normal day and I feel calm and comfortable."
    )
]


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("NHAA DAY 2 COMPLETE NLP PIPELINE")
    print("=" * 70)

    all_results = []


    # ========================================================
    # RUN ALL TEST CASES
    # ========================================================

    for test_name, text in TEST_CASES:

        try:

            result = analyze(
                text
            )

            print_result(
                test_name,
                text,
                result
            )

            all_results.append({

                "test":
                    test_name,

                "result":
                    result
            })


        except Exception as error:

            print()
            print("-" * 70)

            print(
                "TEST:",
                test_name
            )

            print(
                "ERROR:",
                str(error)
            )

            all_results.append({

                "test":
                    test_name,

                "error":
                    str(error)
            })


    # ========================================================
    # SAVE ALL RESULTS
    # ========================================================

    output_file = save_results(
        all_results
    )


    # ========================================================
    # COMPLETION
    # ========================================================

    print()
    print("=" * 70)
    print("DAY 2 PIPELINE COMPLETED")
    print("=" * 70)

    print()
    print(
        "Results saved to:"
    )

    print(
        output_file
    )