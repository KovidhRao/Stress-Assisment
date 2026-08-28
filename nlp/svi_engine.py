# ============================================================
# NHAA STRESS VULNERABILITY INDEX (SVI)
# ============================================================

WEIGHTS = {
    "stress": 8,
    "fear": 12,
    "anxiety": 12,
    "distress": 12,
    "trauma": 10,
    "threat": 16,
    "violence": 15,
    "immediate_danger": 10,
    "isolation": 3,
    "vulnerability": 2
}


SITUATION_SEVERITY = {
    "UNKNOWN": 0,
    "ACADEMIC_STRESS": 0,
    "GENERAL_ANXIETY": 5,
    "GRIEF": 5,
    "SOCIAL_ISOLATION": 5,
    "FEAR": 10,
    "DISPLACEMENT": 10,
    "SOCIAL_BOYCOTT": 10,
    "INTIMIDATION": 15,
    "THREAT": 20,
    "VIOLENCE": 25
}


def clamp(value, minimum=0.0, maximum=1.0):
    return max(
        minimum,
        min(float(value), maximum)
    )


def calculate_svi_from_indicators(indicators):

    weighted_score = 0.0
    total_weight = sum(WEIGHTS.values())

    contributions = {}

    for indicator, weight in WEIGHTS.items():

        value = clamp(
            indicators.get(
                indicator,
                0.0
            )
        )

        contribution = value * weight

        weighted_score += contribution

        contributions[indicator] = round(
            contribution,
            2
        )

    if total_weight == 0:
        return 0.0, contributions

    svi = (
        weighted_score /
        total_weight
    ) * 100

    return round(svi, 2), contributions


def situation_adjustment(
    situation,
    situation_confidence
):

    base = SITUATION_SEVERITY.get(
        situation,
        0
    )

    confidence = clamp(
        situation_confidence
    )

    return round(
        base * confidence,
        2
    )


def get_risk_category(svi):

    if svi <= 25:
        return "LOW"

    elif svi <= 50:
        return "MODERATE"

    elif svi <= 75:
        return "HIGH"

    else:
        return "CRITICAL"


def calculate_confidence(
    situation_confidence,
    emotion_confidence,
    indicators
):

    situation_confidence = clamp(
        situation_confidence
    )

    emotion_confidence = clamp(
        emotion_confidence
    )

    base_confidence = (
        situation_confidence +
        emotion_confidence
    ) / 2

    active_indicators = sum(
        1
        for value in indicators.values()
        if float(value) > 0
    )

    indicator_support = min(
        active_indicators / 5.0,
        1.0
    )

    confidence = (
        0.7 * base_confidence +
        0.3 * indicator_support
    )

    return round(
        clamp(confidence),
        4
    )


def get_contributing_factors(contributions):

    factors = []

    for indicator, contribution in contributions.items():

        if contribution > 0:

            factors.append({
                "indicator": indicator,
                "contribution": contribution
            })

    factors.sort(
        key=lambda x: x["contribution"],
        reverse=True
    )

    return factors


