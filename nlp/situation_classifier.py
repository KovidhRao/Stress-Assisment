import re
from pathlib import Path


BASE = Path(r"G:\dataset_nhaa")


# ============================================================
# NHAA SITUATION CLASSIFIER
# ============================================================

SITUATION_RULES = {

    "ACADEMIC_STRESS": [
        "exam",
        "exams",
        "study",
        "studies",
        "college",
        "school",
        "academic",
        "coursework",
        "assignment",
        "assignments",
        "grades",
        "marks",
        "semester",
        "class",
        "teacher",
        "professor",
        "homework",
        "academic pressure"
    ],

    "DISPLACEMENT": [
        "forced to leave",
        "left my home",
        "leave my home",
        "relocate",
        "relocated",
        "displaced",
        "displacement",
        "forced out",
        "cannot return home",
        "can't return home",
        "lost my home",
        "homeless"
    ],

    "FEAR": [
        "afraid",
        "scared",
        "frightened",
        "terrified",
        "fear",
        "unsafe",
        "danger",
        "don't feel safe",
        "do not feel safe",
        "not safe",
        "worried about my safety"
    ],

    "GENERAL_ANXIETY": [
        "anxious",
        "anxiety",
        "worried",
        "worry",
        "nervous",
        "uneasy",
        "panic",
        "overthinking",
        "can't relax",
        "cannot relax"
    ],

    "INTIMIDATION": [
        "intimidated",
        "intimidation",
        "pressured",
        "pressure me",
        "stay silent",
        "remain silent",
        "silence me",
        "warned me",
        "warning me",
        "frighten me",
        "withdraw my complaint"
    ],

    "SOCIAL_BOYCOTT": [
        "boycott",
        "social boycott",
        "stopped talking to me",
        "stopped talking to my family",
        "refuse to interact",
        "refuse to associate",
        "avoid my family",
        "community stopped supporting",
        "stopped doing business with me"
    ],

    "SOCIAL_ISOLATION": [
        "alone",
        "isolated",
        "isolation",
        "nobody to talk",
        "no one to talk",
        "no one helping",
        "nobody helping",
        "withdrawn",
        "disconnected",
        "excluded",
        "no support"
    ],

    "THREAT": [
        "threat",
        "threatened",
        "threatening",
        "threaten me",
        "harm me",
        "hurt me",
        "attack me",
        "kill me",
        "violence",
        "stalking",
        "harassment"
    ],

    "VIOLENCE": [
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

    "GRIEF": [
        "lost someone",
        "loss of someone",
        "someone died",
        "death of",
        "passed away",
        "grieving",
        "grief",
        "bereaved",
        "mourning",
        "deeply sad",
        "lost a loved one"
    ]
}


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize(text):

    text = str(text).lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# SCORE ONE SITUATION
# ============================================================

def score_situation(
    text,
    keywords
):

    text = normalize(text)

    score = 0

    matched = []

    for keyword in keywords:

        if keyword in text:

            score += 1

            matched.append(keyword)

    return score, matched


# ============================================================
# DETECT SITUATION
# ============================================================

def detect_situation(text):

    scores = {}

    # Calculate score for every situation
    for situation, keywords in SITUATION_RULES.items():

        score, matched = score_situation(
            text,
            keywords
        )

        scores[situation] = {
            "score": score,
            "matched_rules": matched
        }

    # Rank situations by score
    ranked = sorted(
        scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )

    best_situation = ranked[0][0]

    best_score = ranked[0][1]["score"]

    # --------------------------------------------------------
    # No matching situation
    # --------------------------------------------------------

    if best_score == 0:

        return {
            "situation": "UNKNOWN",
            "confidence": 0.0,
            "matched_rules": [],
            "all_scores": {
                name: data["score"]
                for name, data in scores.items()
            }
        }

    # --------------------------------------------------------
    # Calculate confidence
    # --------------------------------------------------------

    total_score = sum(
        item["score"]
        for item in scores.values()
    )

    if total_score == 0:

        confidence = 0.0

    else:

        confidence = (
            best_score /
            total_score
        )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "situation": best_situation,

        "confidence": round(
            confidence,
            4
        ),

        "matched_rules":
            ranked[0][1]["matched_rules"],

        "all_scores": {
            name: data["score"]
            for name, data in scores.items()
        }
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    test_cases = [

        "I am extremely stressed about my exams and my grades.",

        "I am constantly worried and anxious about my future.",

        "Someone has threatened me and I don't feel safe.",

        "I feel completely alone and nobody is helping me.",

        "We were forced to leave our home because of threats.",

        "They keep warning me to stay silent.",

        "Everyone has stopped talking to my family.",

        "Someone attacked me and hurt me.",

        "I lost someone important to me and I feel deeply sad.",

        "I had a normal day and I feel calm and comfortable."
    ]

    print("=" * 70)
    print("NHAA SITUATION CLASSIFIER")
    print("=" * 70)

    for text in test_cases:

        print()
        print("-" * 70)

        print("TEXT:")
        print(text)

        result = detect_situation(text)

        print()
        print(
            "Situation:",
            result["situation"]
        )

        print(
            "Confidence:",
            result["confidence"]
        )

        print(
            "Matched rules:",
            result["matched_rules"]
        )

        print()
        print("All scores:")

        for name, score in result[
            "all_scores"
        ].items():

            if score > 0:

                print(
                    f"  {name:20} {score}"
                )

    print()
    print("=" * 70)
    print("SITUATION CLASSIFICATION COMPLETED")
    print("=" * 70)