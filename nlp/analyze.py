import sys
import json
from pathlib import Path

# ============================================================
# NHAA USER STORY ANALYZER
# ============================================================

# ============================================================
# PATHS
# ============================================================

BASE = Path(__file__).resolve().parent.parent
NLP_DIR = BASE / "nlp"
UTILS_DIR = NLP_DIR / "utils"

sys.path.insert(0, str(NLP_DIR))
sys.path.insert(0, str(UTILS_DIR))

# ============================================================
# IMPORTS
# ============================================================

from preprocess import preprocess_text
from indicator_extractor import analyze_text
from situation_classifier import detect_situation
from svi_engine import analyze_svi
from multilingual_nlp import prepare_analysis_text


# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = NLP_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# INDICATOR NAMES
# ============================================================

INDICATOR_NAMES = [
    "stress",
    "fear",
    "anxiety",
    "distress",
    "trauma",
    "threat",
    "violence",
    "immediate_danger",
    "isolation",
    "vulnerability",
]


# ============================================================
# SAFE FLOAT
# ============================================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# NORMALIZE INDICATORS
# ============================================================

def normalize_indicators(raw_indicators):
    """
    Always return all NHAA indicators.

    Missing values become 0.0.
    Values are restricted to 0.0 - 1.0.
    """

    indicators = {}

    for name in INDICATOR_NAMES:

        value = safe_float(
            raw_indicators.get(name, 0.0)
        )

        value = max(
            0.0,
            min(value, 1.0)
        )

        indicators[name] = round(
            value,
            4
        )

    return indicators


# ============================================================
# MERGE INDICATORS
# ============================================================

def merge_indicators(*indicator_sets):
    """
    Merge indicator evidence from multiple sources.

    We use the strongest available value.

    Example:

        dictionary fear      = 1.0
        model fear           = 0.0

    final fear = 1.0

    This prevents the ML emotion model from hiding
    strong multilingual dictionary evidence.
    """

    merged = {
        name: 0.0
        for name in INDICATOR_NAMES
    }

    for indicator_set in indicator_sets:

        if not indicator_set:
            continue

        for name in INDICATOR_NAMES:

            value = safe_float(
                indicator_set.get(
                    name,
                    0.0
                )
            )

            value = max(
                0.0,
                min(value, 1.0)
            )

            merged[name] = max(
                merged[name],
                value
            )

    return {
        name: round(
            value,
            4
        )
        for name, value in merged.items()
    }


# ============================================================
# ANALYZE USER STORY
# ============================================================

def analyze_user_story(text):

    # --------------------------------------------------------
    # 1. PREPROCESSING
    # --------------------------------------------------------

    preprocess_result = preprocess_text(text)

    cleaned_text = preprocess_result.get(
        "cleaned_text",
        text
    )

    language = preprocess_result.get(
        "language",
        "unknown"
    )

    language_name = preprocess_result.get(
        "language_name",
        language
    )

    romanized = preprocess_result.get(
        "romanized",
        False
    )

    romanized_language = preprocess_result.get(
        "romanized_language",
        None
    )

    romanized_confidence = safe_float(
        preprocess_result.get(
            "romanized_confidence",
            0.0
        )
    )

    # --------------------------------------------------------
    # 2. MULTILINGUAL TRANSLATION
    # --------------------------------------------------------

    translation_result = prepare_analysis_text(
        cleaned_text,
        language,
        romanized
    )

    analysis_text = translation_result.get(
        "analysis_text",
        cleaned_text
    )

    translated = translation_result.get(
        "translated",
        False
    )

    translation_method = translation_result.get(
        "translation_method",
        "none"
    )

    # --------------------------------------------------------
    # 3. EMOTION + MULTILINGUAL INDICATORS
    # --------------------------------------------------------
    #
    # indicator_extractor now uses:
    #
    #   ORIGINAL LANGUAGE
    #        +
    #   ROMANIZED DICTIONARY
    #        +
    #   TRANSLATED ENGLISH
    #        +
    #   ENGLISH CONCEPT DICTIONARY
    #
    # Therefore we do NOT throw away the multilingual
    # dictionary evidence.
    # --------------------------------------------------------

    emotion_result = analyze_text(
        text=cleaned_text,
        language=language,
        romanized=romanized,
        analysis_text=analysis_text
    )

    raw_indicators = emotion_result.get(
        "indicators",
        {}
    )

    indicators = normalize_indicators(
        raw_indicators
    )

    # --------------------------------------------------------
    # 4. SITUATION
    # --------------------------------------------------------

    situation_result = detect_situation(
        analysis_text
    )

    situation = situation_result.get(
        "situation",
        "UNKNOWN"
    )

    situation_confidence = safe_float(
        situation_result.get(
            "confidence",
            0.0
        )
    )

    matched_rules = situation_result.get(
        "matched_rules",
        []
    )

    # --------------------------------------------------------
    # 5. EMOTION
    # --------------------------------------------------------

    emotion = emotion_result.get(
        "emotion",
        "unknown"
    )

    emotion_confidence = safe_float(
        emotion_result.get(
            "emotion_confidence",
            0.0
        )
    )

    # --------------------------------------------------------
    # 6. SVI
    # --------------------------------------------------------

    svi_result = analyze_svi(
        indicators=indicators,
        situation=situation,
        situation_confidence=situation_confidence,
        emotion_confidence=emotion_confidence
    )

    # --------------------------------------------------------
    # 7. FINAL RESULT
    # --------------------------------------------------------

    result = {

        "text": text,

        "cleaned_text":
            cleaned_text,

        "language":
            language,

        "language_name":
            language_name,

        "romanized":
            romanized,

        "romanized_language":
            romanized_language,

        "romanized_confidence":
            round(
                romanized_confidence,
                4
            ),

        "analysis_text":
            analysis_text,

        "translated":
            translated,

        "translation_method":
            translation_method,

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
            matched_rules,

        "matched_indicator_keywords":
            emotion_result.get(
                "matched_indicator_keywords",
                {}
            )
    }

    return result


