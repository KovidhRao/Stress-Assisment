import re
import unicodedata


# ============================================================
# NHAA MULTILINGUAL PREPROCESSING
# ============================================================

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "pa": "Punjabi",
    "gu": "Gujarati",
    "or": "Odia",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "ur": "Urdu",
}


# ============================================================
# NATIVE SCRIPT RANGES
# ============================================================

SCRIPT_RANGES = {
    "hi": r"\u0900-\u097F",
    "bn": r"\u0980-\u09FF",
    "pa": r"\u0A00-\u0A7F",
    "gu": r"\u0A80-\u0AFF",
    "or": r"\u0B00-\u0B7F",
    "ta": r"\u0B80-\u0BFF",
    "te": r"\u0C00-\u0C7F",
    "kn": r"\u0C80-\u0CFF",
    "ml": r"\u0D00-\u0D7F",
    "ur": r"\u0600-\u06FF",
}


# ============================================================
# ROMANIZED INDIAN LANGUAGE HINTS
# ============================================================
#
# These are common words written using English letters.
# They are used ONLY for language identification.
#
# We do NOT spell-correct these words.
# ============================================================

ROMANIZED_HINTS = {

    "hi": [
        "mujhe",
        "mujhko",
        "main",
        "mein",
        "mera",
        "meri",
        "mere",
        "bahut",
        "bohot",
        "mujhse",
        "chinta",
        "pareshan",
        "pareshaan",
        "tension",
        "dar",
        "darr",
        "darta",
        "darti",
        "akela",
        "akeli",
        "nahi",
        "nahin",
        "koi",
        "kuch",
        "madad",
        "ghar",
        "parivar",
        "zindagi",
        "bhavishya",
        "padhai",
        "pariksha",
        "parikshaen",
    ],

    "te": [
        "naku",
        "naaku",
        "naaku",
        "na",
        "naa",
        "naadi",
        "naaku",
        "chala",
        "chaala",
        "tension",
        "bhayam",
        "bayam",
        "bhayanga",
        "ibbandi",
        "kastam",
        "kashtam",
        "ontariga",
        "evaru",
        "evvaru",
        "ledu",
        "leedu",
        "sahayam",
        "sahaayam",
        "intlo",
        "illu",
        "pariksha",
        "parikshalu",
        "gurinchi",
        "undhi",
        "undi",
        "cheppali",
        "cheyalekapothunna",
        "avuthundi",
    ],

    "ta": [
        "enakku",
        "ennaku",
        "naan",
        "nan",
        "en",
        "ennai",
        "romba",
        "tension",
        "bayam",
        "bayama",
        "kavalai",
        "kashtam",
        "thani",
        "thaniya",
        "yarum",
        "yaarum",
        "illai",
        "udavi",
        "veedu",
        "padippu",
        "thervu",
        "parikshai",
        "patri",
        "irukku",
        "irukkirathu",
    ],

    "kn": [
        "nanage",
        "nange",
        "nanu",
        "naanu",
        "nanna",
        "tumba",
        "tumbaa",
        "bahala",
        "bhaya",
        "bhayaagide",
        "chinte",
        "tension",
        "kashta",
        "obba",
        "obbalu",
        "yavude",
        "yaaru",
        "illa",
        "sahaya",
        "mane",
        "parikshe",
        "parikshegalu",
        "bagge",
        "ide",
        "agide",
    ],

    "ml": [
        "enikku",
        "enik",
        "njan",
        "njaan",
        "ente",
        "valare",
        "tension",
        "bhayam",
        "ashanka",
        "vishamam",
        "ottakku",
        "aarum",
        "illa",
        "sahayam",
        "veedu",
        "pareeksha",
        "pareekshakal",
        "kurichu",
        "und",
        "undu",
    ],

    "bn": [
        "amar",
        "amake",
        "ami",
        "amar",
        "onek",
        "onekta",
        "bhoy",
        "chinta",
        "tension",
        "eka",
        "keu",
        "nei",
        "sahajjo",
        "bari",
        "porikkha",
    ],

    "mr": [
        "mala",
        "majha",
        "majhi",
        "majhe",
        "mi",
        "khup",
        "bhiti",
        "kalji",
        "tension",
        "ekta",
        "ekati",
        "koni",
        "nahi",
        "madat",
        "ghar",
        "pariksha",
        "abhyas",
    ],

    "gu": [
        "mane",
        "maru",
        "mari",
        "maro",
        "hu",
        "bahu",
        "ghanu",
        "dar",
        "chinta",
        "tension",
        "eklo",
        "ekli",
        "koi",
        "nathi",
        "madad",
        "ghar",
        "pariksha",
    ],

    "pa": [
        "mainu",
        "menu",
        "mera",
        "meri",
        "mere",
        "main",
        "bahut",
        "dar",
        "chinta",
        "tension",
        "ikalla",
        "ikalli",
        "koi",
        "nahi",
        "madad",
        "ghar",
        "parikhiya",
    ],
}


# ============================================================
# UNICODE NORMALIZATION
# ============================================================

def normalize_unicode(text):

    if not isinstance(text, str):
        text = str(text)

    return unicodedata.normalize(
        "NFC",
        text
    )


# ============================================================
# NATIVE SCRIPT DETECTION
# ============================================================

def detect_script_language(text):

    if not text or not text.strip():
        return None

    scores = {}

    for language, script_range in SCRIPT_RANGES.items():

        matches = re.findall(
            f"[{script_range}]",
            text
        )

        scores[language] = len(matches)

    best_language = max(
        scores,
        key=scores.get
    )

    best_score = scores[
        best_language
    ]

    if best_score > 0:
        return best_language

    return None


