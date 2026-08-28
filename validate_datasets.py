import pandas as pd
from pathlib import Path
import json

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
CONFIG_DIR = BASE / "config"

files = [
    "emotion.csv",
    "nhaa_situations.csv",
    "safety_cases.csv",
    "trauma_indicators.csv",
    "depression_indicators.csv",
    "vulnerability.csv",
    "social_context.csv",
    "legal_stress.csv",
    "voice_features.csv"
]

print("=" * 70)
print("NHAA DATASET VALIDATION")
print("=" * 70)

all_ok = True

for filename in files:

    path = DATA_DIR / filename

    print()
    print("-" * 70)
    print(filename)
    print("-" * 70)

    if not path.exists():
        print("❌ FILE NOT FOUND")
        all_ok = False
        continue

    try:
        df = pd.read_csv(path)

        print("Rows:", len(df))
        print("Columns:", len(df.columns))
        print("Column names:")
        print(list(df.columns))

        # Missing values
        missing = int(df.isnull().sum().sum())

        if missing == 0:
            print("Missing values: 0 ✅")
        else:
            print("Missing values:", missing, "❌")
            print(df.isnull().sum()[df.isnull().sum() > 0])
            all_ok = False

        # Duplicate rows
        duplicates = int(df.duplicated().sum())

        if duplicates == 0:
            print("Duplicate rows: 0 ✅")
        else:
            print("Duplicate rows:", duplicates, "⚠️")

        # Empty text check
        if "text" in df.columns:
            empty_text = int(
                df["text"].fillna("").astype(str).str.strip().eq("").sum()
            )

            if empty_text == 0:
                print("Empty text rows: 0 ✅")
            else:
                print("Empty text rows:", empty_text, "❌")
                all_ok = False

        # Show unique labels where applicable
        for column in [
            "emotion",
            "situation",
            "indicator",
            "risk_level"
        ]:
            if column in df.columns:
                values = sorted(
                    df[column]
                    .dropna()
                    .astype(str)
                    .unique()
                    .tolist()
                )

                print(f"{column} labels:")
                print(values)

    except Exception as e:
        print("❌ ERROR READING FILE")
        print(e)
        all_ok = False


# ---------------------------------------------------------
# Validate labels.json
# ---------------------------------------------------------

print()
print("=" * 70)
print("VALIDATING labels.json")
print("=" * 70)

labels_path = CONFIG_DIR / "labels.json"

try:

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = json.load(f)

    print("labels.json: VALID ✅")
    print("Categories:")

    for category, values in labels.items():
        print(f"  {category}: {len(values)} labels")

except Exception as e:

    print("labels.json: INVALID ❌")
    print(e)
    all_ok = False


# ---------------------------------------------------------
# Final result
# ---------------------------------------------------------

print()
print("=" * 70)

if all_ok:
    print("VALIDATION COMPLETED")
    print("No critical file/format errors found. ✅")
else:
    print("VALIDATION COMPLETED")
    print("Some issues need attention. ⚠️")

print("=" * 70)