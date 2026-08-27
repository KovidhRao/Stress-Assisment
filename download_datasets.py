from datasets import load_dataset

print("Downloading GoEmotions...")

dataset = load_dataset("google-research-datasets/go_emotions")

print("Downloaded successfully!")
print(dataset)