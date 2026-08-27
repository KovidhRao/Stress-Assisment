import re
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 42


def clean_text(text):
    """
    Basic text preprocessing.
    """

    if not isinstance(text, str):
        text = str(text)

    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # Remove URLs
    text = re.sub(
        r"https?://\S+|www\.\S+",
        "",
        text
    )

    # Remove extra whitespace again
    text = re.sub(r"\s+", " ", text).strip()

    return text

def detect_language(text):
    """
    Detect language with a simple English safeguard.
    """

    text = clean_text(text)

    if not text:
        return "unknown"

    # Common English words used as a safeguard
    english_words = {
        "i", "am", "the", "and", "is", "are",
        "my", "me", "you", "we", "they",
        "someone", "feel", "afraid", "help",
        "worried", "cannot", "sleep", "hurt"
    }

    words = set(
        re.findall(r"\b[a-zA-Z]+\b", text.lower())
    )

    english_matches = len(words.intersection(english_words))

    # If enough common English words are present,
    # classify as English.
    if english_matches >= 2:
        return "en"

    try:
        return detect(text)
    except Exception:
        return "unknown"



def preprocess_text(text):
    """
    Complete preprocessing.
    """

    cleaned = clean_text(text)
    language = detect_language(cleaned)

    return {
        "original_text": text,
        "cleaned_text": cleaned,
        "language": language
    }


if __name__ == "__main__":

    test_texts = [
        "I am very worried about my exams and I cannot sleep.",
        "I feel completely alone and nobody is helping me.",
        "I am afraid someone may hurt me."
    ]

    print("=" * 60)
    print("NHAA TEXT PREPROCESSING TEST")
    print("=" * 60)

    for text in test_texts:

        result = preprocess_text(text)

        print()
        print("Original :", result["original_text"])
        print("Cleaned  :", result["cleaned_text"])
        print("Language :", result["language"])

    print()
    print("=" * 60)
    print("PREPROCESSING TEST COMPLETED")
    print("=" * 60)