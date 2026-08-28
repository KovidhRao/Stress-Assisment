import re
from spellchecker import SpellChecker


# ============================================================
# NHAA TEXT NORMALIZER
# ============================================================
#
# Purpose:
# 1. Preserve the original user story
# 2. Fix common English spelling mistakes
# 3. Normalize common chat-style English
# 4. Detect Romanized Indian-language text
# 5. Prepare text for the NLP pipeline
#
# IMPORTANT:
# We only perform English spelling correction when the
# detected language is English.
# ============================================================


spell = SpellChecker()


# ============================================================
# COMMON CHAT / TYPING CORRECTIONS
# ============================================================

COMMON_CORRECTIONS = {

    "iam": "i am",
    "im": "i am",
    "ive": "i have",
    "id": "i would",
    "ill": "i will",
    "dont": "don't",
    "doesnt": "doesn't",
    "didnt": "didn't",
    "cant": "can't",
    "cannot": "cannot",
    "wont": "won't",
    "wouldnt": "wouldn't",
    "couldnt": "couldn't",
    "shouldnt": "shouldn't",
    "isnt": "isn't",
    "arent": "aren't",
    "wasnt": "wasn't",
    "werent": "weren't",
    "havent": "haven't",
    "hasnt": "hasn't",
    "hadnt": "hadn't",
    "thats": "that's",
    "theres": "there's",
    "whats": "what's",
    "hes": "he's",
    "shes": "she's",
    "theyre": "they're",
    "youre": "you're",
    "wanna": "want to",
    "gonna": "going to",
    "gotta": "got to",
}


# ============================================================
# COMMON MISSPELLINGS
# ============================================================

COMMON_MISSPELLINGS = {

    "streed": "stressed",
    "stresed": "stressed",
    "stressd": "stressed",
    "streesed": "stressed",

    "havy": "heavy",
    "havily": "heavily",
    "heavly": "heavily",

    "realy": "really",
    "reallly": "really",

    "worrid": "worried",
    "woried": "worried",
    "wory": "worry",

    "anxius": "anxious",
    "anxous": "anxious",

    "afrid": "afraid",
    "afraid": "afraid",

    "scard": "scared",

    "frightend": "frightened",
    "frightned": "frightened",

    "exams": "exams",
    "examm": "exam",
    "exma": "exam",

    "asignment": "assignment",
    "assignmnt": "assignment",
    "assignement": "assignment",

    "studys": "studies",

    "sleap": "sleep",
    "slep": "sleep",
    "sllep": "sleep",

    "nobody": "nobody",
    "noone": "no one",

    "alonn": "alone",
    "allone": "alone",

    "isolatd": "isolated",
    "isloated": "isolated",

    "thret": "threat",
    "threatend": "threatened",
    "thretened": "threatened",

    "attaked": "attacked",
    "atacked": "attacked",

    "violnce": "violence",

    "traum": "trauma",
    "traumaticc": "traumatic",

    "helpng": "helping",
    "helpping": "helping",

    "confusd": "confused",

    "hoples": "hopeless",
    "hopless": "hopeless",

    "depresed": "depressed",
    "depressd": "depressed",

    "sadnesss": "sadness",

    "fearr": "fear",
}


# ============================================================
# ROMANIZED INDIAN LANGUAGE HINTS
# ============================================================
#
# These are NOT translations.
#
# They are only used to identify likely Romanized Indian
# language input so that English spelling correction does not
# damage it.
# ============================================================

ROMANIZED_HINTS = {

    "hi": [
        "mujhe",
        "mera",
        "meri",
        "mere",
        "main",
        "mein",
        "bahut",
        "bohot",
        "dar",
        "darr",
        "chinta",
        "pareshan",
        "tension",
        "akela",
        "akeli",
        "koi",
        "nahi",
        "nahin",
        "madad",
        "zindagi",
        "ghar",
        "parivar",
    ],

    "te": [
        "naku",
        "naaku",
        "naa",
        "na",
        "chala",
        "chaala",
        "bhayam",
        "bayam",
        "tension",
        "ibbandi",
        "kastam",
        "kashtam",
        "ontariga",
        "evaru",
        "ledu",
        "leedu",
        "sahayam",
        "intlo",
        "pariksha",
        "parikshalu",
    ],

    "ta": [
        "enakku",
        "naan",
        "nangu",
        "romba",
        "bayam",
        "kavalai",
        "tension",
        "kashtam",
        "thani",
        "yarum",
        "illai",
        "udavi",
        "veedu",
        "padippu",
        "thervu",
    ],

    "kn": [
        "nanage",
        "nanu",
        "tumba",
        "bhaya",
        "chinte",
        "tension",
        "kashta",
        "obba",
        "yavude",
        "illa",
        "sahaya",
        "mane",
        "parikshe",
    ],

    "ml": [
        "enikku",
        "njan",
        "valare",
        "bhayam",
        "ashanka",
        "tension",
        "vishamam",
        "ottakku",
        "aarum",
        "illa",
        "sahayam",
        "veedu",
        "pareeksha",
    ],

    "bn": [
        "amar",
        "amake",
        "ami",
        "onek",
        "onekta",
        "bhoy",
        "chinta",
        "tension",
        "eka",
        "keu",
        "nei",
        "sahajjo",
    ],

    "mr": [
        "mala",
        "majha",
        "majhi",
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
    ],

    "gu": [
        "mane",
        "maru",
        "mari",
        "hu",
        "bahu",
        "dar",
        "chinta",
        "tension",
        "eklo",
        "koi",
        "nathi",
        "madad",
    ],

    "pa": [
        "mainu",
        "mera",
        "meri",
        "main",
        "bahut",
        "dar",
        "chinta",
        "tension",
        "ikalla",
        "koi",
        "nahi",
        "madad",
    ],
}


