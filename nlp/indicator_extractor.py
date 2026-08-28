import re
import sys
from pathlib import Path

import importlib.util

pipeline = None
if importlib.util.find_spec("transformers") is not None:
    try:
        transformers_mod = importlib.import_module("transformers")
        pipeline = getattr(transformers_mod, "pipeline", None)
    except Exception:
        pipeline = None


# ============================================================
# NHAA MULTILINGUAL INDICATOR EXTRACTOR
# ============================================================
#
# Supports:
#   1. Native-language text
#   2. Romanized-language text
#   3. English translated/analysis text
#   4. Natural English phrases
#
# IMPORTANT:
# Situation classification and indicator extraction are separate.
#
# Example:
#
#   "I am afraid about my exams."
#
#   situation = ACADEMIC_STRESS
#   fear      = detected
#
# ============================================================


BASE_DIR = Path(__file__).resolve().parent.parent

LEXICON_DIR = BASE_DIR / "nlp" / "lexicon"

sys.path.insert(0, str(LEXICON_DIR))


# ============================================================
# IMPORT MULTILINGUAL DICTIONARY ENGINE
# ============================================================

try:

    from dictionary_engine import (
        analyze_multilingual
    )

    DICTIONARY_ENGINE_AVAILABLE = True

except Exception as error:

    print(
        "WARNING: Dictionary engine could not be loaded:"
    )

    print(error)

    DICTIONARY_ENGINE_AVAILABLE = False


# ============================================================
# SUPPORTED LANGUAGES
# ============================================================

SUPPORTED_LANGUAGES = {

    "en": "English",

    "te": "Telugu",

    "hi": "Hindi",

    "ta": "Tamil",

    "kn": "Kannada",

    "gu": "Gujarati",

    "pa": "Punjabi",

    "mr": "Marathi",

    "bn": "Bengali",

    "ur": "Urdu"
}


# ============================================================
# INDICATORS
# ============================================================

INDICATORS = [

    "stress",

    "fear",

    "anxiety",

    "distress",

    "trauma",

    "threat",

    "violence",

    "immediate_danger",

    "isolation",

    "vulnerability"
]


# ============================================================
# EMOTION MODEL
# ============================================================

if pipeline is not None:
    try:
        emotion_model = pipeline(
            "text-classification",
            model=(
                "j-hartmann/"
                "emotion-english-distilroberta-base"
            ),
            top_k=None
        )
        EMOTION_MODEL_AVAILABLE = True
    except Exception as error:
        print("WARNING: Emotion model could not be loaded:", error)
        emotion_model = None
        EMOTION_MODEL_AVAILABLE = False
else:
    emotion_model = None
    EMOTION_MODEL_AVAILABLE = False


# ============================================================
# SITUATION RULES
# ============================================================