# ============================================================
# PRINT RESULT
# ============================================================

def print_result(result):

    print()
    print("=" * 70)
    print("NHAA USER STORY ANALYSIS")
    print("=" * 70)

    print()

    print("Original story:")
    print(result["text"])

    print()

    print("Cleaned text:")
    print(result["cleaned_text"])

    print()

    print(
        "Language:",
        result["language_name"]
    )

    print(
        "Language code:",
        result["language"]
    )

    print(
        "Romanized:",
        result["romanized"]
    )

    if result["romanized"]:

        print(
            "Romanized language:",
            result["romanized_language"]
        )

        print(
            "Romanized confidence:",
            result["romanized_confidence"]
        )

    print()

    print("Analysis text:")
    print(result["analysis_text"])

    print()

    print(
        "Translated:",
        result["translated"]
    )

    print(
        "Translation method:",
        result["translation_method"]
    )

    print()

    print(
        "Situation:",
        result["situation"]
    )

    print(
        "Situation confidence:",
        result["situation_confidence"]
    )

    print()

    print(
        "Emotion:",
        result["emotion"]
    )

    print(
        "Emotion confidence:",
        result["emotion_confidence"]
    )

    print()

    print("Indicators:")

    for name, value in result[
        "indicators"
    ].items():

        print(
            f"  {name:<20}"
            f"{value:.4f}"
        )

    print()

    print(
        "SVI:",
        result["svi"]
    )

    print(
        "Risk category:",
        result["risk_category"]
    )

    print(
        "SVI confidence:",
        result["svi_confidence"]
    )

    print()

    print("Contributing factors:")

    factors = result[
        "contributing_factors"
    ]

    if factors:

        for factor in factors:

            print(
                f"  "
                f"{factor['indicator']:<20}"
                f"{factor['contribution']:.2f}"
            )

    else:

        print("  None")

    print()

    print("Matched situation rules:")

    rules = result[
        "matched_situation_rules"
    ]

    if rules:

        for rule in rules:

            print(
                f"  {rule}"
            )

    else:

        print("  None")

    print()

    print("Matched indicator keywords:")

    matched = result[
        "matched_indicator_keywords"
    ]

    found_any = False

    for indicator, words in matched.items():

        if words:

            found_any = True

            print(
                f"  {indicator}: {words}"
            )

    if not found_any:

        print("  None")


# ============================================================
# SAVE RESULT
# ============================================================

def save_result(result):

    output_file = (
        OUTPUT_DIR /
        "user_story_analysis.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            result,
            file,
            indent=4,
            ensure_ascii=False
        )

    return output_file


# ============================================================
# INTERACTIVE USER STORY MODE
# ============================================================

def main():

    print("=" * 70)
    print("NHAA USER STORY ANALYZER")
    print("=" * 70)

    print()

    print(
        "Enter the user's story."
    )

    print(
        "Supported languages:"
    )

    print(
        "English / Telugu / Hindi / Tamil / Kannada"
    )

    print(
        "Gujarati / Punjabi / Marathi / Bengali / Urdu"
    )

    print(
        "Romanized Indian languages"
    )

    print()

    while True:

        try:

            text = input(
                "USER STORY: "
            ).strip()

        except (
            KeyboardInterrupt,
            EOFError
        ):

            print()
            print("Exiting...")
            break

        # ----------------------------------------------------
        # Empty story
        # ----------------------------------------------------

        if not text:

            print(
                "Please enter a story."
            )

            continue

        # ----------------------------------------------------
        # ANALYZE
        # ----------------------------------------------------

        try:

            result = analyze_user_story(
                text
            )

            print_result(
                result
            )

            output_file = save_result(
                result
            )

            print()

            print(
                "Analysis saved to:"
            )

            print(
                output_file
            )

        except Exception as error:

            print()

            print("=" * 70)
            print("ERROR")
            print("=" * 70)

            print()

            print(
                str(error)
            )

        print()

        try:

            again = input(
                "Analyze another story? (y/n): "
            ).strip().lower()

        except (
            KeyboardInterrupt,
            EOFError
        ):

            break

        if again != "y":

            break

    print()

    print("=" * 70)
    print(
        "NHAA USER STORY ANALYSIS COMPLETED"
    )
    print("=" * 70)


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()