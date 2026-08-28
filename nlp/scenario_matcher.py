import re
from pathlib import Path

import pandas as pd


# ============================================================
# NHAA NATURAL SCENARIO MATCHER
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "nhaa_general_scenarios.csv"

INDICATORS = [
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
# LOAD DATASET
# ============================================================

def load_scenarios():

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Scenario dataset not found: {DATA_FILE}"
        )

    df = pd.read_csv(
        DATA_FILE
    )

    required_columns = [
        "text",
        "situation",
        *INDICATORS
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing columns: {missing}"
        )

    df["text"] = (
        df["text"]
        .fillna("")
        .astype(str)
    )

    df["situation"] = (
        df["situation"]
        .fillna("UNKNOWN")
        .astype(str)
    )

    return df


SCENARIOS = load_scenarios()


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text):

    if text is None:
        return ""

    text = str(text).lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# TOKENIZATION
# ============================================================

def tokenize(text):

    text = normalize_text(
        text
    )

    return re.findall(
        r"[a-z0-9']+",
        text
    )


# ============================================================
# WORD OVERLAP
# ============================================================

def word_overlap(
    input_text,
    scenario_text
):

    input_tokens = set(
        tokenize(input_text)
    )

    scenario_tokens = set(
        tokenize(scenario_text)
    )

    if not input_tokens or not scenario_tokens:
        return 0.0

    common = (
        input_tokens &
        scenario_tokens
    )

    # Jaccard is safer than dividing
    # only by scenario length.

    union = (
        input_tokens |
        scenario_tokens
    )

    if not union:
        return 0.0

    return (
        len(common) /
        len(union)
    )


# ============================================================
# PHRASE OVERLAP
# ============================================================

def phrase_overlap(
    input_text,
    scenario_text
):

    input_text = normalize_text(
        input_text
    )

    scenario_tokens = tokenize(
        scenario_text
    )

    if not scenario_tokens:
        return 0.0

    matched = 0
    useful = 0

    for token in scenario_tokens:

        if len(token) < 4:
            continue

        useful += 1

        if token in input_text:
            matched += 1

    if useful == 0:
        return 0.0

    return (
        matched /
        useful
    )


# ============================================================
# CHARACTER SIMILARITY
# ============================================================

def character_similarity(
    input_text,
    scenario_text
):

    input_text = normalize_text(
        input_text
    )

    scenario_text = normalize_text(
        scenario_text
    )

    if not input_text or not scenario_text:
        return 0.0

    def ngrams(
        text,
        n=3
    ):

        if len(text) < n:
            return {text}

        return {
            text[i:i+n]
            for i in range(
                len(text) - n + 1
            )
        }

    a = ngrams(
        input_text
    )

    b = ngrams(
        scenario_text
    )

    if not a or not b:
        return 0.0

    intersection = len(
        a & b
    )

    union = len(
        a | b
    )

    if union == 0:
        return 0.0

    return (
        intersection /
        union
    )


# ============================================================
# SCENARIO SIMILARITY
# ============================================================

def scenario_similarity(
    input_text,
    scenario_text
):

    word_score = word_overlap(
        input_text,
        scenario_text
    )

    phrase_score = phrase_overlap(
        input_text,
        scenario_text
    )

    char_score = character_similarity(
        input_text,
        scenario_text
    )

    score = (
        0.50 * word_score
        +
        0.35 * phrase_score
        +
        0.15 * char_score
    )

    return min(
        1.0,
        score
    )


# ============================================================
# CONFIDENCE FROM SIMILARITY
# ============================================================

def similarity_confidence(
    score
):

    """
    Convert similarity into confidence.

    Very weak matches should have very little
    influence.

    Strong matches should dominate.
    """

    if score >= 0.80:
        return 1.00

    if score >= 0.65:
        return 0.85

    if score >= 0.50:
        return 0.60

    if score >= 0.35:
        return 0.30

    if score >= 0.20:
        return 0.10

    return 0.0


# ============================================================
# FIND SIMILAR SCENARIOS
# ============================================================

def find_similar_scenarios(
    text,
    top_k=5,
    minimum_score=0.20
):

    text = normalize_text(
        text
    )

    if not text:
        return []

    results = []

    for index, row in SCENARIOS.iterrows():

        score = scenario_similarity(
            text,
            row["text"]
        )

        confidence = similarity_confidence(
            score
        )

        if confidence <= 0:
            continue

        results.append({

            "index":
                int(index),

            "text":
                row["text"],

            "situation":
                row["situation"],

            "score":
                round(
                    score,
                    4
                ),

            "confidence":
                round(
                    confidence,
                    4
                ),

            "indicators": {
                indicator:
                    float(
                        row[indicator]
                    )
                    for indicator
                    in INDICATORS
            }
        })

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return results[
        :top_k
    ]


# ============================================================
# PREDICT INDICATORS
# ============================================================

