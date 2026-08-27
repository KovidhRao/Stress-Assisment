import pandas as pd
import json
from pathlib import Path

BASE = Path(r"G:\dataset_nhaa")

with open(BASE / "config" / "labels.json", "r", encoding="utf-8") as f:
    labels = json.load(f)

allowed = set()

for category, values in labels.items():
    if isinstance(values, list):
        allowed.update(values)

files = [
    "nhaa_situations.csv",
    "safety_cases.csv",
    "trauma_indicators.csv",
    "depression_indicators.csv",
    "vulnerability.csv",
    "social_context.csv",
    "legal_stress.csv"
]

print("=" * 70)
print("NHAA LABEL CONSISTENCY CHECK")
print("=" * 70)

all_labels = set()

for filename in files:

    path = BASE / "data" / filename

    df = pd.read_csv(path)

    for column in ["situation", "indicator", "risk_level"]:
        if column in df.columns:
            values = df[column].dropna().astype(str).unique()
            all_labels.update(values)

unknown = sorted(all_labels - allowed)

print()
print("Labels found in CSV datasets:")
for label in sorted(all_labels):
    print(" ", label)

print()
print("=" * 70)

if unknown:
    print("Labels NOT currently in labels.json:")
    for label in unknown:
        print(" ❌", label)
else:
    print("All labels are present in labels.json. ✅")

print("=" * 70)