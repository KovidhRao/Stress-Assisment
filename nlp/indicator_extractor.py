import re
from pathlib import Path
from transformers import pipeline


BASE = Path(r"G:\dataset_nhaa")

print("Loading emotion model...")

emotion_model = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None
)


# Transparent keyword/rule indicators.
INDICATOR_RULES = {

    "stress": [
        "stress",
        "stressed",
        "pressure",
        "overwhelmed",
        "exhausted",
        "workload",
        "burden"
    ],

    "fear": [
    "afraid",
    "scared",
    "frightened",
    "fear",
    "unsafe",
    "danger",
    "terrified",
    "don't feel safe",
    "do not feel safe",
    "not safe",
    "worried about my safety",
    "warning me",
    "warned me",
    "intimidated",
    "intimidation"
],
    "anxiety": [
    "anxious",
    "anxiety",
    "worried",
    "worry",
    "nervous",
    "uneasy",
    "panic",
    "overthinking",
    "can't relax",
    "cannot relax",
    "frightened",
    "scared"
],

    "trauma": [
        "trauma",
        "traumatic",
        "nightmare",
        "nightmares",
        "flashback",
        "reliving",
        "intrusive memory"
    ],
    
     "violence": [
    "violence",
    "violent",
    "attacked",
    "attack",
    "assault",
    "assaulted",
    "physically hurt",
    "physical attack",
    "hit me",
    "beaten",
    "beat me",
    "kicked me",
    "punched me"
],

    "threat": [
    "threat",
    "threatened",
    "threatening",
    "threaten me",
    "warning me",
    "warned me",
    "stay silent",
    "silence me",
    "harm me",
    "hurt me",
    "attack me",
    "kill me",
    "violence",
    "assault",
    "stalking",
    "attacked",
"assaulted",
"physical attack",
"physically hurt",
"beaten",
"beat me",
    "harassment",
    "intimidation",
    "intimidated",
    "retaliation",
    "retaliate"
],
     "immediate_danger": [
    "right now",
    "immediate danger",
    "in immediate danger",
    "not safe right now",
    "unsafe right now",
    "may hurt me right now",
    "about to attack",
    "currently in danger",
    "danger right now"
],

    "isolation": [
        "alone",
        "isolated",
        "isolation",
        "nobody",
        "no one",
        "withdrawn",
        "disconnected",
        "excluded"
    ],

    "vulnerability": [
        "dependent",
        "dependency",
        "no support",
        "no one to help",
        "financial",
        "homeless",
        "unsafe",
        "displaced",
        "vulnerable"
    ],

    "distress": [
    "distress",
    "distressed",
    "overwhelmed",
    "helpless",
    "hopeless",
    "confused",
    "shocked",
    "emotional pain",
    "cannot cope",
    "can't cope",
    "difficult to cope",
    "struggling"
],
}


def contains_indicator(text, keywords):
    """
    Return 1 if an indicator keyword/phrase is found.
    """

    text = text.lower()

    for keyword in keywords:

        if keyword in text:
            return True

    return False


def calculate_indicator_score(text, keywords):
    """
    Transparent rule-based score.

    More matching keywords produce a higher score,
    capped at 1.0.
    """

    text = text.lower()

    matches = 0

    for keyword in keywords:

        if keyword in text:
            matches += 1

    if matches == 0:
        return 0.0

    # Simple transparent scaling
    score = min(matches / 3.0, 1.0)

    return round(score, 4)


def extract_indicators(text):

    results = {}

    for indicator, keywords in INDICATOR_RULES.items():

        score = calculate_indicator_score(
            text,
            keywords
        )

        results[indicator] = score

    return results


def analyze_emotion(text):

    results = emotion_model(text)[0]

    results = sorted(
        results,
        key=lambda x: x["score"],
        reverse=True
    )

    return results


def analyze_text(text):

    emotions = analyze_emotion(text)

    indicators = extract_indicators(text)

    top_emotion = emotions[0]

    return {
        "emotion": top_emotion["label"],
        "emotion_confidence": round(
            top_emotion["score"],
            4
        ),
        "emotions": emotions,
        "indicators": indicators
    }


if __name__ == "__main__":

    test_cases = [
        "I am very worried about my exams and I cannot sleep.",

        "I feel completely alone and nobody is helping me.",

        "I am afraid someone may hurt me.",

        "I am overwhelmed and extremely stressed about my future.",

        "Someone has threatened me and I don't feel safe."
    ]

    print("=" * 70)
    print("NHAA EMOTION + INDICATOR EXTRACTION")
    print("=" * 70)

    for text in test_cases:

        print()
        print("-" * 70)
        print("TEXT:")
        print(text)

        result = analyze_text(text)

        print()
        print(
            "Top emotion:",
            result["emotion"]
        )

        print(
            "Emotion confidence:",
            result["emotion_confidence"]
        )

        print()
        print("Indicators:")

        for name, score in result["indicators"].items():

            print(
                f"  {name:15} {score:.2f}"
            )

    print()
    print("=" * 70)
    print("INDICATOR EXTRACTION COMPLETED")
    print("=" * 70)