# ============================================================
# ROMANIZED LANGUAGE DETECTION
# ============================================================

def detect_romanized_language(text):

    words = re.findall(
        r"[A-Za-z]+",
        text.lower()
    )

    if not words:
        return None, 0.0

    scores = {}

    for language, hints in ROMANIZED_HINTS.items():

        score = 0

        for word in words:

            if word in hints:
                score += 1

        scores[language] = score

    best_language = max(
        scores,
        key=scores.get
    )

    best_score = scores[
        best_language
    ]

    # Require at least TWO language-specific words.
    if best_score >= 2:

        # Confidence is deliberately conservative.
        confidence = min(
            best_score / 5.0,
            1.0
        )

        return (
            best_language,
            round(confidence, 4)
        )

    return None, 0.0


# ============================================================
# COMPLETE LANGUAGE DETECTION
# ============================================================

def detect_language(text):

    if not text or not text.strip():
        return "unknown"

    text = normalize_unicode(
        text
    )

    # --------------------------------------------------------
    # 1. Native script
    # --------------------------------------------------------

    script_language = detect_script_language(
        text
    )

    if script_language:
        return script_language


    # --------------------------------------------------------
    # 2. Romanized Indian language
    # --------------------------------------------------------

    romanized_language, _ = (
        detect_romanized_language(
            text
        )
    )

    if romanized_language:
        return romanized_language


    # --------------------------------------------------------
    # 3. Latin-script fallback
    # --------------------------------------------------------

    latin_count = len(
        re.findall(
            r"[A-Za-z]",
            text
        )
    )

    if latin_count > 0:
        return "en"


    return "unknown"


# ============================================================
# BASIC CLEANING
# ============================================================

def clean_text(text):

    text = normalize_unicode(
        text
    )

    # IMPORTANT:
    # Do NOT alter Unicode letters.
    # Do NOT insert spaces between characters.
    # Only remove control characters.

    cleaned = "".join(

        char

        for char in text

        if (
            unicodedata.category(char) != "Cc"
            or char in "\n\t"
        )
    )

    # Normalize spaces without touching
    # Unicode characters.

    cleaned = re.sub(
        r"[ \t]+",
        " ",
        cleaned
    )

    cleaned = re.sub(
        r"\n+",
        "\n",
        cleaned
    )

    return cleaned.strip()


# ============================================================
# COMPLETE PREPROCESSING
# ============================================================

def preprocess_text(text):

    original_text = text

    cleaned_text = clean_text(
        text
    )

    language = detect_language(
        cleaned_text
    )

    romanized = False
    romanized_language = None
    romanized_confidence = 0.0

    # Native script takes priority.
    if detect_script_language(cleaned_text):

        romanized = False

    else:

        (
            romanized_language,
            romanized_confidence
        ) = detect_romanized_language(
            cleaned_text
        )

        if romanized_language:

            romanized = True


    return {

        "original_text":
            original_text,

        "cleaned_text":
            cleaned_text,

        "language":
            language,

        "language_name":
            LANGUAGE_NAMES.get(
                language,
                "Unknown"
            ),

        "romanized":
            romanized,

        "romanized_language":
            romanized_language,

        "romanized_confidence":
            romanized_confidence
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    TEST_CASES = [

        (
            "ENGLISH",
            "I am very worried about my exams."
        ),

        (
            "HINDI",
            "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।"
        ),

        (
            "TELUGU",
            "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది."
        ),

        (
            "TAMIL",
            "எனது தேர்வுகள் பற்றி நான் மிகவும் கவலைப்படுகிறேன்."
        ),

        (
            "KANNADA",
            "ನನ್ನ ಪರೀಕ್ಷೆಗಳ ಬಗ್ಗೆ ನನಗೆ ತುಂಬಾ ಆತಂಕವಾಗಿದೆ."
        ),

        (
            "MALAYALAM",
            "എന്റെ പരീക്ഷകളെക്കുറിച്ച് എനിക്ക് വളരെ ആശങ്കയുണ്ട്."
        ),

        (
            "GUJARATI",
            "મને મારી પરીક્ષાઓ વિશે ખૂબ ચિંતા છે."
        ),

        (
            "PUNJABI",
            "ਮੈਨੂੰ ਆਪਣੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ ਬਾਰੇ ਬਹੁਤ ਚਿੰਤਾ ਹੈ।"
        ),

        (
            "ROMANIZED HINDI",
            "mujhe exams ko lekar bahut tension hai"
        ),

        (
            "ROMANIZED TELUGU",
            "naku exams gurinchi chala tension ga undi"
        ),

        (
            "ROMANIZED TAMIL",
            "enakku romba bayama irukku"
        ),

        (
            "ROMANIZED KANNADA",
            "nanage tumba bhaya ide"
        )
    ]


    print("=" * 70)
    print("NHAA MULTILINGUAL LANGUAGE DETECTION TEST")
    print("=" * 70)


    for name, text in TEST_CASES:

        result = preprocess_text(
            text
        )

        print()
        print("-" * 70)

        print(
            "TEST:",
            name
        )

        print(
            "Original:",
            result["original_text"]
        )

        print(
            "Cleaned:",
            result["cleaned_text"]
        )

        print(
            "Language:",
            result["language"]
        )

        print(
            "Language name:",
            result["language_name"]
        )

        print(
            "Romanized:",
            result["romanized"]
        )

        print(
            "Romanized language:",
            result["romanized_language"]
        )

        print(
            "Romanized confidence:",
            result["romanized_confidence"]
        )


    print()
    print("=" * 70)
    print("LANGUAGE DETECTION TEST COMPLETED")
    print("=" * 70)