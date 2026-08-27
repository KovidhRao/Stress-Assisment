import pandas as pd
from pathlib import Path
import random

BASE = Path(r"G:\dataset_nhaa")
FILE = BASE / "data" / "safety_cases.csv"

random.seed(42)

df = pd.read_csv(FILE)

TARGET = 250

templates = {
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

    "VIOLENCE": [
        "Someone has physically attacked me",
        "I was assaulted by someone I know",
        "They physically hurt me",
        "Someone tried to attack me",
        "I was pushed and injured",
        "Someone hit me during an argument",
        "I am afraid of being physically attacked again",
        "They have used physical force against me",
        "Someone has harmed me physically",
        "I was attacked because I spoke up"
    ],

    "INTIMIDATION": [
        "They keep warning me to stay silent",
        "I am being intimidated because I spoke up",
        "They are trying to frighten me into withdrawing my complaint",
        "Someone is pressuring me to stop reporting the incident",
        "They keep trying to silence me",
        "They warned me not to seek help",
        "I am being pressured to remain silent",
        "They are trying to make me afraid to report what happened",
        "I feel intimidated whenever I speak about the incident",
        "They are using fear to stop me from asking for help"
    ],

    "STALKING": [
        "Someone keeps following me",
        "I think someone is watching where I go",
        "The same person keeps appearing wherever I go",
        "Someone has been following me on my way home",
        "I feel like I am being watched",
        "Someone keeps monitoring my movements",
        "I have noticed the same person near my home repeatedly",
        "Someone follows me whenever I leave the house",
        "I am worried because someone keeps tracking me",
        "I feel unsafe because someone is following me"
    ],

    "HARASSMENT": [
        "They keep harassing me",
        "I receive unwanted messages repeatedly",
        "Someone keeps contacting me even after I asked them to stop",
        "I am being repeatedly harassed",
        "They continue bothering me every day",
        "I receive threatening and unwanted calls",
        "Someone keeps disturbing me at home",
        "I am being verbally harassed",
        "They repeatedly insult and bother me",
        "The harassment has become difficult to tolerate"
    ],

    "COERCION": [
        "They are forcing me to do something I don't want to do",
        "I am being pressured to withdraw my complaint",
        "Someone is forcing me to remain silent",
        "They are threatening me unless I do what they want",
        "I feel forced to agree with them",
        "They are pressuring me to change my statement",
        "I am being forced to cooperate against my wishes",
        "They are using threats to control my decisions",
        "I feel that I cannot refuse their demands",
        "They are forcing me to stay quiet about what happened"
    ],

    "RETALIATION_RISK": [
        "I am afraid they will retaliate against me",
        "I fear something will happen because I complained",
        "I am worried about retaliation after reporting the incident",
        "They may harm my family because I spoke up",
        "I am afraid they will come after me",
        "I worry that reporting this will make things worse",
        "I fear the person I reported will retaliate",
        "I am scared of what they might do after my complaint",
        "I believe I may face retaliation for speaking out",
        "I am worried about consequences after reporting them"
    ],

    "IMMEDIATE_DANGER": [
        "I don't feel safe right now",
        "I think I am in immediate danger",
        "Someone is outside my home threatening me",
        "I am afraid someone may hurt me right now",
        "I need help because I am not safe at this moment",
        "I believe someone is about to attack me",
        "I am currently hiding because I am afraid",
        "The person threatening me is nearby right now",
        "I am scared that I may be harmed right now",
        "I don't know how to keep myself safe right now"
    ],

    "SELF_HARM": [
        "I am thinking about hurting myself",
        "I have been thinking about suicide",
        "I don't want to be alive anymore",
        "I feel like hurting myself",
        "I am afraid I might hurt myself",
        "I have been having thoughts of self-harm",
        "I feel that I cannot continue living like this",
        "I keep thinking about ending my life",
        "I am struggling with thoughts of harming myself",
        "I don't see a reason to keep going"
    ],

    "CURRENT_INTENT": [
        "I feel that I might hurt myself right now",
        "I currently want to hurt myself",
        "I am afraid I may act on these thoughts",
        "I feel close to harming myself",
        "I am currently thinking about ending my life",
        "I don't know if I can stop myself from acting on these thoughts",
        "I am having strong thoughts of harming myself right now",
        "I feel that I may act on my suicidal thoughts",
        "The thoughts of self-harm feel very strong right now",
        "I am worried that I may hurt myself today"
    ],

    "PLAN_MENTIONED": [
        "I have a plan to hurt myself",
        "I have thought about how I would harm myself",
        "I know what I would do if I decided to hurt myself",
        "I have made a plan to end my life",
        "I have been planning how to harm myself",
        "I have decided how I might hurt myself",
        "I have thought through a specific way to harm myself",
        "I have a specific plan for suicide",
        "I know when and how I might hurt myself",
        "I have been preparing to act on my plan"
    ]
}

