import sys
import json
from pathlib import Path


# ============================================================
# NHAA DAY 2 COMPLETE NLP PIPELINE
# ============================================================
#
# USER STORY
#     ↓
# Preprocessing + Language Detection
#     ↓
# Multilingual NLP Bridge
#     ↓
# Dictionary + Emotion + Indicator Extraction
#     ↓
# Situation Classification
#     ↓
# SVI
#     ↓
# Risk Category
#     ↓
# JSON OUTPUT
#
# Original user text is always preserved.
#
# NOTE:
# SVI is a prototype and is NOT clinically validated.
# ============================================================


# ============================================================
# PROJECT PATHS
# ============================================================

BASE = Path(__file__).resolve().parent.parent

NLP_DIR = BASE / "nlp"
UTILS_DIR = NLP_DIR / "utils"
OUTPUT_DIR = NLP_DIR / "output"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# PYTHON IMPORT PATHS
# ============================================================

sys.path.insert(
    0,
    str(NLP_DIR)
)

sys.path.insert(
    0,
    str(UTILS_DIR)
)


# ============================================================
# IMPORT MODULES
# ============================================================

try:
    from preprocess import preprocess_text

except ImportError as error:

    print("=" * 70)
    print("ERROR: PREPROCESSING MODULE NOT FOUND")
    print("=" * 70)
    print(error)
    sys.exit(1)


try:
    from multilingual_nlp import prepare_analysis_text

except ImportError as error:

    print("=" * 70)
    print("ERROR: MULTILINGUAL NLP MODULE NOT FOUND")
    print("=" * 70)
    print(error)
    sys.exit(1)


try:
    from indicator_extractor import analyze_text

except ImportError as error:

    print("=" * 70)
    print("ERROR: INDICATOR MODULE NOT FOUND")
    print("=" * 70)
    print(error)
    sys.exit(1)


try:
    from situation_classifier import detect_situation

except ImportError as error:

    print("=" * 70)
    print("ERROR: SITUATION CLASSIFIER NOT FOUND")
    print("=" * 70)
    print(error)
    sys.exit(1)


try:
    from svi_engine import analyze_svi

except ImportError as error:

    print("=" * 70)
    print("ERROR: SVI ENGINE NOT FOUND")
    print("=" * 70)
    print(error)
    sys.exit(1)


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
    "vulnerability"
]


# ============================================================
# SAFE FLOAT
# ============================================================

def safe_float(value):

    try:
        return float(value)

    except (
        TypeError,
        ValueError
    ):

        return 0.0


# ============================================================
# NORMALIZE INDICATORS
# ============================================================

def normalize_indicators(raw_indicators):

    if not isinstance(
        raw_indicators,
        dict
    ):

        raw_indicators = {}

    indicators = {}

    for name in INDICATOR_NAMES:

        value = safe_float(
            raw_indicators.get(
                name,
                0.0
            )
        )

        # Keep indicators between 0 and 1.
        value = max(
            0.0,
            min(
                value,
                1.0
            )
        )

        indicators[name] = round(
            value,
            4
        )

    return indicators


# ============================================================
# NORMALIZE MATCHED INDICATOR KEYWORDS
# ============================================================

def normalize_indicator_keywords(raw_keywords):

    if not isinstance(
        raw_keywords,
        dict
    ):

        raw_keywords = {}

    result = {}

    for name in INDICATOR_NAMES:

        matches = raw_keywords.get(
            name,
            []
        )

        if not isinstance(
            matches,
            list
        ):

            matches = []

        # Convert everything to strings.
        clean_matches = []

        for item in matches:

            if item is None:
                continue

            clean_matches.append(
                str(item)
            )

        result[name] = clean_matches

    return result


# ============================================================
# SITUATION RESULT
# ============================================================

def get_situation_result(result):

    if not isinstance(
        result,
        dict
    ):

        return {
            "situation": "UNKNOWN",
            "confidence": 0.0,
            "matched_rules": []
        }

    situation = result.get(
        "situation",
        "UNKNOWN"
    )

    confidence = safe_float(
        result.get(
            "confidence",
            result.get(
                "situation_confidence",
                0.0
            )
        )
    )

    matched_rules = result.get(
        "matched_rules",
        result.get(
            "matched_situation_rules",
            []
        )
    )

    if not isinstance(
        matched_rules,
        list
    ):

        matched_rules = []

    return {
        "situation": situation,
        "confidence": round(
            confidence,
            4
        ),
        "matched_rules": matched_rules
    }


