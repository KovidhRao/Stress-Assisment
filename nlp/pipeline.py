from transformers import pipeline

print("=" * 60)
print("NHAA DAY 2 - NLP PIPELINE TEST")
print("=" * 60)

print()
print("Loading emotion model...")

classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None
)

text = "I am very worried about my exams and I cannot sleep."

results = classifier(text)

print()
print("Input:")
print(text)

print()
print("Emotion results:")

for result in results[0]:
    print(
        f"{result['label']:15} "
        f"{result['score']:.4f}"
    )

print()
print("=" * 60)
print("HUGGING FACE MODEL TEST COMPLETED")
print("=" * 60)