risk_config = {
    "THREAT": (1, 1, 0, 0, 0, 0, "HIGH"),
    "VIOLENCE": (1, 0, 1, 0, 0, 0, "CRITICAL"),
    "INTIMIDATION": (0, 1, 0, 0, 0, 0, "HIGH"),
    "STALKING": (1, 0, 0, 0, 0, 0, "HIGH"),
    "HARASSMENT": (0, 1, 0, 0, 0, 0, "HIGH"),
    "COERCION": (1, 1, 0, 0, 0, 0, "HIGH"),
    "RETALIATION_RISK": (1, 1, 0, 0, 0, 0, "CRITICAL"),
    "IMMEDIATE_DANGER": (1, 1, 0, 0, 0, 0, "CRITICAL"),
    "SELF_HARM": (1, 0, 0, 1, 0, 0, "CRITICAL"),
    "CURRENT_INTENT": (1, 0, 0, 1, 1, 0, "CRITICAL"),
    "PLAN_MENTIONED": (1, 0, 0, 1, 1, 1, "CRITICAL")
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
    "I am worried that ",
    "I am scared that "
]

suffixes = [
    "",
    " right now.",
    " lately.",
    " these days.",
    " and I don't know what to do.",
    " and I am very frightened.",
    " and it is becoming difficult to cope.",
    " and I need help dealing with this.",
    " and I am worried about my safety.",
    " and the situation is getting worse."
]

existing_texts = set(
    df["text"].astype(str).str.strip()
)

combinations = []

for category, base_texts in templates.items():
    for base in base_texts:
        for prefix in prefixes:
            for suffix in suffixes:

                # Avoid awkward duplicate punctuation
                if suffix and base.endswith("."):
                    base_clean = base[:-1]
                else:
                    base_clean = base

                text = (prefix + base_clean + suffix).strip()

                if text and text not in existing_texts:
                    combinations.append((category, text))

random.shuffle(combinations)

new_rows = []
next_id = int(df["id"].max()) + 1

for category, text in combinations:

    if len(df) + len(new_rows) >= TARGET:
        break

    if text in existing_texts:
        continue

    existing_texts.add(text)

    (
        immediate_danger,
        threat,
        violence,
        self_harm,
        current_intent,
        plan_mentioned,
        safety_level
    ) = risk_config[category]

    new_rows.append({
        "id": next_id,
        "text": text,
        "immediate_danger": immediate_danger,
        "threat": threat,
        "violence": violence,
        "self_harm": self_harm,
        "current_intent": current_intent,
        "plan_mentioned": plan_mentioned,
        "safety_level": safety_level
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
print("SAFETY CASES DATASET EXPANDED")
print("=" * 65)
print("Previous rows:", len(df))
print("New rows:", len(new_rows))
print("Final rows:", len(result))
print()
print("Safety level distribution:")
print(result["safety_level"].value_counts())
print()
print("Saved to:")
print(FILE)