# ============================================================
# COMPLETE STORY ANALYSIS
# ============================================================

def analyze(text):

    # --------------------------------------------------------
    # 1. ORIGINAL TEXT
    # --------------------------------------------------------

    if text is None:

        text = ""

    text = str(text).strip()

    if not text:

        raise ValueError(
            "Story cannot be empty."
        )


    # --------------------------------------------------------
    # 2. PREPROCESSING
    # --------------------------------------------------------

    preprocess_result = preprocess_text(
        text
    )

    if not isinstance(
        preprocess_result,
        dict
    ):

        preprocess_result = {}

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
        "Unknown"
    )

    romanized = bool(
        preprocess_result.get(
            "romanized",
            False
        )
    )

    romanized_language = (
        preprocess_result.get(
            "romanized_language"
        )
    )

    romanized_confidence = safe_float(
        preprocess_result.get(
            "romanized_confidence",
            0.0
        )
    )


    # --------------------------------------------------------
    # 3. MULTILINGUAL NLP BRIDGE
    # --------------------------------------------------------

    multilingual_result = (
        prepare_analysis_text(
            cleaned_text,
            language,
            romanized
        )
    )

    if not isinstance(
        multilingual_result,
        dict
    ):

        multilingual_result = {}

    analysis_text = (
        multilingual_result.get(
            "analysis_text",
            cleaned_text
        )
    )

    translated = bool(
        multilingual_result.get(
            "translated",
            False
        )
    )

    translation_method = (
        multilingual_result.get(
            "translation_method",
            None
        )
    )


    # --------------------------------------------------------
    # 4. EMOTION + MULTILINGUAL INDICATORS
    # --------------------------------------------------------
    #
    # IMPORTANT:
    #
    # Do NOT send only analysis_text.
    #
    # We pass:
    #
    #   analysis_text
    #   language
    #   romanized
    #   cleaned_text
    #
    # This allows indicator_extractor.py to use the
    # multilingual dictionary for native and Romanized
    # languages.
    #
    # --------------------------------------------------------

    try:

        emotion_result = analyze_text(
            analysis_text,
            language,
            romanized,
            cleaned_text
        )

    except TypeError:

        # Backward compatibility with an older
        # indicator_extractor.py.

        emotion_result = analyze_text(
            analysis_text
        )


    if not isinstance(
        emotion_result,
        dict
    ):

        emotion_result = {}


    # --------------------------------------------------------
    # EMOTION
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
    # INDICATORS
    # --------------------------------------------------------

    raw_indicators = (
        emotion_result.get(
            "indicators",
            {}
        )
    )

    indicators = normalize_indicators(
        raw_indicators
    )


    # --------------------------------------------------------
    # MATCHED INDICATOR KEYWORDS
    # --------------------------------------------------------

    raw_indicator_keywords = (
        emotion_result.get(
            "matched_indicator_keywords",
            emotion_result.get(
                "matched_keywords",
                {}
            )
        )
    )

    matched_indicator_keywords = (
        normalize_indicator_keywords(
            raw_indicator_keywords
        )
    )


    # --------------------------------------------------------
    # 5. SITUATION CLASSIFICATION
    # --------------------------------------------------------
    #
    # IMPORTANT FIX:
    #
    # Pass multilingual dictionary evidence and indicators
    # into the situation classifier.
    #
    # This is important for:
    #
    #   English
    #   Native Telugu
    #   Romanized Telugu
    #   Native Hindi
    #   Romanized Hindi
    #   Tamil
    #   Kannada
    #
    # Instead of relying only on analysis_text.
    #
    # --------------------------------------------------------

    try:

        situation_raw = detect_situation(
            cleaned_text,
            analysis_text,
            indicators,
            matched_indicator_keywords
        )

    except TypeError:

        # Compatibility with older situation_classifier.py

        try:

            situation_raw = detect_situation(
                analysis_text,
                indicators,
                matched_indicator_keywords
            )

        except TypeError:

            try:

                situation_raw = detect_situation(
                    analysis_text,
                    indicators
                )

            except TypeError:

                situation_raw = detect_situation(
                    analysis_text
                )


    situation_result = (
        get_situation_result(
            situation_raw
        )
    )

    situation = (
        situation_result[
            "situation"
        ]
    )

    situation_confidence = (
        situation_result[
            "confidence"
        ]
    )

    matched_rules = (
        situation_result[
            "matched_rules"
        ]
    )


    # --------------------------------------------------------
    # 6. SVI
    # --------------------------------------------------------

    svi_result = analyze_svi(

        indicators=indicators,

        situation=situation,

        situation_confidence=
            situation_confidence,

        emotion_confidence=
            emotion_confidence
    )

    if not isinstance(
        svi_result,
        dict
    ):

        svi_result = {}


    svi = safe_float(
        svi_result.get(
            "svi",
            0.0
        )
    )

    risk_category = (
        svi_result.get(
            "risk_category",
            "LOW"
        )
    )

    svi_confidence = safe_float(
        svi_result.get(
            "confidence",
            svi_result.get(
                "svi_confidence",
                0.0
            )
        )
    )

    contributing_factors = (
        svi_result.get(
            "contributing_factors",
            []
        )
    )

    if not isinstance(
        contributing_factors,
        list
    ):

        contributing_factors = []


    # --------------------------------------------------------
    # 7. STANDARD JSON OUTPUT
    # --------------------------------------------------------

    result = {

        # Original user story
        "text":
            text,

        # Cleaned version
        "cleaned_text":
            cleaned_text,

        # Language information
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

        # Translation / analysis
        "analysis_text":
            analysis_text,

        "translated":
            translated,

        "translation_method":
            translation_method,

        # Situation
        "situation":
            situation,

        "situation_confidence":
            situation_confidence,

        # Emotion
        "emotion":
            emotion,

        "emotion_confidence":
            round(
                emotion_confidence,
                4
            ),

        # Indicators
        "indicators":
            indicators,

        # Exact dictionary / indicator evidence
        "matched_indicator_keywords":
            matched_indicator_keywords,

        # SVI
        "svi":
            round(
                svi,
                2
            ),

        "risk_category":
            risk_category,

        "svi_confidence":
            round(
                svi_confidence,
                4
            ),

        # SVI contributing factors
        "contributing_factors":
            contributing_factors,

        # Situation rules
        "matched_situation_rules":
            matched_rules
    }


    return result