SITUATION_RULES = {

    "ACADEMIC_STRESS": [

        "exam",
        "exams",
        "examination",
        "examinations",
        "test",
        "tests",
        "study",
        "studying",
        "studies",
        "school",
        "college",
        "university",
        "assignment",
        "assignments",
        "homework",
        "marks",
        "grades",
        "grade",
        "result",
        "results",
        "semester",
        "course",
        "class"
    ],


    "FAMILY_STRESS": [

        "at home",
        "home",
        "difficult at home",
        "family",
        "family problems",
        "family problem",
        "problems at home",
        "problem at home",
        "things at home",
        "situation at home",
        "home situation",
        "responsibilities at home",
        "responsibilities",
        "parents",
        "parent",
        "mother",
        "father",
        "siblings",
        "brother",
        "sister"
    ],


    "WORK_STRESS": [

        "work",
        "job",
        "workplace",
        "office",
        "workload",
        "more work",
        "getting more work",
        "too much work",
        "too many tasks",
        "deadline",
        "deadlines",
        "boss",
        "manager",
        "colleagues"
    ],


    "ANXIETY": [

        "cannot relax",
        "can't relax",
        "something bad is going to happen",
        "something bad will happen",
        "something bad might happen",
        "keep worrying",
        "keeps worrying",
        "constantly worrying",
        "always worrying",
        "worried about what might happen",
        "expecting something bad",
        "feel anxious",
        "feeling anxious",
        "anxious",
        "anxiety"
    ],


    "EMOTIONAL_DISTRESS": [

        "overwhelmed",
        "overwhelmed by everything",
        "can't handle everything",
        "cannot handle everything",
        "can't cope",
        "cannot cope",
        "hard to cope",
        "difficult to cope",
        "don't know what to do",
        "do not know what to do",
        "don't know what to do anymore",
        "do not know what to do anymore",
        "can't handle this",
        "cannot handle this",
        "feel helpless",
        "feeling helpless",
        "too much to handle",
        "everything feels too much"
    ],


    "ISOLATION": [

        "alone",
        "completely alone",
        "feel alone",
        "feeling alone",
        "isolated",
        "feel isolated",
        "feeling isolated",
        "nobody to talk",
        "nobody to talk to",
        "no one to talk",
        "no one to talk to",
        "have nobody",
        "nobody to turn to",
        "no one to turn to",
        "without any support",
        "no support",
        "without support",
        "no one understands me",
        "nobody understands me"
    ],


    "INTIMIDATION": [

        "stay silent",
        "warning me",
        "warned me",
        "warning",
        "intimidation",
        "intimidated",
        "silence me",
        "threatening me",
        "keep warning",
        "keep threatening",
        "if i speak up",
        "if I speak up",
        "speak up",
        "don't speak",
        "do not speak"
    ],


    "DISPLACEMENT": [

        "forced to leave",
        "forced us to leave",
        "forced out",
        "leave our home",
        "left our home",
        "fled our home",
        "had to leave my home",
        "leave my home",
        "displaced",
        "displacement",
        "evicted",
        "eviction",
        "nowhere to stay",
        "where we will stay",
        "where will we stay"
    ],


    "VIOLENCE": [

        "violence",
        "violent",
        "attack",
        "attacked",
        "assault",
        "assaulted",
        "beaten",
        "beat me",
        "hit me",
        "punched me",
        "kicked me",
        "physically attacked",
        "physical attack",
        "physical violence",
        "physically hurt me",
        "someone hurt me",
        "someone physically hurt me"
    ],


    "THREAT": [

        "threat",
        "threats",
        "threatened",
        "threatening",
        "threaten me",
        "threatened me",
        "harm me",
        "hurt me",
        "kill me",
        "warning me",
        "warned me",
        "warned me not to speak"
    ],


    "IMMEDIATE_DANGER": [

        "immediate danger",
        "in immediate danger",
        "danger right now",
        "in danger right now",
        "i am in danger",
        "right now",
        "not safe right now",
        "don't feel safe right now",
        "do not feel safe right now",
        "unsafe right now",
        "may hurt me right now"
    ],


    "GRIEF": [

        "lost someone",
        "lost someone important",
        "someone passed away",
        "passed away",
        "lost a loved one",
        "deeply sad",
        "feel empty",
        "feeling empty",
        "grieving",
        "grief"
    ],


    "FINANCIAL_STRESS": [

        "financially",
        "financial problems",
        "financial problem",
        "money problems",
        "money problem",
        "struggling financially",
        "pay my bills",
        "can't pay my bills",
        "cannot pay my bills",
        "bills",
        "debt",
        "debts",
        "rent",
        "cannot afford"
    ],


    "FEAR": [

        "afraid",
        "scared",
        "fear",
        "frightened",
        "terrified",
        "very afraid",
        "very scared",
        "feel afraid",
        "feeling afraid"
    ],


    "TRAUMA": [

        "trauma",
        "traumatic",
        "something happened",
        "something happened a few days ago",
        "keep thinking about what happened",
        "can't stop thinking about what happened",
        "cannot stop thinking about what happened",
        "flashbacks",
        "nightmares about what happened"
    ],


    "VULNERABILITY": [

        "vulnerable",
        "feel vulnerable",
        "feeling vulnerable",
        "helpless",
        "powerless",
        "no support",
        "without support",
        "nowhere safe",
        "nowhere to go",
        "unable to protect myself",
        "cannot protect myself"
    ]
}


# ============================================================
# NATURAL ENGLISH INDICATOR PATTERNS
# ============================================================
#
# These patterns are NOT replacing the dictionary.
#
# They are an additional layer for natural sentences where
# a person expresses a condition without using an exact
# dictionary keyword.
#
# ============================================================

