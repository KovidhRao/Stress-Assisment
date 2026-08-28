import sys
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent.parent

sys.path.insert(0, str(BASE / "nlp"))

from day2_pipeline import analyze


TEST_CASES = [

    {
        "name": "LOW",
        "text": "I had a normal day and I feel calm and comfortable."
    },

    {
        "name": "MODERATE",
        "text": "I have been feeling stressed and worried about my studies lately."
    },

    {
        "name": "HIGH",
        "text": "I feel extremely anxious, overwhelmed and afraid, and I cannot sleep."
    },

    {
        "name": "CRITICAL",
        "text": "Someone is threatening me and I am afraid they may hurt me right now."
    },

    {
        "name": "ACADEMIC_STRESS",
        "text": "I am extremely stressed about my exams, assignments and grades."
    },

    {
        "name": "ANXIETY",
        "text": "I am constantly anxious and worried and I cannot relax."
    },

    {
        "name": "THREAT",
        "text": "Someone has threatened me and warned me not to speak about what happened."
    },

    {
        "name": "VIOLENCE",
        "text": "Someone attacked me and I am afraid they may hurt me again."
    },

    {
        "name": "GRIEF",
        "text": "I lost someone important to me and I feel deeply sad and empty."
    },

    {
        "name": "SOCIAL_ISOLATION",
        "text": "I feel completely alone and isolated and I have nobody to talk to."
    }
]


def print_result(name, text, result):

    print()
    print("=" * 70)
    print("TEST:", name)
    print("=" * 70)

    print("Input:")
    print(text)

    print()
    print("Situation:",
          result["situation"])

    print("Situation confidence:",
          result["situation_confidence"])

    print("Emotion:",
          result["emotion"])

    print("Emotion confidence:",
          result["emotion_confidence"])

    print()
    print("Indicators:")

    for indicator, score in result["indicators"].items():

        print(
            f"  {indicator:15} {score:.4f}"
        )

    print()
    print("SVI:",
          result["svi"])

    print("Risk category:",
          result["risk_category"])

    print("SVI confidence:",
          result["svi_confidence"])

    print()
    print("Contributing factors:")

    if result["contributing_factors"]:

        for factor in result["contributing_factors"]:

            print(
                f"  {factor['indicator']:15} "
                f"{factor['contribution']:.2f}"
            )

    else:

        print("  None")

    print()
    print("Matched situation rules:")

    if result["matched_situation_rules"]:

        for rule in result["matched_situation_rules"]:
            print(" ", rule)

    else:

        print("  None")


def main():

    print("=" * 70)
    print("NHAA DAY 2 SYNTHETIC TEST SUITE")
    print("=" * 70)

    results = []

    for test in TEST_CASES:

        result = analyze(test["text"])

        results.append({
            "expected_test": test["name"],
            "result": result
        })

        print_result(
            test["name"],
            test["text"],
            result
        )

    # Save complete results
    output_dir = BASE / "nlp" / "output"
    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    output_file = (
        output_dir /
        "day2_test_results.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            results,
            f,
            indent=4,
            ensure_ascii=False
        )

    print()
    print("=" * 70)
    print("DAY 2 TEST SUITE COMPLETED")
    print("=" * 70)

    print()
    print("Results saved to:")
    print(output_file)


if __name__ == "__main__":
    main()