import pandas as pd
from pathlib import Path
import random

BASE = Path(r"G:\dataset_nhaa")
FILE = BASE / "data" / "social_context.csv"

random.seed(42)

df = pd.read_csv(FILE)
TARGET = 300

templates = {
    "CASTE_BASED_ABUSE": [
        "They insult me because of my caste",
        "People use caste-based insults against me",
        "My family is verbally abused because of our caste",
        "I am treated badly because of my caste",
        "They make insulting comments about my caste",
        "People humiliate me because of my caste",
        "I have experienced caste-based verbal abuse",
        "They use derogatory words against me because of my caste"
    ],

    "CASTE_BASED_THREATS": [
        "I have received threats because of my caste",
        "People have threatened my family because of our caste",
        "I was threatened after speaking about caste discrimination",
        "They warned me that something would happen if I complained",
        "I fear retaliation because of caste-related conflict",
        "Someone threatened me because I spoke about discrimination",
        "My family has received threats related to our caste",
        "I am afraid because of caste-based threats"
    ],

    "COMMUNITY_REJECTION": [
        "My community has rejected my family",
        "People in the community refuse to accept us",
        "I feel completely rejected by the people around me",
        "Our family has been rejected by the community",
        "People have turned against my family",
        "I no longer feel accepted in my community",
        "The community refuses to support us",
        "I feel unwanted in my own community"
    ],

    "DISCRIMINATION": [
        "People treat me differently because of my background",
        "I am being discriminated against by people around me",
        "My family is not treated fairly",
        "I am treated differently from everyone else",
        "People refuse to give me the same opportunities",
        "I experience unfair treatment because of who I am",
        "I feel that people discriminate against my family",
        "I am repeatedly treated unfairly"
    ],

    "FAMILY_COMMUNITY_PRESSURE": [
        "My family is pressuring me to stay silent",
        "My relatives are telling me not to report what happened",
        "People in my community are pressuring me to withdraw my complaint",
        "My family says I should not seek help",
        "My relatives are afraid that I will speak about the incident",
        "My family wants me to avoid involving authorities",
        "People around me are pressuring me not to complain",
        "I am being pressured by my family to keep quiet"
    ],

    "FEAR_OF_COMMUNITY": [
        "I am afraid of people in my community",
        "I don't feel safe around members of the community",
        "I am scared that people around us will harm my family",
        "I am afraid to return to my community",
        "I worry about what people in my community might do",
        "I feel unsafe whenever I meet members of the community",
        "I fear further harm from people around me",
        "I am frightened of the reaction from my community"
    ],

    "FORCED_DISPLACEMENT": [
        "We were forced to leave our community",
        "My family had to move because of community pressure",
        "They forced us to leave the area",
        "We cannot safely remain in our community",
        "I had to leave my home because of threats",
        "My family was forced to relocate",
        "We were pushed out of our community",
        "I cannot return to my previous home safely"
    ],

    "HUMILIATION": [
        "They publicly humiliated me",
        "My family was humiliated in front of everyone",
        "People insult me whenever I go outside",
        "I was made to feel ashamed in front of the community",
        "They deliberately embarrassed me in public",
        "People humiliated me because of what happened",
        "I was publicly insulted by members of the community",
        "The experience left me feeling deeply humiliated"
    ],

    "LOSS_OF_LIVELIHOOD": [
        "I lost my work because of pressure from the community",
        "People stopped giving me work because of the conflict",
        "My family lost its source of income",
        "I cannot earn a living because of the situation",
        "I lost my job after the community conflict",
        "My livelihood has been affected by discrimination",
        "People are preventing me from working",
        "I am struggling financially because I lost my source of income"
    ],

    "SOCIAL_BOYCOTT": [
        "Everyone has stopped talking to my family",
        "People refuse to interact with us",
        "Our community has stopped supporting us",
        "People are deliberately avoiding my family",
        "Nobody wants to associate with us",
        "People have stopped doing business with us",
        "Our family is being socially boycotted",
        "The community has deliberately stopped interacting with us"
    ],

    "SOCIAL_EXCLUSION": [
        "I am being excluded from community activities",
        "People deliberately keep me away from the community",
        "Nobody wants to include my family",
        "I am excluded from social gatherings",
        "People refuse to let us participate in community activities",
        "I feel excluded from everyone around me",
        "My family is being kept out of community events",
        "People intentionally leave us out"
    ]
}

risk_levels = {
    "CASTE_BASED_ABUSE": "HIGH",
    "CASTE_BASED_THREATS": "CRITICAL",
    "COMMUNITY_REJECTION": "HIGH",
    "DISCRIMINATION": "HIGH",
    "FAMILY_COMMUNITY_PRESSURE": "HIGH",
    "FEAR_OF_COMMUNITY": "HIGH",
    "FORCED_DISPLACEMENT": "HIGH",
    "HUMILIATION": "HIGH",
    "LOSS_OF_LIVELIHOOD": "HIGH",
    "SOCIAL_BOYCOTT": "HIGH",
    "SOCIAL_EXCLUSION": "HIGH"
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
    " and I feel increasingly unsafe.",
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
print("SOCIAL CONTEXT DATASET EXPANDED")
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