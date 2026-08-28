import pandas as pd
from pathlib import Path
import random

BASE = Path(__file__).resolve().parent
FILE = BASE / "data" / "depression_indicators.csv"

random.seed(42)

df = pd.read_csv(FILE)

TARGET = 300

templates = {
    "APPETITE_CHANGES": [
        "My appetite has changed a lot recently",
        "I have been eating much less than usual",
        "I don't feel like eating anymore",
        "I have started eating much more than before",
        "My eating pattern has changed since the incident",
        "I often forget to eat because I have no appetite",
        "Food does not interest me like it used to",
        "I am having difficulty maintaining a normal eating pattern"
    ],

    "DIFFICULTY_CONCENTRATING": [
        "I cannot concentrate on my work",
        "I find it difficult to focus on anything",
        "My mind keeps wandering",
        "I struggle to concentrate when studying",
        "I cannot focus even on simple tasks",
        "I keep losing my train of thought",
        "It is difficult for me to pay attention",
        "I have trouble concentrating throughout the day"
    ],

    "EXCESSIVE_GUILT": [
        "I keep blaming myself for everything",
        "I feel guilty about what happened",
        "I believe everything is my fault",
        "I cannot stop feeling guilty",
        "I keep thinking that I should have done something differently",
        "I feel responsible for things that were not my fault",
        "I constantly blame myself",
        "The guilt is becoming difficult to handle"
    ],

    "FATIGUE": [
        "I feel tired all the time",
        "I have very little energy",
        "Even simple tasks make me exhausted",
        "I feel physically and emotionally drained",
        "I wake up feeling tired",
        "I struggle to get through the day because of exhaustion",
        "I have no energy for my normal activities",
        "I feel exhausted even after resting"
    ],

    "HOPELESSNESS": [
        "I feel like things will never get better",
        "I don't see any hope for my future",
        "I feel that nothing will change",
        "I have stopped believing that things can improve",
        "I cannot imagine a better future",
        "Everything feels pointless to me",
        "I feel there is no way out of my situation",
        "I have lost hope that my life can improve"
    ],

    "LOSS_OF_INTEREST": [
        "I no longer enjoy the things I used to enjoy",
        "Nothing interests me anymore",
        "I have stopped enjoying my hobbies",
        "Activities that once made me happy feel meaningless",
        "I don't feel interested in doing anything",
        "I have lost interest in spending time with others",
        "Things I used to love no longer make me happy",
        "I rarely feel excited about anything anymore"
    ],

    "LOW_MOTIVATION": [
        "I have no motivation to do anything",
        "I struggle to start even simple tasks",
        "I cannot motivate myself to get things done",
        "I have lost the motivation to study",
        "I find it difficult to complete daily responsibilities",
        "I keep putting everything off because I have no motivation",
        "I don't have the energy or motivation to begin tasks",
        "Even important things feel difficult to start"
    ],

    "PERSISTENT_SADNESS": [
        "I feel sad almost every day",
        "I have been feeling deeply sad for a long time",
        "The sadness does not seem to go away",
        "I feel down most of the day",
        "I keep feeling sad without relief",
        "I have been struggling with constant sadness",
        "I feel emotionally low every day",
        "The sadness has continued for weeks"
    ],

    "SLEEP_PROBLEMS": [
        "I have trouble falling asleep",
        "I keep waking up during the night",
        "My sleep has become irregular",
        "I am sleeping much less than usual",
        "I wake up and cannot get back to sleep",
        "I have been struggling to maintain normal sleep",
        "My sleep is disturbed almost every night",
        "I rarely feel rested after sleeping"
    ],

    "SOCIAL_WITHDRAWAL": [
        "I have stopped talking to my friends",
        "I don't want to spend time with other people",
        "I avoid social activities",
        "I have withdrawn from people around me",
        "I prefer to stay alone most of the time",
        "I have stopped attending social gatherings",
        "I don't feel like communicating with anyone",
        "I have been distancing myself from everyone"
    ],

    "WORTHLESSNESS": [
        "I feel like I am worthless",
        "I don't feel that I have any value",
        "I believe I am a burden to others",
        "I feel useless most of the time",
        "I don't think I am good enough",
        "I feel that I have nothing to offer",
        "I constantly feel like I am not worth anything",
        "I feel like everyone would be better without me"
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
    "These days, "
]

suffixes = [
    "",
    " lately.",
    " these days.",
    " and it is affecting my daily life.",
    " and I don't know how to deal with it.",
    " and it has become difficult to manage.",
    " and I am struggling to cope.",
    " and this is affecting my daily routine.",
    " and I find it difficult to change.",
    " and it has been getting worse."
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
        f"Could only generate {len(df) + len(new_rows)} rows."
    )

result = pd.concat(
    [df, pd.DataFrame(new_rows)],
    ignore_index=True
)

result.to_csv(FILE, index=False)

print("=" * 65)
print("DEPRESSION INDICATORS DATASET EXPANDED")
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