# ============================================================
# TOKENIZATION
# ============================================================

def tokenize(text):

    return re.findall(
        r"[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z\s]+",
        text
    )


# ============================================================
# ROMANIZED LANGUAGE DETECTION
# ============================================================

def detect_romanized_language(text):

    words = re.findall(
        r"[A-Za-z]+",
        text.lower()
    )

    if not words:
        return None


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


    # Require at least two language-specific hints.
    if best_score >= 2:

        return best_language


    return None


# ============================================================
# COMMON CORRECTION
# ============================================================

def apply_common_corrections(text):

    words = text.split()

    corrected = []

    for word in words:

        # Preserve punctuation around word
        match = re.match(
            r"^([^A-Za-z]*)([A-Za-z']+)([^A-Za-z]*)$",
            word
        )

        if not match:

            corrected.append(
                word
            )

            continue


        prefix = match.group(1)
        core = match.group(2)
        suffix = match.group(3)

        lower_core = core.lower()


        if lower_core in COMMON_CORRECTIONS:

            replacement = COMMON_CORRECTIONS[
                lower_core
            ]

            corrected.append(
                prefix +
                replacement +
                suffix
            )

            continue


        if lower_core in COMMON_MISSPELLINGS:

            replacement = COMMON_MISSPELLINGS[
                lower_core
            ]

            corrected.append(
                prefix +
                replacement +
                suffix
            )

            continue


        corrected.append(
            word
        )


    return " ".join(
        corrected
    )


# ============================================================
# SPELLCHECK
# ============================================================

def apply_spellcheck(text):

    words = text.split()

    corrected = []

    for word in words:

        match = re.match(
            r"^([A-Za-z]*)([^A-Za-z]*)$",
            word
        )

        if not match:

            corrected.append(
                word
            )

            continue


        core = match.group(1)
        suffix = match.group(2)


        if not core:

            corrected.append(
                word
            )

            continue


        lower_core = core.lower()


        # Don't modify short/common words.
        if len(lower_core) <= 3:

            corrected.append(
                word
            )

            continue


        # Already known correct word.
        if lower_core in spell:

            corrected.append(
                word
            )

            continue


        candidate = spell.correction(
            lower_core
        )


        if candidate:

            corrected.append(
                candidate +
                suffix
            )

        else:

            corrected.append(
                word
            )


    return " ".join(
        corrected
    )


# ============================================================
# ENGLISH NORMALIZATION
# ============================================================

def normalize_english(text):

    text = apply_common_corrections(
        text
    )

    text = apply_spellcheck(
        text
    )

    # Normalize spaces.
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# COMPLETE NORMALIZATION
# ============================================================

def normalize_text(
    text,
    language="en"
):

    original_text = text


    # Detect Romanized Indian language.
    romanized_language = (
        detect_romanized_language(
            text
        )
    )


    # If Romanized Indian language is
    # detected, do NOT apply English
    # spell correction.
    if romanized_language:

        corrected_text = text

        processing_language = (
            romanized_language
        )

    elif language == "en":

        corrected_text = normalize_english(
            text
        )

        processing_language = "en"

    else:

        # Native non-English scripts:
        # preserve the text for now.
        corrected_text = text

        processing_language = language


    return {

        "original_text":
            original_text,

        "corrected_text":
            corrected_text,

        "language":
            processing_language,

        "romanized":
            romanized_language is not None,

        "romanized_language":
            romanized_language
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    TEST_CASES = [

        (
            "ENGLISH SPELLING",
            "iam feeling streed havily about my exams i cant slep"
        ),

        (
            "HINDI ROMANIZED",
            "mujhe exams ko lekar bahut tension hai"
        ),

        (
            "TELUGU ROMANIZED",
            "naku exams gurinchi chala tension ga undi"
        ),

        (
            "ENGLISH NORMAL",
            "I am very worried about my exams."
        ),

        (
            "TELUGU",
            "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది."
        ),

        (
            "HINDI",
            "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।"
        )
    ]


    print("=" * 70)
    print("NHAA TEXT NORMALIZATION TEST")
    print("=" * 70)


    for name, text in TEST_CASES:

        print()
        print("-" * 70)

        print(
            "TEST:",
            name
        )

        print(
            "Original:",
            text
        )


        result = normalize_text(
            text,
            language="en"
        )


        print(
            "Corrected:",
            result["corrected_text"]
        )

        print(
            "Processing language:",
            result["language"]
        )

        print(
            "Romanized:",
            result["romanized"]
        )


    print()
    print("=" * 70)
    print("TEXT NORMALIZATION TEST COMPLETED")
    print("=" * 70)