from datasets import load_dataset
import pandas as pd
import os

print("Loading GoEmotions...")

dataset = load_dataset("google-research-datasets/go_emotions")

os.makedirs("data", exist_ok=True)

rows = []

for split in dataset:
    df = dataset[split].to_pandas()
    df["split"] = split
    rows.append(df)

df = pd.concat(rows, ignore_index=True)

# Save the complete downloaded GoEmotions dataset
output = "data/emotion.csv"

df.to_csv(output, index=False)

print()
print("===================================")
print("GoEmotions CSV created successfully")
print("===================================")
print("File:", output)
print("Total rows:", len(df))
print("Columns:", list(df.columns))