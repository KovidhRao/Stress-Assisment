import pandas as pd
from pathlib import Path
import random

BASE = Path(r"G:\dataset_nhaa")
FILE = BASE / "data" / "legal_stress.csv"

random.seed(42)

df = pd.read_csv(FILE)
TARGET = 200

templates = {
    "DISTRUST_OF_AUTHORITIES": [
        "I don't trust the authorities to help me",
        "I feel that the authorities are ignoring my situation",
        "I don't believe the authorities will protect me",
        "I have lost trust in the people handling my case",
        "I am afraid that the authorities will not take me seriously",
        "I don't feel confident approaching the authorities",
        "I feel that nobody in authority is listening to me",
        "I no longer believe that the authorities will help"
    ],

    "FEAR_OF_COURT": [
        "I am afraid to go to court",
        "The thought of going to court makes me very anxious",
        "I am scared about appearing before the court",
        "I don't know what will happen when I go to court",
        "I feel frightened about the court proceedings",
        "I am nervous about having to appear in court",
        "I am worried about what will happen during the hearing",
        "Going to court makes me extremely anxious"
    ],

    "FEAR_OF_POLICE": [
        "I am afraid of going to the police",
        "I don't feel safe speaking to the police",
        "I am scared that the police will not protect me",
        "I am worried about approaching the police",
        "I fear that the police may not take me seriously",
        "I feel nervous about reporting this to the police",
        "I am afraid of what might happen if I contact the police",
        "I don't feel comfortable asking the police for help"
    ],

    "FEAR_OF_RETALIATION_AFTER_COMPLAINT": [
        "I am afraid they will retaliate after I complain",
        "I fear that reporting this will make things worse",
        "I am scared that the person I reported will retaliate",
        "I worry that my family may face retaliation",
        "I am afraid of what they might do after my complaint",
        "I fear consequences because I reported the incident",
        "I am worried that speaking up will put me at greater risk",
        "I am afraid they will come after me because I complained"
    ],

    "FEELING_IGNORED_UNHEARD": [
        "I feel like nobody is listening to me",
        "I feel ignored whenever I ask for help",
        "Nobody seems to hear what I am saying",
        "I feel like my complaint does not matter",
        "I feel unheard throughout the legal process",
        "I don't think anyone is taking my concerns seriously",
        "I feel that my requests for help are being ignored",
        "I feel invisible when I try to explain my situation"
    ],

    "FRUSTRATION_WITH_PROCEEDINGS": [
        "I am frustrated with how my case is being handled",
        "The legal proceedings are exhausting me",
        "I am frustrated because nothing seems to move forward",
        "The process has become extremely difficult for me",
        "I am tired of dealing with the legal process",
        "The proceedings are causing me a lot of stress",
        "I feel frustrated by the way my case is progressing",
        "The legal process is becoming overwhelming"
    ],

    "LEGAL_UNCERTAINTY": [
        "I don't understand what will happen with my case",
        "I am uncertain about the legal process",
        "I don't know what my legal options are",
        "I have no idea how long my case will take",
        "I don't know what step I should take next",
        "I am confused about my rights",
        "I don't understand what the authorities will do next",
        "I am uncertain about the outcome of my case"
    ],

    "PERCEIVED_DELAYS": [
        "My case has been delayed for a long time",
        "Nothing seems to happen with my complaint",
        "I have been waiting for a long time for action",
        "The delay in my case is causing me a lot of stress",
        "I am still waiting for someone to respond to my complaint",
        "My case seems to be moving extremely slowly",
        "I have been waiting for months without progress",
        "The lack of progress is making me very frustrated"
    ],

    "REPEATED_REPORTING_FATIGUE": [
        "I am exhausted from reporting the same thing repeatedly",
        "I have had to explain what happened again and again",
        "I am tired of repeatedly reporting the incident",
        "I don't have the energy to keep reporting this",
        "I am exhausted from telling the same story to different people",
        "I don't want to keep repeating what happened",
        "Having to explain everything again is overwhelming",
        "I am tired of answering the same questions repeatedly"
    ]
}

risk_levels = {
    "DISTRUST_OF_AUTHORITIES": "HIGH",
    "FEAR_OF_COURT": "MODERATE",
    "FEAR_OF_POLICE": "HIGH",
    "FEAR_OF_RETALIATION_AFTER_COMPLAINT": "CRITICAL",
    "FEELING_IGNORED_UNHEARD": "HIGH",
    "FRUSTRATION_WITH_PROCEEDINGS": "HIGH",
    "LEGAL_UNCERTAINTY": "MODERATE",
    "PERCEIVED_DELAYS": "HIGH",
    "REPEATED_REPORTING_FATIGUE": "HIGH"
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
    " because of the situation.",
    " and I don't know what to do.",
    " and it is becoming difficult to cope.",
    " and I need help.",
    " and this is affecting my daily life.",
    " and I am becoming increasingly worried.",
    " and the situation is getting worse."
]

existing_texts = set(
    df["text"].astype(str).str.strip()
)

combinations = []

for indicator, base_texts in templates.items():
    for base in base_texts:
        for prefix in prefixes:
            for suffix in suffixes:

                text = (
                    prefix +
                    base.rstrip(".") +
                    suffix
                ).strip()

                if text and text not in existing_texts:
                    combinations.append((indicator, text))

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
        "present": 1,
        "risk_level": risk_levels[indicator]
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
print("LEGAL STRESS DATASET EXPANDED")
print("=" * 65)
print("Previous rows:", len(df))
print("New rows:", len(new_rows))
print("Final rows:", len(result))
print()
print("Indicator distribution:")
print(result["indicator"].value_counts())
print()
print("Risk-level distribution:")
print(result["risk_level"].value_counts())
print()
print("Saved to:")
print(FILE)