# ============================================================
# PRINT RESULT
# ============================================================

def print_result(
    test_name,
    result
):

    print()

    print(
        "-" * 70
    )

    print(
        "TEST:",
        test_name
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

def save_results(
    results
):

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
# TEST STORIES
# ============================================================

TEST_CASES = [

    (
        "ENGLISH",
        "I am extremely stressed about my exams and my grades. I cannot sleep."
    ),

    (
        "ROMANIZED HINDI",
        "mujhe exams ko lekar bahut tension hai"
    ),

    (
        "ROMANIZED TELUGU",
        "naku exams gurinchi chala tension ga undi"
    ),

    (
        "ROMANIZED TAMIL",
        "enakku romba bayama irukku"
    ),

    (
        "ROMANIZED KANNADA",
        "nanage tumba bhaya ide"
    ),

    (
        "NATIVE HINDI",
        "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।"
    ),

    (
        "NATIVE TELUGU",
        "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది."
    ),

    (
        "GENERAL FAMILY STRESS",
        "Things have been difficult at home recently, and I feel like I can't handle everything by myself."
    ),

    (
        "GENERAL ISOLATION",
        "I have nobody to turn to and I am dealing with all of this alone."
    ),

    (
        "GENERAL ANXIETY",
        "I keep thinking something bad is going to happen and I cannot relax."
    ),

    (
        "INTIMIDATION",
        "I am scared about what might happen if I speak up."
    ),

    (
        "DISPLACEMENT",
        "I had to leave my home unexpectedly and I don't know where we will stay."
    ),

    (
        "VIOLENCE",
        "Someone physically attacked me and I am scared it could happen again."
    ),

    (
        "IMMEDIATE DANGER",
        "I am in danger right now and I don't know what to do."
    ),

    (
        "WORK STRESS",
        "I keep getting more work and I don't know how I will finish everything."
    )
]


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print()

    print(
        "=" * 70
    )

    print(
        "NHAA DAY 2 MULTILINGUAL NLP PIPELINE"
    )

    print(
        "=" * 70
    )

    print()

    all_results = []


    for test_name, text in TEST_CASES:

        try:

            result = analyze(
                text
            )

            print_result(
                test_name,
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

            print(
                "-" * 70
            )

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


    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    output_file = save_results(
        all_results
    )


    print()

    print(
        "=" * 70
    )

    print(
        "DAY 2 MULTILINGUAL PIPELINE COMPLETED"
    )

    print(
        "=" * 70
    )

    print()

    print(
        "Results saved to:"
    )

    print(
        output_file
    )