def analyze_svi(
    indicators,
    situation="UNKNOWN",
    situation_confidence=0.0,
    emotion_confidence=0.0
):

    # --------------------------------------------------------
    # Indicator score
    # --------------------------------------------------------

    svi, contributions = (
        calculate_svi_from_indicators(
            indicators
        )
    )

    # --------------------------------------------------------
    # Situation severity
    # --------------------------------------------------------

    adjustment = situation_adjustment(
        situation,
        situation_confidence
    )

    svi += adjustment

    # --------------------------------------------------------
    # Safety escalation
    #
    # Strong immediate-danger signals should not be hidden
    # by a low general distress score.
    # --------------------------------------------------------

    immediate_danger = clamp(
        indicators.get(
            "immediate_danger",
            0.0
        )
    )

    violence = clamp(
        indicators.get(
            "violence",
            0.0
        )
    )

    threat = clamp(
        indicators.get(
            "threat",
            0.0
        )
    )

    # Immediate danger + threat
    if (
        immediate_danger >= 0.66
        and threat >= 0.66
    ):

        svi = max(
            svi,
            76.0
        )

    # Immediate danger + violence
    elif (
        immediate_danger >= 0.66
        and violence >= 0.66
    ):

        svi = max(
            svi,
            76.0
        )

    # Strong violence
    elif violence >= 0.66:

        svi = max(
            svi,
            60.0
        )

    # Strong threat with high fear
    elif (
        threat >= 0.66
        and indicators.get("fear", 0.0) >= 0.33
    ):

        svi = max(
            svi,
            50.0
        )

    svi = min(
        round(svi, 2),
        100.0
    )

    # --------------------------------------------------------
    # Add situation contribution
    # --------------------------------------------------------

    if adjustment > 0:

        contributions[
            "situation_severity"
        ] = adjustment

    # --------------------------------------------------------
    # Category
    # --------------------------------------------------------

    risk_category = get_risk_category(
        svi
    )

    # --------------------------------------------------------
    # Contributing factors
    # --------------------------------------------------------

    contributing_factors = (
        get_contributing_factors(
            contributions
        )
    )

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    confidence = calculate_confidence(
        situation_confidence,
        emotion_confidence,
        indicators
    )

    return {
        "svi": svi,

        "risk_category":
            risk_category,

        "confidence":
            confidence,

        "contributing_factors":
            contributing_factors
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 70)
    print("NHAA STRESS VULNERABILITY INDEX")
    print("=" * 70)

    test_cases = [

        {
            "name": "LOW",
            "situation": "UNKNOWN",
            "situation_confidence": 0.0,
            "emotion_confidence": 0.9,

            "indicators": {
                "stress": 0.1,
                "fear": 0.0,
                "anxiety": 0.1,
                "distress": 0.0,
                "trauma": 0.0,
                "threat": 0.0,
                "violence": 0.0,
                "immediate_danger": 0.0,
                "isolation": 0.1,
                "vulnerability": 0.0
            }
        },

        {
            "name": "MODERATE",
            "situation": "GENERAL_ANXIETY",
            "situation_confidence": 0.8,
            "emotion_confidence": 0.9,

            "indicators": {
                "stress": 0.6,
                "fear": 0.3,
                "anxiety": 0.6,
                "distress": 0.4,
                "trauma": 0.1,
                "threat": 0.0,
                "violence": 0.0,
                "immediate_danger": 0.0,
                "isolation": 0.3,
                "vulnerability": 0.3
            }
        },

        {
            "name": "HIGH",
            "situation": "INTIMIDATION",
            "situation_confidence": 0.9,
            "emotion_confidence": 0.9,

            "indicators": {
                "stress": 0.8,
                "fear": 0.8,
                "anxiety": 0.7,
                "distress": 0.8,
                "trauma": 0.6,
                "threat": 0.5,
                "violence": 0.2,
                "immediate_danger": 0.0,
                "isolation": 0.6,
                "vulnerability": 0.7
            }
        },

        {
            "name": "CRITICAL",
            "situation": "VIOLENCE",
            "situation_confidence": 1.0,
            "emotion_confidence": 0.95,

            "indicators": {
                "stress": 1.0,
                "fear": 1.0,
                "anxiety": 1.0,
                "distress": 1.0,
                "trauma": 1.0,
                "threat": 1.0,
                "violence": 1.0,
                "immediate_danger": 1.0,
                "isolation": 1.0,
                "vulnerability": 1.0
            }
        }
    ]

    for test in test_cases:

        result = analyze_svi(
            indicators=test["indicators"],
            situation=test["situation"],
            situation_confidence=
                test["situation_confidence"],
            emotion_confidence=
                test["emotion_confidence"]
        )

        print()
        print("-" * 70)

        print(
            "Expected:",
            test["name"]
        )

        print(
            "Situation:",
            test["situation"]
        )

        print(
            "SVI:",
            result["svi"]
        )

        print(
            "Risk:",
            result["risk_category"]
        )

        print(
            "Confidence:",
            result["confidence"]
        )

        print()
        print("Contributing factors:")

        for factor in result[
            "contributing_factors"
        ]:

            print(
                f"  "
                f"{factor['indicator']:20}"
                f"{factor['contribution']:.2f}"
            )

    print()
    print("=" * 70)
    print("SVI TEST COMPLETED")
    print("=" * 70)