def predict_indicators(
    text,
    top_k=5,
    minimum_score=0.20
):

    matches = find_similar_scenarios(
        text,
        top_k=top_k,
        minimum_score=minimum_score
    )

    # --------------------------------------------------------
    # No meaningful match
    # --------------------------------------------------------

    if not matches:

        return {

            "indicators": {
                indicator: 0.0
                for indicator
                in INDICATORS
            },

            "situation":
                "UNKNOWN",

            "situation_confidence":
                0.0,

            "matches":
                []
        }

    # --------------------------------------------------------
    # BEST MATCH
    # --------------------------------------------------------

    best = matches[0]

    best_score = best[
        "score"
    ]

    best_confidence = best[
        "confidence"
    ]

    # --------------------------------------------------------
    # INDICATORS
    # --------------------------------------------------------
    #
    # IMPORTANT:
    #
    # We no longer average all nearby scenarios equally.
    #
    # The strongest matching scenario is the main evidence.
    #
    # Weak neighboring scenarios get only a small contribution.
    #

    indicators = {
        indicator: 0.0
        for indicator
        in INDICATORS
    }

    # Strong primary evidence

    for indicator in INDICATORS:

        indicators[
            indicator
        ] = (
            best[
                "indicators"
            ][indicator]
            *
            best_confidence
        )

    # --------------------------------------------------------
    # SECONDARY EVIDENCE
    # --------------------------------------------------------
    #
    # Only accept secondary evidence if it is reasonably
    # strong AND agrees with the best scenario.
    #

    for match in matches[1:]:

        secondary_score = (
            match["score"]
        )

        if secondary_score < 0.45:
            continue

        # Secondary evidence is intentionally weak.

        secondary_weight = (
            0.20 *
            match["confidence"]
        )

        for indicator in INDICATORS:

            candidate = (
                match[
                    "indicators"
                ][indicator]
                *
                secondary_weight
            )

            # Do not allow secondary evidence
            # to overpower the primary scenario.

            indicators[
                indicator
            ] = max(
                indicators[
                    indicator
                ],
                candidate
            )

    # --------------------------------------------------------
    # SAFETY INDICATORS
    # --------------------------------------------------------
    #
    # These must be conservative.
    #
    # Do not infer them simply because a story is difficult.
    #

    for indicator in [
        "threat",
        "violence",
        "immediate_danger",
    ]:

        # If the best scenario itself does not contain
        # evidence, remove weak secondary leakage.

        if best[
            "indicators"
        ][indicator] == 0:

            indicators[
                indicator
            ] = 0.0

    # --------------------------------------------------------
    # ISOLATION / VULNERABILITY
    # --------------------------------------------------------
    #
    # These may legitimately appear together with distress,
    # but should still come primarily from the best match.
    #

    # No extra boost here.

    # --------------------------------------------------------
    # NORMALIZE
    # --------------------------------------------------------

    indicators = {

        indicator:
            round(
                min(
                    max(
                        value,
                        0.0
                    ),
                    1.0
                ),
                4
            )

        for indicator, value
        in indicators.items()
    }

    # --------------------------------------------------------
    # SITUATION
    # --------------------------------------------------------

    situation_scores = {}

    for match in matches:

        situation = match[
            "situation"
        ]

        weight = (
            match["score"]
            *
            match["confidence"]
        )

        situation_scores[
            situation
        ] = (
            situation_scores.get(
                situation,
                0.0
            )
            +
            weight
        )

    best_situation = max(
        situation_scores,
        key=situation_scores.get
    )

    total_score = sum(
        situation_scores.values()
    )

    if total_score > 0:

        situation_confidence = (
            situation_scores[
                best_situation
            ]
            /
            total_score
        )

    else:

        situation_confidence = 0.0

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {

        "indicators":
            indicators,

        "situation":
            best_situation,

        "situation_confidence":
            round(
                min(
                    situation_confidence,
                    1.0
                ),
                4
            ),

        "matches":
            matches
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 70)
    print(
        "NHAA NATURAL SCENARIO MATCHER TEST"
    )
    print("=" * 70)

    tests = [

        (
            "Things have been difficult at home recently, "
            "and I feel like I can't handle everything by myself."
        ),

        (
            "I have been struggling to keep up with "
            "everything at college lately."
        ),

        (
            "I keep worrying about what might happen next."
        ),

        (
            "I don't really have anyone I can talk to about this."
        ),

        (
            "I am scared about what might happen if I speak up."
        ),

        (
            "I had to leave my home unexpectedly and "
            "I don't know where we will stay."
        ),

        (
            "They attacked me and I was hurt."
        ),

        (
            "I am in danger right now and I don't know what to do."
        ),

        (
            "I feel completely alone and have nobody to talk to."
        ),

        (
            "I keep getting more work and I don't know "
            "how I will finish everything."
        )
    ]

    for number, text in enumerate(
        tests,
        start=1
    ):

        print()
        print("-" * 70)
        print(
            f"TEST {number}"
        )

        print()
        print(
            "Input:"
        )

        print(text)

        result = predict_indicators(
            text
        )

        print()
        print(
            "Predicted situation:",
            result["situation"]
        )

        print(
            "Situation confidence:",
            result[
                "situation_confidence"
            ]
        )

        print()
        print(
            "Indicators:"
        )

        for indicator in INDICATORS:

            print(
                f"  {indicator:<20}"
                f"{result['indicators'][indicator]:.4f}"
            )

        print()
        print(
            "Closest scenarios:"
        )

        for match in result[
            "matches"
        ][:3]:

            print(
                f"  "
                f"score={match['score']:.4f} "
                f"confidence={match['confidence']:.2f} "
                f"{match['text']}"
            )

    print()
    print("=" * 70)
    print(
        "NATURAL SCENARIO MATCHER TEST COMPLETED"
    )
    print("=" * 70)