NATURAL_ENGLISH_INDICATORS = {

    "stress": [

        r"\bstressed\b",
        r"\bunder a lot of pressure\b",
        r"\bunder pressure\b",
        r"\btoo much pressure\b",
        r"\bpressure lately\b",
        r"\bstruggling to keep up\b",
        r"\bhard to keep up\b",
        r"\bdifficult to keep up\b",
        r"\btoo much work\b",
        r"\btoo many responsibilities\b",
        r"\bmore work\b",
        r"\bgetting more work\b",
        r"\bworkload\b"
    ],


    "fear": [

        r"\bafraid\b",
        r"\bscared\b",
        r"\bfrightened\b",
        r"\bterrified\b",
        r"\bfeel unsafe\b",
        r"\bdo not feel safe\b",
        r"\bdon't feel safe\b",
        r"\bworry that someone may hurt me\b",
        r"\bafraid they may hurt me\b"
    ],


    "anxiety": [

        r"\banxious\b",
        r"\banxiety\b",
        r"\bworried\b",
        r"\bworrying\b",
        r"\bkeep worrying\b",
        r"\bkeeps worrying\b",
        r"\bconstantly worried\b",
        r"\bconstantly anxious\b",
        r"\bcan't relax\b",
        r"\bcannot relax\b",
        r"\bsomething bad is going to happen\b",
        r"\bsomething bad might happen\b",
        r"\bsomething bad will happen\b",
        r"\bthinking something bad\b",
        r"\bkeep thinking something bad\b"
    ],


    "distress": [

        r"\boverwhelmed\b",
        r"\bcan't handle\b",
        r"\bcannot handle\b",
        r"\bcan't cope\b",
        r"\bcannot cope\b",
        r"\bhard to cope\b",
        r"\bdifficult to cope\b",
        r"\bcan't manage\b",
        r"\bcannot manage\b",
        r"\bdo not know what to do\b",
        r"\bdon't know what to do\b",
        r"\bdo not know what to do anymore\b",
        r"\bdon't know what to do anymore\b",
        r"\bfeel helpless\b",
        r"\bfeeling helpless\b",
        r"\btoo much to handle\b",
        r"\beverything feels too much\b",
        r"\bcan't deal with everything\b",
        r"\bcannot deal with everything\b"
    ],


    "trauma": [

        r"\btrauma\b",
        r"\btraumatic\b",
        r"\bkeep thinking about what happened\b",
        r"\bcan't stop thinking about what happened\b",
        r"\bcannot stop thinking about what happened\b",
        r"\bflashbacks?\b",
        r"\bnightmares?\b",
        r"\bwhat happened keeps coming back\b"
    ],


    "threat": [

        r"\bthreatened\b",
        r"\bthreatening me\b",
        r"\bthreaten me\b",
        r"\bsomeone threatened me\b",
        r"\bsomeone is threatening me\b",
        r"\bwarned me\b",
        r"\bwarning me\b",
        r"\bwarned me not to speak\b",
        r"\bmay hurt me\b",
        r"\bwill hurt me\b",
        r"\bsaid they would hurt me\b",
        r"\bsaid they may hurt me\b"
    ],


    "violence": [

        r"\battacked me\b",
        r"\bphysically attacked\b",
        r"\bphysically hurt me\b",
        r"\bsomeone hurt me\b",
        r"\bhit me\b",
        r"\bpunched me\b",
        r"\bkicked me\b",
        r"\bbeat me\b",
        r"\bbeaten\b",
        r"\bassaulted me\b",
        r"\bphysically assaulted\b"
    ],


    "immediate_danger": [

        r"\bin immediate danger\b",
        r"\bin danger right now\b",
        r"\bi am in danger\b",
        r"\bi'm in danger\b",
        r"\bin danger\b",
        r"\bdanger right now\b",
        r"\bnot safe right now\b",
        r"\bdon't feel safe right now\b",
        r"\bdo not feel safe right now\b",
        r"\bunsafe right now\b",
        r"\bmay hurt me right now\b"
    ],


    "isolation": [

        r"\bcompletely alone\b",
        r"\bfeel completely alone\b",
        r"\bfeel alone\b",
        r"\bfeeling alone\b",
        r"\bfeel isolated\b",
        r"\bfeeling isolated\b",
        r"\bhave nobody to talk to\b",
        r"\bhave no one to talk to\b",
        r"\bnobody to talk to\b",
        r"\bno one to talk to\b",
        r"\bnobody to turn to\b",
        r"\bno one to turn to\b",
        r"\bwithout any support\b",
        r"\bwithout support\b",
        r"\bno support\b",
        r"\bdealing with this alone\b",
        r"\bdealing with all of this alone\b"
    ],


    "vulnerability": [

        r"\bfeel vulnerable\b",
        r"\bfeeling vulnerable\b",
        r"\bfeel helpless\b",
        r"\bfeeling helpless\b",
        r"\bfeel powerless\b",
        r"\bfeeling powerless\b",
        r"\bnowhere safe to go\b",
        r"\bnowhere to go\b",
        r"\bno support\b",
        r"\bwithout support\b",
        r"\bunable to protect myself\b",
        r"\bcannot protect myself\b"
    ]
}


# ============================================================
# NORMALIZE TEXT
# ============================================================

