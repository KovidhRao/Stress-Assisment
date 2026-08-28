import pandas as pd
from pathlib import Path
import random

BASE = Path(__file__).resolve().parent
FILE = BASE / "data" / "trauma_indicators.csv"

random.seed(42)

df = pd.read_csv(FILE)

TARGET = 300

templates = {
    "AVOIDANCE": [
        "I avoid places that remind me of what happened",
        "I try not to talk about the incident",
        "I avoid people connected to what happened",
        "I stay away from situations that remind me of the event",
        "I don't want to think about what happened",
        "I avoid discussing the experience with others",
        "I try to keep myself away from reminders of the incident",
        "I avoid going to places where the incident occurred"
    ],

    "DETACHMENT": [
        "I feel disconnected from people around me",
        "I feel emotionally distant from everyone",
        "I don't feel connected to my family anymore",
        "I feel separated from the people I care about",
        "I have become emotionally distant",
        "I feel detached from my surroundings",
        "I find it difficult to feel close to others",
        "I feel like I am disconnected from everything"
    ],

    "DIFFICULTY_CONCENTRATING": [
        "I cannot concentrate on my work",
        "My mind keeps wandering when I try to study",
        "I find it difficult to focus",
        "I cannot concentrate since the incident",
        "I keep losing my train of thought",
        "It is difficult for me to pay attention",
        "I struggle to focus on simple tasks",
        "My thoughts make it difficult to concentrate"
    ],

    "EMOTIONAL_NUMBNESS": [
        "I feel emotionally numb",
        "I don't feel much of anything anymore",
        "My emotions feel empty",
        "I feel like I have shut down emotionally",
        "Nothing seems to affect me emotionally",
        "I feel disconnected from my emotions",
        "I cannot feel happiness or sadness properly",
        "I feel emotionally empty most of the time"
    ],

    "HYPERVIGILANCE": [
        "I am constantly watching for danger",
        "I keep checking my surroundings",
        "I feel like I must always stay alert",
        "I am constantly looking over my shoulder",
        "I cannot relax because I am always alert",
        "I keep checking whether someone is nearby",
        "I feel unsafe even when nothing is happening",
        "I am always expecting something bad to happen"
    ],

    "INTRUSIVE_MEMORY": [
        "Memories of what happened keep coming back",
        "I cannot stop remembering the incident",
        "The event keeps coming into my thoughts",
        "I suddenly remember what happened",
        "The memories return even when I don't want them",
        "I keep reliving parts of the experience in my mind",
        "Unwanted memories of the incident keep appearing",
        "I have repeated memories of what happened"
    ],

    "NIGHTMARES": [
        "I keep having nightmares about what happened",
        "I dream about the incident repeatedly",
        "My nightmares remind me of the experience",
        "I wake up from frightening dreams about the event",
        "I have disturbing dreams related to what happened",
        "The incident keeps appearing in my dreams",
        "My sleep is disturbed by frightening dreams",
        "I regularly wake up after nightmares"
    ],

    "PERSISTENT_DISTRESS": [
        "I remain distressed about what happened",
        "The experience continues to cause me emotional pain",
        "I still feel deeply upset about the incident",
        "The distress has not gone away",
        "I continue to struggle emotionally after the event",
        "I feel upset whenever I think about what happened",
        "The emotional pain is still affecting me",
        "I have not been able to recover emotionally"
    ],

    "REDUCED_SENSE_OF_SAFETY": [
        "I no longer feel safe",
        "I don't feel safe in places where I used to feel comfortable",
        "I constantly worry about my safety",
        "I feel unsafe even when I am at home",
        "I don't feel protected anymore",
        "My sense of safety has changed completely",
        "I feel vulnerable wherever I go",
        "I find it difficult to feel safe around other people"
    ],

    "SLEEP_DISTURBANCE": [
        "I have trouble sleeping at night",
        "I keep waking up during the night",
        "I cannot sleep properly since the incident",
        "My sleep has become very disturbed",
        "I struggle to fall asleep",
        "I wake up feeling restless",
        "I have been sleeping poorly lately",
        "My sleep pattern has changed since what happened"
    ],

    "STARTLE_RESPONSE": [
        "I get startled very easily",
        "Sudden sounds make me extremely frightened",
        "I jump whenever I hear an unexpected noise",
        "I react strongly to sudden movements",
        "Small noises make me feel alarmed",
        "I become frightened very quickly",
        "I am easily startled by people approaching me",
        "Unexpected sounds make me feel unsafe"
    ]
}

prefixes = [
    "",
    "Recently, ",
    "Lately, ",
    "Right now, ",
    "At the moment, ",
    "For the past few days, ",
    "I feel that ",
    "I keep feeling that ",
    "I have noticed that ",
    "Since the incident, "
]

suffixes = [
    "",
    " lately.",
    " these days.",
    " and it is affecting my daily life.",
    " and I don't know how to deal with it.",
    " and it has become difficult to manage.",
    " and I am struggling to cope.",
    " and this is causing me a lot of distress.",
    " and I find it difficult to control.",
    " and it is getting worse."
]

existing_texts = set(
    df["text"].astype(str).str.strip()
)

combinations = []

for indicator, base_texts in templates.items():

    for base in base_texts:

        for prefix in prefixes:

            for suffix in suffixes:

                base_clean = base.rstrip(".")

                text = (
                    prefix +
                    base_clean +
                    suffix
                ).strip()

                if text and text not in existing_texts:
                    combinations.append(
                        (indicator, text)
                    )

random.shuffle(combinations)

new_rows = []
next_id = int(df["id"].max()) + 1

for indicator, text in combinations:

    if len(df) + len(new_rows) >= TARGET:
        break

    if text in existing_texts:
        continue

    existing_texts.add(text)

    new_rows.append({
        "id": next_id,
        "text": text,
        "language": "en",
        "indicator": indicator,
        "present": 1
    })

    next_id += 1

if len(df) + len(new_rows) < TARGET:
    raise RuntimeError(
        f"Could only generate "
        f"{len(df) + len(new_rows)} rows."
    )

result = pd.concat(
    [df, pd.DataFrame(new_rows)],
    ignore_index=True
)

result.to_csv(FILE, index=False)

print("=" * 65)
print("TRAUMA INDICATORS DATASET EXPANDED")
print("=" * 65)
print("Previous rows:", len(df))
print("New rows:", len(new_rows))
print("Final rows:", len(result))
print()
print("Indicator distribution:")
print(result["indicator"].value_counts())
print()
print("Saved to:")
print(FILE)