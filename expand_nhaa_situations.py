import pandas as pd
from pathlib import Path
import random

BASE = Path(r"G:\dataset_nhaa")
FILE = BASE / "data" / "nhaa_situations.csv"

random.seed(42)

df = pd.read_csv(FILE)

TARGET = 500

templates = {
    "ACADEMIC_STRESS": [
        "I am overwhelmed by my exams",
        "My studies are causing me a lot of stress",
        "I am worried about my academic performance",
        "I cannot manage the pressure from my coursework",
        "I feel anxious about my upcoming exams",
        "My college workload is becoming difficult to handle",
        "I am struggling to cope with academic pressure",
        "I keep worrying about failing my exams",
        "I feel exhausted because of my studies",
        "The pressure to perform well is affecting me"
    ],

    "GENERAL_ANXIETY": [
        "I keep worrying about what might happen",
        "I feel anxious about my future",
        "I cannot stop thinking about possible problems",
        "I feel nervous most of the time",
        "I constantly worry about things going wrong",
        "My thoughts keep making me anxious",
        "I find it difficult to relax because I keep worrying",
        "I feel uneasy without knowing why",
        "I am constantly expecting something bad",
        "My worries are interfering with my daily life"
    ],

    "SOCIAL_ISOLATION": [
        "I feel completely alone",
        "I have nobody to talk to",
        "I feel disconnected from everyone around me",
        "I have stopped spending time with other people",
        "I feel like nobody understands me",
        "I don't have anyone I can rely on",
        "I feel isolated from my friends",
        "I have withdrawn from people around me",
        "I spend most of my time alone",
        "I feel separated from everyone else"
    ],

    "THREAT": [
        "Someone has threatened me",
        "They keep threatening my family",
        "I received a serious threat",
        "Someone warned me that they would hurt me",
        "I am afraid because of repeated threats",
        "They threatened me after I complained",
        "I have been receiving threatening messages",
        "Someone is threatening to harm my family",
        "I fear that the threats may become real",
        "They told me not to speak about what happened"
    ],

    "FEAR": [
        "I am afraid to go outside",
        "I am scared to return home",
        "I feel unsafe when I am alone",
        "I am frightened about what might happen",
        "I am afraid someone may find me",
        "I feel scared whenever I leave home",
        "I don't feel safe in my surroundings",
        "I am constantly afraid for my safety",
        "I am frightened by the situation",
        "I am scared that someone will hurt me"
    ],

    "DISPLACEMENT": [
        "We were forced to leave our home",
        "My family had to move because of threats",
        "I no longer have a safe place to stay",
        "We had to leave our community",
        "I was forced to relocate",
        "My family cannot safely return home",
        "We had to leave everything behind",
        "I am living somewhere else because it was unsafe",
        "We were displaced from our area",
        "I don't know when I can return home"
    ],

    "SOCIAL_BOYCOTT": [
        "Everyone has stopped talking to my family",
        "People refuse to interact with us",
        "Our community has stopped supporting us",
        "People are deliberately avoiding my family",
        "Nobody wants to associate with us",
        "The community has isolated our family",
        "People have stopped doing business with us",
        "We are being deliberately excluded",
        "Our family is being socially boycotted",
        "People refuse to include us in community activities"
    ],

    "INTIMIDATION": [
        "They are pressuring me not to complain",
        "They keep warning me to stay silent",
        "I am being intimidated because I spoke up",
        "They are trying to frighten me into withdrawing my complaint",
        "Someone is pressuring me to stop reporting the incident",
        "I am afraid to speak because of their intimidation",
        "They keep trying to silence me",
        "They warned me not to seek help",
        "I am being pressured to remain silent",
        "They are trying to make me afraid to report what happened"
    ]
}

risk_levels = {
    "ACADEMIC_STRESS": "LOW",
    "GENERAL_ANXIETY": "MODERATE",
    "SOCIAL_ISOLATION": "MODERATE",
    "THREAT": "HIGH",
    "FEAR": "HIGH",
    "DISPLACEMENT": "HIGH",
    "SOCIAL_BOYCOTT": "HIGH",
    "INTIMIDATION": "HIGH"
}

prefixes = [
    "",
    "Recently, ",
    "Lately, ",
    "Right now, ",
    "These days, ",
    "At the moment, ",
    "For the past few days, ",
    "I feel that ",
    "I keep feeling that ",
    "I have started to feel that "
]

suffixes = [
    "",
    " every day.",
    " lately.",
    " because of everything happening.",
    " and I don't know what to do.",
    " and it is affecting my daily life.",
    " and it is becoming difficult to cope.",
    " and I am finding it difficult to manage.",
    " and this situation is becoming overwhelming.",
    " and I need help dealing with it."
]

existing_texts = set(
    df["text"].astype(str).str.strip()
)

new_rows = []
next_id = int(df["id"].max()) + 1

# Generate combinations systematically.
all_combinations = []

for situation, base_texts in templates.items():
    for base in base_texts:
        for prefix in prefixes:
            for suffix in suffixes:
                text = (prefix + base + suffix).strip()

                if text and text not in existing_texts:
                    all_combinations.append(
                        (situation, text)
                    )

random.shuffle(all_combinations)

for situation, text in all_combinations:

    if len(df) + len(new_rows) >= TARGET:
        break

    if text in existing_texts:
        continue

    existing_texts.add(text)

    new_rows.append({
        "id": next_id,
        "text": text,
        "language": "en",
        "situation": situation,
        "risk_level": risk_levels[situation]
    })

    next_id += 1

if len(df) + len(new_rows) < TARGET:
    raise RuntimeError(
        f"Could only generate {len(df) + len(new_rows)} rows."
    )

new_df = pd.DataFrame(new_rows)

result = pd.concat(
    [df, new_df],
    ignore_index=True
)

result.to_csv(FILE, index=False)

print("=" * 60)
print("NHAA SITUATIONS DATASET EXPANDED")
print("=" * 60)
print("Previous rows:", len(df))
print("New rows:", len(new_df))
print("Final rows:", len(result))
print()
print("Situation distribution:")
print(result["situation"].value_counts())
print()
print("Saved to:")
print(FILE)