def normalize_text(text):

    if text is None:

        return ""

    text = str(text)

    text = text.lower()

    replacements = {

        "’": "'",

        "‘": "'",

        "“": '"',

        "”": '"',

        "\u200c": "",

        "\u200d": ""
    }

    for old, new in replacements.items():

        text = text.replace(
            old,
            new
        )

    # Normalize common contractions

    text = text.replace(
        "can't",
        "cannot"
    )

    text = text.replace(
        "don't",
        "do not"
    )

    text = text.replace(
        "doesn't",
        "does not"
    )

    text = text.replace(
        "didn't",
        "did not"
    )

    text = text.replace(
        "i'm",
        "i am"
    )

    text = text.replace(
        "i've",
        "i have"
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# FIND SITUATION MATCHES
# ============================================================

def find_situation_matches(text):

    text = normalize_text(
        text
    )

    result = {}

    for situation, rules in (
        SITUATION_RULES.items()
    ):

        matches = []

        for rule in rules:

            rule = normalize_text(
                rule
            )

            if not rule:

                continue

            pattern = (
                r"(?<!\w)"
                + re.escape(rule)
                + r"(?!\w)"
            )

            if re.search(
                pattern,
                text
            ):

                matches.append(
                    rule
                )

        if matches:

            result[
                situation
            ] = list(
                dict.fromkeys(
                    matches
                )
            )

    return result


# ============================================================
# NATURAL ENGLISH INDICATOR MATCHER
# ============================================================

def natural_indicator_matches(
    text
):

    text = normalize_text(
        text
    )

    results = {}

    for indicator, patterns in (
        NATURAL_ENGLISH_INDICATORS.items()
    ):

        found = []

        for pattern in patterns:

            try:

                if re.search(
                    pattern,
                    text,
                    flags=re.IGNORECASE
                ):

                    found.append(
                        pattern
                    )

            except re.error:

                continue

        if found:

            results[
                indicator
            ] = list(
                dict.fromkeys(
                    found
                )
            )

    return results


# ============================================================
# DETECT SITUATION
# ============================================================

def detect_situation(
    original_text,
    analysis_text=None
):

    combined_text = normalize_text(
        original_text
    )

    if analysis_text:

        combined_text += " "

        combined_text += normalize_text(
            analysis_text
        )

    matches = find_situation_matches(
        combined_text
    )

    if not matches:

        return (
            "UNKNOWN",
            0.0,
            []
        )

    ranked = sorted(

        matches.items(),

        key=lambda item: (
            len(item[1])
        ),

        reverse=True
    )

    situation = ranked[0][0]

    matched_rules = ranked[0][1]

    if len(matched_rules) >= 2:

        confidence = 1.0

    else:

        confidence = 0.5

    return (

        situation,

        confidence,

        matched_rules
    )


# ============================================================
# ROMANIZED FALLBACK
# ============================================================

ROMANIZED_FALLBACK = {

    "fear": {

        "te": [

            "bayam",
            "bhayam",
            "bhayanga",
            "bayanga",
            "bayapadutunnanu",
            "bhayapadutunnanu",
            "bayam vestundi",
            "bayam vestundhi",
            "bhayam vestundi",
            "bhayam vestundhi",
            "chaala bayam",
            "chala bayam"
        ],

        "hi": [

            "dar",
            "darr",
            "bhay",
            "bhaya",
            "bahut dar",
            "dar lag",
            "darr lag",
            "bahut darr"
        ],

        "ta": [

            "bayam",
            "payam",
            "bayama",
            "romba bayama",
            "bayama irukku",
            "bayama iruku",
            "acham"
        ],

        "kn": [

            "bhaya",
            "bhayavide",
            "tumba bhaya",
            "bhaya ide",
            "hedarike"
        ],

        "gu": [

            "dar",
            "darr",
            "bhay",
            "bhaya",
            "bahu dar"
        ],

        "pa": [

            "dar",
            "darr",
            "bhay",
            "bahut dar",
            "darr lagda"
        ],

        "mr": [

            "bhiti",
            "bhay",
            "bhiti vatate",
            "ghabarat"
        ],

        "bn": [

            "bhoy",
            "bhoy lagche",
            "bhoy lage"
        ],

        "ur": [

            "khauf",
            "dar",
            "darr",
            "khaufzada"
        ]
    },


    "anxiety": {

        "te": [

            "aandolana",
            "andolana",
            "chinta",
            "tension",
            "nervous",
            "naku tension",
            "chaala tension",
            "chala tension"
        ],

        "hi": [

            "chinta",
            "pareshan",
            "pareshaan",
            "ghabrahat",
            "tension",
            "nervous",
            "bechain",
            "bahut chinta"
        ],

        "ta": [

            "kavalai",
            "kavalaya",
            "chinta",
            "tension",
            "nervous",
            "romba kavalai"
        ],

        "kn": [

            "chinte",
            "chinta",
            "tension",
            "aatanka",
            "atanka",
            "nervous"
        ],

        "gu": [

            "chinta",
            "tension",
            "ghabrahat",
            "bechain",
            "bahu chinta"
        ],

        "pa": [

            "chinta",
            "tension",
            "ghabrahat",
            "pareshan",
            "bahut chinta"
        ],

        "mr": [

            "chinta",
            "ghabarat",
            "kalaji",
            "tension"
        ],

        "bn": [

            "chinta",
            "udbeg",
            "tension",
            "osthir"
        ],

        "ur": [

            "fikr",
            "pareshani",
            "bechaini",
            "tashweesh"
        ]
    },


    "stress": {

        "te": [

            "stress",
            "stressed",
            "tension",
            "ottidi",
            "vattidi",
            "baruvu",
            "chaala tension",
            "chala tension"
        ],

        "hi": [

            "stress",
            "stressed",
            "tension",
            "tanav",
            "tanaav",
            "dabav",
            "dabaav"
        ],

        "ta": [

            "stress",
            "stressed",
            "tension",
            "romba tension"
        ],

        "kn": [

            "stress",
            "stressed",
            "tension",
            "ottada",
            "tumba tension"
        ],

        "gu": [

            "stress",
            "stressed",
            "tension",
            "tanav",
            "bahu tension"
        ],

        "pa": [

            "stress",
            "stressed",
            "tension",
            "tanav",
            "bahut tension"
        ],

        "mr": [

            "stress",
            "stressed",
            "tension",
            "tanav"
        ],

        "bn": [

            "stress",
            "stressed",
            "tension",
            "chap"
        ],

        "ur": [

            "stress",
            "tension",
            "dabao",
            "zehni dabao"
        ]
    },


    "distress": {

        "te": [

            "em cheyalo teliyatledu",
            "em cheyalo teliyadu",
            "emi cheyalo teliyatledu",
            "emi cheyalo teliyadu",
            "em cheyalo ardham kavatledu",
            "ardham kavatledu",
            "tattukolekapotunnanu",
            "kastanga undi"
        ],

        "hi": [

            "kya karu samajh nahi aa raha",
            "kya karna hai pata nahi",
            "samajh nahi aa raha",
            "pata nahi kya karu",
            "bebas",
            "majboor"
        ],

        "ta": [

            "enna seivathu endru theriyavillai",
            "enna panrathu theriyala",
            "theriyala enna seiyanum",
            "mudiyala",
            "romba kashtama"
        ],

        "kn": [

            "enu madabeku gottilla",
            "en madabeku gottilla",
            "gottilla enu madabeku",
            "tumba kashta"
        ],

        "gu": [

            "shu karvu samajatu nathi",
            "shu karvu te khabar nathi",
            "samajatu nathi",
            "bahu mushkel"
        ],

        "pa": [

            "ki karna samajh nahi aa rahi",
            "ki karan samajh nahi aa rahi",
            "pata nahi ki karaan",
            "bahut mushkil"
        ],

        "mr": [

            "kay karave samajat nahi",
            "kay karayache kalat nahi",
            "samajat nahi kay karave",
            "khup kathin"
        ],

        "bn": [

            "ki korbo bujhte parchi na",
            "ki korte hobe bujhte parchi na",
            "bujhte parchi na",
            "jani na ki korbo"
        ],

        "ur": [

            "kya karna hai samajh nahi aa raha",
            "kya karun samajh nahi aa raha",
            "pata nahi kya karun",
            "samajh nahi aa raha"
        ]
    }
}


# ============================================================
# FALLBACK MATCHER
# ============================================================

def fallback_matches(
    text,
    language,
    romanized
):

    if not romanized:

        return {}

    text = normalize_text(
        text
    )

    results = {}

    for indicator, languages in (
        ROMANIZED_FALLBACK.items()
    ):

        keywords = languages.get(
            language,
            []
        )

        found = []

        for keyword in keywords:

            keyword = normalize_text(
                keyword
            )

            if not keyword:

                continue

            pattern = (
                r"(?<!\w)"
                + re.escape(keyword)
                + r"(?!\w)"
            )

            if re.search(
                pattern,
                text
            ):

                found.append(
                    keyword
                )

        if found:

            results[
                indicator
            ] = list(
                dict.fromkeys(
                    found
                )
            )

    return results


# ============================================================
# NATURAL ENGLISH SCORES
# ============================================================

def natural_indicator_scores(
    matches
):

    scores = {}

    for indicator in INDICATORS:

        values = matches.get(
            indicator,
            []
        )

        if not values:

            scores[indicator] = 0.0

            continue

        count = len(values)

        if count >= 3:

            score = 0.9

        elif count == 2:

            score = 0.8

        else:

            score = 0.7

        scores[indicator] = score

    return scores


# ============================================================
# FALLBACK SCORES
# ============================================================

def fallback_scores(
    matches
):

    scores = {}

    for indicator, values in (
        matches.items()
    ):

        if not values:

            scores[
                indicator
            ] = 0.0

            continue

        if len(values) >= 2:

            score = 1.0

        else:

            score = 0.8

        scores[
            indicator
        ] = score

    return scores


# ============================================================
# MERGE SCORES
# ============================================================

def merge_scores(
    dictionary_scores,
    fallback_indicator_scores,
    natural_scores
):

    final = {}

    for indicator in INDICATORS:

        dictionary_score = float(
            dictionary_scores.get(
                indicator,
                0.0
            )
        )

        fallback_score = float(
            fallback_indicator_scores.get(
                indicator,
                0.0
            )
        )

        natural_score = float(
            natural_scores.get(
                indicator,
                0.0
            )
        )

        final[indicator] = round(

            max(
                dictionary_score,
                fallback_score,
                natural_score
            ),

            4
        )

    return final


# ============================================================
# ANALYZE EMOTION
# ============================================================

def analyze_emotion(
    text
):

    if not text:

        return [
            {
                "label": "neutral",
                "score": 0.0
            }
        ]

    if not EMOTION_MODEL_AVAILABLE:

        return [
            {
                "label": "neutral",
                "score": 0.0
            }
        ]

    try:

        result = emotion_model(
            text
        )

        if (
            result
            and isinstance(result[0], list)
        ):

            result = result[0]

        result = sorted(

            result,

            key=lambda item:

            float(
                item.get(
                    "score",
                    0.0
                )
            ),

            reverse=True
        )

        return result

    except Exception as error:

        print(
            "Emotion model error:",
            error
        )

        return [
            {
                "label": "neutral",
                "score": 0.0
            }
        ]


# ============================================================
# MAIN INDICATOR EXTRACTION
# ============================================================

def extract_indicators(
    text,
    language="en",
    romanized=False,
    analysis_text=None
):

    original_text = (
        text or ""
    )

    translated_text = (
        analysis_text or ""
    )


    # --------------------------------------------------------
    # 1. Dictionary engine
    # --------------------------------------------------------

    dictionary_scores = {}

    dictionary_evidence = {}

    if DICTIONARY_ENGINE_AVAILABLE:

        try:

            dictionary_result = (
                analyze_multilingual(

                    original_text=original_text,

                    language=language,

                    romanized=romanized,

                    analysis_text=translated_text
                )
            )

            dictionary_scores = (
                dictionary_result.get(
                    "scores",
                    {}
                )
            )

            dictionary_evidence = (
                dictionary_result.get(
                    "evidence",
                    {}
                )
            )

        except Exception as error:

            print(
                "Dictionary analysis error:"
            )

            print(error)


    # --------------------------------------------------------
    # 2. Romanized fallback
    # --------------------------------------------------------

    fallback_matches_result = (
        fallback_matches(

            original_text,

            language,

            romanized
        )
    )

    fallback_indicator_scores = (
        fallback_scores(
            fallback_matches_result
        )
    )


    # --------------------------------------------------------
    # 3. Natural English patterns
    # --------------------------------------------------------

    natural_text = original_text

    if translated_text:

        natural_text += " "

        natural_text += translated_text

    natural_matches_result = (
        natural_indicator_matches(
            natural_text
        )
    )

    natural_scores = (
        natural_indicator_scores(
            natural_matches_result
        )
    )


    # --------------------------------------------------------
    # 4. Merge
    # --------------------------------------------------------

    indicators = merge_scores(

        dictionary_scores,

        fallback_indicator_scores,

        natural_scores
    )


    # --------------------------------------------------------
    # 5. Build evidence
    # --------------------------------------------------------

    matched_keywords = {}

    for indicator in INDICATORS:

        evidence = []


        # Dictionary evidence

        for item in (
            dictionary_evidence.get(
                indicator,
                []
            )
        ):

            if isinstance(
                item,
                dict
            ):

                term = item.get(
                    "term",
                    ""
                )

                matched_term = item.get(
                    "matched_term"
                )

                if matched_term:

                    evidence.append(
                        f"{term} -> "
                        f"{matched_term}"
                    )

                else:

                    evidence.append(
                        term
                    )

            else:

                evidence.append(
                    str(item)
                )


        # Romanized fallback evidence

        evidence.extend(
            fallback_matches_result.get(
                indicator,
                []
            )
        )


        # Natural English evidence

        natural_matches = (
            natural_matches_result.get(
                indicator,
                []
            )
        )

        for pattern in natural_matches:

            evidence.append(
                f"natural_pattern: {pattern}"
            )


        matched_keywords[
            indicator
        ] = list(
            dict.fromkeys(
                evidence
            )
        )


    return (

        indicators,

        matched_keywords
    )


# ============================================================
# COMPLETE ANALYSIS
# ============================================================

def analyze_text(
    text,
    language="en",
    romanized=False,
    analysis_text=None
):

    if language not in SUPPORTED_LANGUAGES:

        language = "en"


    # --------------------------------------------------------
    # Emotion
    # --------------------------------------------------------

    emotion_input = (

        analysis_text

        if analysis_text

        else text
    )

    emotions = analyze_emotion(
        emotion_input
    )

    if emotions:

        top_emotion = emotions[0]

    else:

        top_emotion = {
            "label": "neutral",
            "score": 0.0
        }


    # --------------------------------------------------------
    # Indicators
    # --------------------------------------------------------

    indicators, matched_keywords = (
        extract_indicators(

            text=text,

            language=language,

            romanized=romanized,

            analysis_text=analysis_text
        )
    )


    # --------------------------------------------------------
    # Situation
    # --------------------------------------------------------

    situation, situation_confidence, situation_rules = (
        detect_situation(

            original_text=text,

            analysis_text=analysis_text
        )
    )


    # --------------------------------------------------------
    # Situation enhancement
    # --------------------------------------------------------

    if situation == "ACADEMIC_STRESS":

        if (

            indicators["fear"] > 0

            or indicators["anxiety"] > 0

            or indicators["distress"] > 0

        ):

            indicators["stress"] = max(

                indicators["stress"],

                0.3333
            )


    # --------------------------------------------------------
    # Family stress enhancement
    # --------------------------------------------------------

    if situation == "FAMILY_STRESS":

        indicators["stress"] = max(

            indicators["stress"],

            0.4
        )

        if indicators["distress"] > 0:

            indicators["distress"] = max(

                indicators["distress"],

                0.4
            )


    # --------------------------------------------------------
    # Work stress enhancement
    # --------------------------------------------------------

    if situation == "WORK_STRESS":

        indicators["stress"] = max(

            indicators["stress"],

            0.5
        )


    # --------------------------------------------------------
    # Anxiety enhancement
    # --------------------------------------------------------

    if situation == "ANXIETY":

        indicators["anxiety"] = max(

            indicators["anxiety"],

            0.6
        )


    # --------------------------------------------------------
    # Isolation enhancement
    # --------------------------------------------------------

    if situation == "ISOLATION":

        indicators["isolation"] = max(

            indicators["isolation"],

            0.8
        )


    # --------------------------------------------------------
    # Threat/intimidation
    # --------------------------------------------------------

    if situation in (
        "INTIMIDATION",
        "THREAT"
    ):

        indicators["threat"] = max(

            indicators["threat"],

            0.3333
        )


    # --------------------------------------------------------
    # Violence
    # --------------------------------------------------------

    if situation == "VIOLENCE":

        indicators["violence"] = max(

            indicators["violence"],

            0.3333
        )

        indicators["fear"] = max(

            indicators["fear"],

            0.5
        )


    # --------------------------------------------------------
    # Immediate danger
    # --------------------------------------------------------

    if situation == "IMMEDIATE_DANGER":

        indicators["immediate_danger"] = 1.0

        indicators["fear"] = max(

            indicators["fear"],

            0.8
        )

        indicators["threat"] = max(

            indicators["threat"],

            0.5
        )

        indicators["vulnerability"] = max(

            indicators["vulnerability"],

            0.5
        )


    # --------------------------------------------------------
    # Trauma
    # --------------------------------------------------------

    if situation == "TRAUMA":

        indicators["trauma"] = max(

            indicators["trauma"],

            0.7
        )


    # --------------------------------------------------------
    # Fear
    # --------------------------------------------------------

    if situation == "FEAR":

        indicators["fear"] = max(

            indicators["fear"],

            0.8
        )


    # --------------------------------------------------------
    # Financial stress
    # --------------------------------------------------------

    if situation == "FINANCIAL_STRESS":

        indicators["stress"] = max(

            indicators["stress"],

            0.6
        )


    # --------------------------------------------------------
    # Emotional distress
    # --------------------------------------------------------

    if situation == "EMOTIONAL_DISTRESS":

        indicators["distress"] = max(

            indicators["distress"],

            0.7
        )


    # --------------------------------------------------------
    # Grief
    # --------------------------------------------------------

    if situation == "GRIEF":

        indicators["distress"] = max(

            indicators["distress"],

            0.7
        )


    # --------------------------------------------------------
    # Vulnerability
    # --------------------------------------------------------

    if situation == "VULNERABILITY":

        indicators["vulnerability"] = max(

            indicators["vulnerability"],

            0.8
        )


    return {

        "emotion":
            top_emotion.get(
                "label",
                "neutral"
            ),

        "emotion_confidence":
            round(

                float(
                    top_emotion.get(
                        "score",
                        0.0
                    )
                ),

                4
            ),

        "emotions":
            emotions,

        "indicators":
            indicators,

        "matched_indicator_keywords":
            matched_keywords,

        "situation":
            situation,

        "situation_confidence":
            situation_confidence,

        "matched_situation_rules":
            situation_rules
    }


# ============================================================
# TEST CASES
# ============================================================

TEST_CASES = [

    {
        "name": "ROMANIZED TELUGU",

        "language": "te",

        "romanized": True,

        "text":
            "naku exams antey chaala bayam "
            "vestundhi ippudu naku em cheyalo "
            "teliyatledu"
    },

    {
        "name": "ROMANIZED HINDI",

        "language": "hi",

        "romanized": True,

        "text":
            "mujhe exams ko lekar bahut "
            "dar lag raha hai"
    },

    {
        "name": "ROMANIZED TAMIL",

        "language": "ta",

        "romanized": True,

        "text":
            "enakku romba bayama irukku"
    },

    {
        "name": "ROMANIZED KANNADA",

        "language": "kn",

        "romanized": True,

        "text":
            "nanage tumba bhaya ide"
    },

    {
        "name": "NATIVE TELUGU",

        "language": "te",

        "romanized": False,

        "text":
            "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది."
    },

    {
        "name": "NATIVE HINDI",

        "language": "hi",

        "romanized": False,

        "text":
            "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।"
    },

    {
        "name": "ENGLISH",

        "language": "en",

        "romanized": False,

        "text":
            "I am very afraid about my exams."
    },

    {
        "name": "THREAT",

        "language": "en",

        "romanized": False,

        "text":
            "They keep warning me to stay silent."
    },

    {
        "name": "DISPLACEMENT",

        "language": "en",

        "romanized": False,

        "text":
            "We were forced to leave our home because of threats."
    },

    {
        "name": "VIOLENCE",

        "language": "en",

        "romanized": False,

        "text":
            "They attacked me and beat me."
    },

    {
        "name": "IMMEDIATE DANGER",

        "language": "en",

        "romanized": False,

        "text":
            "I am in immediate danger right now."
    },

    {
        "name": "NATURAL FAMILY STRESS",

        "language": "en",

        "romanized": False,

        "text":
            "Things have been difficult at home recently, "
            "and I feel like I cannot handle everything by myself."
    },

    {
        "name": "NATURAL ANXIETY",

        "language": "en",

        "romanized": False,

        "text":
            "I keep thinking something bad is going to happen "
            "and I cannot relax."
    },

    {
        "name": "NATURAL ISOLATION",

        "language": "en",

        "romanized": False,

        "text":
            "I have nobody to turn to and I am dealing with "
            "all of this alone."
    }
]


# ============================================================
# RUN TESTS
# ============================================================

if __name__ == "__main__":

    print()

    print("=" * 70)

    print(
        "NHAA MULTILINGUAL INDICATOR TEST"
    )

    print("=" * 70)


    for case in TEST_CASES:

        print()

        print("-" * 70)

        print(
            "TEST:",
            case["name"]
        )

        print(
            "Language:",
            case["language"]
        )

        print(
            "Romanized:",
            case["romanized"]
        )

        print(
            "Original:",
            case["text"]
        )


        result = analyze_text(

            text=case["text"],

            language=case["language"],

            romanized=case["romanized"],

            analysis_text=""
        )


        print()

        print(
            "Situation:",
            result[
                "situation"
            ]
        )

        print(
            "Situation confidence:",
            result[
                "situation_confidence"
            ]
        )


        print()

        print(
            "Emotion:",
            result[
                "emotion"
            ]
        )

        print(
            "Emotion confidence:",
            result[
                "emotion_confidence"
            ]
        )


        print()

        print(
            "Indicators:"
        )


        for indicator in INDICATORS:

            value = result[
                "indicators"
            ].get(
                indicator,
                0.0
            )

            print(

                f"  {indicator:<20}"
                f"{value:.4f}"

            )


        print()

        print(
            "Matched evidence:"
        )


        for indicator in INDICATORS:

            values = result[
                "matched_indicator_keywords"
            ].get(
                indicator,
                []
            )

            if values:

                print(

                    f"  {indicator}: "
                    f"{values}"

                )


        print()

        print(
            "Matched situation rules:",

            result[
                "matched_situation_rules"
            ]
        )


    print()

    print("=" * 70)

    print(
        "MULTILINGUAL INDICATOR TEST COMPLETED"
    )

    print("=" * 70)