import json
import re
from pathlib import Path


# ============================================================
# NHAA SITUATION CLASSIFIER
# ============================================================
#
# Purpose:
#   Identify the user's PRIMARY SITUATION.
#
# Important distinction:
#
#   Indicator = HOW the person feels
#       fear
#       stress
#       anxiety
#       distress
#
#   Situation = WHAT is happening
#       academic stress
#       family stress
#       threat
#       violence
#       isolation
#       etc.
#
# Example:
#
#   "I am terrified about my exams."
#
#   fear       = indicator
#   academic   = situation
#
# Therefore indicator scores must NEVER directly override
# strong situation/context evidence.
# ============================================================


BASE = Path(__file__).resolve().parent.parent

DATA_DIR = BASE / "data"


# ============================================================
# SITUATIONS
# ============================================================

SITUATIONS = [
    "ACADEMIC_STRESS",
    "FAMILY_STRESS",
    "WORK_STRESS",
    "ANXIETY",
    "EMOTIONAL_DISTRESS",
    "FEAR",
    "TRAUMA",
    "THREAT",
    "INTIMIDATION",
    "VIOLENCE",
    "IMMEDIATE_DANGER",
    "ISOLATION",
    "SOCIAL_ISOLATION",
    "VULNERABILITY",
    "DISPLACEMENT",
    "GRIEF",
    "FINANCIAL_STRESS",
    "UNKNOWN",
]


# ============================================================
# SITUATION RULES
# ============================================================
#
# These rules are intentionally context-oriented.
#
# Emotional words such as:
#
#   afraid
#   scared
#   worried
#   stressed
#
# are NOT allowed to dominate contextual situations such as:
#
#   exams
#   violence
#   threats
#   leaving home
#
# ============================================================

RULES = {

    "ACADEMIC_STRESS": [

        "exam",
        "exams",
        "exam stress",
        "exam pressure",
        "examination",
        "examinations",
        "assignment",
        "assignments",
        "college",
        "school",
        "studies",
        "study",
        "studying",
        "homework",
        "class",
        "classes",
        "semester",
        "grades",
        "grade",
        "marks",
        "mark",
        "results",
        "result",
        "academic",
        "academics",
        "coursework",
        "test",
        "tests",
        "my education",
        "my studies",
        "university",
    ],


    "FAMILY_STRESS": [

        "family",
        "at home",
        "home",
        "parents",
        "parent",
        "mother",
        "father",
        "mom",
        "dad",
        "brother",
        "sister",
        "husband",
        "wife",
        "children",
        "child",
        "relatives",
        "relative",
        "family problems",
        "family problem",
        "problems at home",
        "problem at home",
        "difficult at home",
        "stress at home",
        "tension at home",
        "conflict at home",
        "conflict with my family",
    ],


    "WORK_STRESS": [

        "work",
        "job",
        "office",
        "workplace",
        "boss",
        "manager",
        "colleague",
        "coworker",
        "coworkers",
        "deadline",
        "deadlines",
        "workload",
        "more work",
        "getting more work",
        "too much work",
        "work pressure",
        "job pressure",
        "work stress",
        "professional",
        "career",
    ],


    "ANXIETY": [

        "cannot relax",
        "can't relax",
        "unable to relax",
        "keep worrying",
        "constantly worrying",
        "always worrying",
        "worried all the time",
        "always worried",
        "constantly anxious",
        "always anxious",
        "anxious about what might happen",
        "expecting something bad",
        "something bad is going to happen",
        "something bad will happen",
        "what might happen",
        "what will happen",
        "future",
        "uncertain future",
        "uncertainty",
        "overthinking",
        "overthink",
    ],


    "EMOTIONAL_DISTRESS": [

        "overwhelmed by everything",
        "overwhelmed",
        "can't cope",
        "cannot cope",
        "unable to cope",
        "hard to cope",
        "difficult to cope",
        "can't handle everything",
        "cannot handle everything",
        "can't handle this",
        "cannot handle this",
        "don't know what to do",
        "do not know what to do",
        "don't know what to do anymore",
        "do not know what to do anymore",
        "falling apart",
        "breaking down",
        "emotionally exhausted",
        "emotionally drained",
        "mentally exhausted",
        "mentally drained",
    ],


    "FEAR": [

        "i am afraid",
        "i'm afraid",
        "very afraid",
        "extremely afraid",
        "i am scared",
        "i'm scared",
        "very scared",
        "extremely scared",
        "i am frightened",
        "i'm frightened",
        "frightened",
        "terrified",
        "very frightened",
    ],


    "TRAUMA": [

        "traumatic",
        "trauma",
        "traumatized",
        "traumatised",
        "flashback",
        "flashbacks",
        "nightmares about what happened",
        "keep thinking about what happened",
        "cannot forget what happened",
        "can't forget what happened",
        "something happened a few days ago",
        "after what happened",
        "because of what happened",
        "reliving",
        "reliving what happened",
    ],


    "THREAT": [

        "threat",
        "threats",
        "threatened",
        "threatening",
        "threaten me",
        "threatened me",
        "someone threatened me",
        "they threatened me",
        "threatening me",
        "warning me",
        "warned me",
        "warned me not to speak",
        "keep warning me",
        "stay silent",
        "not to speak",
        "told me something bad would happen",
        "something bad would happen if i",
    ],


    "INTIMIDATION": [

        "intimidated",
        "intimidation",
        "intimidating",
        "scared to speak",
        "afraid to speak",
        "afraid if i speak",
        "scared if i speak",
        "if i speak up",
        "speak up",
        "told me not to speak",
        "told me to stay silent",
        "pressured me to stay silent",
        "forced me to stay silent",
    ],


    "VIOLENCE": [

        "attacked",
        "attack",
        "physically attacked",
        "assaulted",
        "assault",
        "beaten",
        "beat me",
        "hit me",
        "hurt me",
        "physically hurt me",
        "someone hurt me",
        "someone attacked me",
        "they attacked me",
        "they beat me",
        "physical violence",
        "physically harmed",
        "harmed me",
    ],


    "IMMEDIATE_DANGER": [

        "immediate danger",
        "in immediate danger",
        "danger right now",
        "in danger right now",
        "i am in danger",
        "i'm in danger",
        "danger now",
        "right now",
        "not safe right now",
        "don't feel safe right now",
        "do not feel safe right now",
        "someone may hurt me right now",
        "may hurt me right now",
        "about to be hurt",
        "currently in danger",
    ],


    "ISOLATION": [

        "alone",
        "completely alone",
        "feel alone",
        "feeling alone",
        "lonely",
        "feel lonely",
        "feeling lonely",
        "nobody to talk to",
        "no one to talk to",
        "nobody i can talk to",
        "no one i can talk to",
        "nobody to turn to",
        "no one to turn to",
        "have nobody",
        "have no one",
        "without anyone",
        "without support",
        "without any support",
        "no support",
    ],


    "SOCIAL_ISOLATION": [

        "socially isolated",
        "social isolation",
        "isolated from everyone",
        "isolated from people",
        "feel isolated",
        "feeling isolated",
        "alone even when people are around",
        "alone even though people are around",
        "nobody around",
        "no friends",
        "no close friends",
        "no one understands me",
    ],


    "VULNERABILITY": [

        "vulnerable",
        "helpless",
        "feel helpless",
        "feeling helpless",
        "powerless",
        "feel powerless",
        "feeling powerless",
        "cannot protect myself",
        "can't protect myself",
        "unable to protect myself",
        "need help",
        "need someone to help me",
        "dependent on others",
    ],


    "DISPLACEMENT": [

        "leave my home",
        "left my home",
        "leave our home",
        "left our home",
        "forced to leave",
        "forced to leave my home",
        "forced to leave our home",
        "had to leave my home",
        "had to leave our home",
        "evicted",
        "evicted from my home",
        "evicted from our home",
        "homeless",
        "nowhere to stay",
        "don't know where we will stay",
        "do not know where we will stay",
        "lost my home",
        "lost our home",
        "displaced",
    ],


    "GRIEF": [

        "lost someone",
        "lost someone important",
        "someone passed away",
        "someone died",
        "my friend died",
        "my father died",
        "my mother died",
        "my parent died",
        "death of",
        "after the death",
        "grief",
        "grieving",
        "deeply sad and empty",
        "feel empty after",
        "mourning",
        "mourning someone",
    ],


    "FINANCIAL_STRESS": [

        "financially",
        "financial stress",
        "money problems",
        "money problem",
        "financial problems",
        "financial problem",
        "struggling financially",
        "can't pay my bills",
        "cannot pay my bills",
        "pay my bills",
        "bills",
        "debt",
        "debts",
        "rent",
        "cannot afford",
        "can't afford",
        "money pressure",
        "financial pressure",
    ],
}


# ============================================================
# NORMALIZATION
# ============================================================

def normalize(text):

    if text is None:
        return ""

    text = str(text).lower()

    text = text.replace(
        "’",
        "'"
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# WORD / PHRASE MATCH
# ============================================================

def matches_term(
    text,
    term
):

    text = normalize(text)
    term = normalize(term)

    if not term:
        return False

    # For phrases containing normal ASCII words,
    # use word boundaries.
    #
    # This avoids:
    #
    # "work" matching "network"
    #
    pattern = (
        r"(?<!\w)"
        + re.escape(term)
        + r"(?!\w)"
    )

    return re.search(
        pattern,
        text,
        flags=re.IGNORECASE
    ) is not None


# ============================================================
# DIRECT CONTEXT SCORE
# ============================================================

def calculate_context_scores(
    text
):

    text = normalize(text)

    scores = {
        situation: 0.0
        for situation in SITUATIONS
        if situation != "UNKNOWN"
    }

    matched_rules = {
        situation: []
        for situation in scores
    }

    for situation, rules in RULES.items():

        for rule in rules:

            if matches_term(
                text,
                rule
            ):

                # Longer/more specific phrases are
                # stronger than individual words.

                words = len(
                    normalize(rule).split()
                )

                if words >= 4:
                    weight = 1.5

                elif words == 3:
                    weight = 1.2

                elif words == 2:
                    weight = 1.0

                else:
                    weight = 0.75

                scores[situation] += weight

                matched_rules[
                    situation
                ].append(
                    rule
                )

    return (
        scores,
        matched_rules
    )


# ============================================================
# MULTILINGUAL EVIDENCE HELPERS
# ============================================================

def flatten_evidence(
    evidence
):

    terms = []

    if not isinstance(
        evidence,
        dict
    ):
        return terms

    for indicator, items in evidence.items():

        if not isinstance(
            items,
            list
        ):
            continue

        for item in items:

            if isinstance(
                item,
                dict
            ):

                term = item.get(
                    "term",
                    item.get(
                        "matched_term",
                        ""
                    )
                )

            else:

                term = str(item)

            if term:
                terms.append(
                    normalize(term)
                )

    return terms


# ============================================================
# INDICATOR-TO-SITUATION FALLBACK
# ============================================================
#
# IMPORTANT:
#
# Indicator evidence is used ONLY as a weak fallback.
#
# It cannot beat strong context.
#
# Example:
#
#   exams + fear
#
# must become:
#
#   ACADEMIC_STRESS
#
# not:
#
#   FEAR
#
# ============================================================

def indicator_fallback_scores(
    indicators
):

    if not isinstance(
        indicators,
        dict
    ):
        indicators = {}

    scores = {
        situation: 0.0
        for situation in SITUATIONS
        if situation != "UNKNOWN"
    }

    # Very weak mapping.
    #
    # These values are deliberately much smaller than
    # direct situation/context matches.

    mapping = {

        "stress": {
            "ACADEMIC_STRESS": 0.10,
            "FAMILY_STRESS": 0.10,
            "WORK_STRESS": 0.10,
            "FINANCIAL_STRESS": 0.10,
        },

        "fear": {
            "FEAR": 0.15,
        },

        "anxiety": {
            "ANXIETY": 0.15,
        },

        "distress": {
            "EMOTIONAL_DISTRESS": 0.15,
        },

        "trauma": {
            "TRAUMA": 0.20,
        },

        "threat": {
            "THREAT": 0.20,
            "INTIMIDATION": 0.10,
        },

        "violence": {
            "VIOLENCE": 0.30,
        },

        "immediate_danger": {
            "IMMEDIATE_DANGER": 0.40,
        },

        "isolation": {
            "ISOLATION": 0.20,
            "SOCIAL_ISOLATION": 0.10,
        },

        "vulnerability": {
            "VULNERABILITY": 0.15,
        },
    }

    for indicator, value in indicators.items():

        try:
            value = float(value)

        except (
            TypeError,
            ValueError
        ):
            continue

        value = max(
            0.0,
            min(
                value,
                1.0
            )
        )

        for situation, weight in mapping.get(
            indicator,
            {}
        ).items():

            scores[
                situation
            ] += value * weight

    return scores


# ============================================================
# SPECIAL PRIORITY RULES
# ============================================================
#
# Some situations must have very high priority because
# they represent concrete real-world circumstances.
#
# Priority:
#
# IMMEDIATE_DANGER
# VIOLENCE
# DISPLACEMENT
# THREAT / INTIMIDATION
#
# Contextual life situations:
#
# ACADEMIC
# FAMILY
# WORK
# FINANCIAL
#
# Emotional states:
#
# ANXIETY
# FEAR
# EMOTIONAL_DISTRESS
#
# ============================================================

HIGH_PRIORITY = [

    "IMMEDIATE_DANGER",
    "VIOLENCE",
    "DISPLACEMENT",
    "THREAT",
    "INTIMIDATION",
]


CONTEXT_PRIORITY = [

    "ACADEMIC_STRESS",
    "FAMILY_STRESS",
    "WORK_STRESS",
    "FINANCIAL_STRESS",
    "GRIEF",
    "TRAUMA",
]


EMOTIONAL_PRIORITY = [

    "ANXIETY",
    "EMOTIONAL_DISTRESS",
    "ISOLATION",
    "SOCIAL_ISOLATION",
    "VULNERABILITY",
    "FEAR",
]


# ============================================================
# CLASSIFY
# ============================================================

def classify(
    text,
    indicators=None,
    evidence=None
):

    text = normalize(text)

    if indicators is None:
        indicators = {}

    if evidence is None:
        evidence = {}

    # --------------------------------------------------------
    # DIRECT CONTEXT
    # --------------------------------------------------------

    context_scores, matched_rules = (
        calculate_context_scores(
            text
        )
    )


    # --------------------------------------------------------
    # WEAK INDICATOR FALLBACK
    # --------------------------------------------------------

    fallback_scores = (
        indicator_fallback_scores(
            indicators
        )
    )


    # --------------------------------------------------------
    # COMBINE
    # --------------------------------------------------------
    #
    # Direct context dominates.
    #
    # Indicator fallback is intentionally tiny.
    # --------------------------------------------------------

    final_scores = {}

    for situation in context_scores:

        final_scores[
            situation
        ] = round(
            context_scores[
                situation
            ] + fallback_scores.get(
                situation,
                0.0
            ),
            4
        )


    # --------------------------------------------------------
    # MULTILINGUAL EVIDENCE
    # --------------------------------------------------------
    #
    # Dictionary evidence can be used to identify
    # indicator terms, but indicator terms themselves
    # must not automatically become situations.
    #
    # Example:
    #
    # "bayam" -> FEAR indicator
    #
    # "exams" -> ACADEMIC_STRESS situation
    #
    # --------------------------------------------------------

    evidence_terms = flatten_evidence(
        evidence
    )


    # --------------------------------------------------------
    # STRONG SITUATION CONTEXT
    # --------------------------------------------------------

    strong_context = []

    for situation in (
        HIGH_PRIORITY
        + CONTEXT_PRIORITY
    ):

        if context_scores.get(
            situation,
            0.0
        ) > 0:

            strong_context.append(
                situation
            )


    # --------------------------------------------------------
    # SELECT SITUATION
    # --------------------------------------------------------

    selected = "UNKNOWN"
    selected_score = 0.0

    # --------------------------------------------------------
    # HIGH PRIORITY SITUATIONS
    # --------------------------------------------------------

    high_candidates = [
        s
        for s in HIGH_PRIORITY
        if context_scores.get(
            s,
            0.0
        ) > 0
    ]

    if high_candidates:

        selected = max(
            high_candidates,
            key=lambda s:
                final_scores.get(
                    s,
                    0.0
                )
        )

        selected_score = final_scores[
            selected
        ]


    # --------------------------------------------------------
    # CONTEXT SITUATIONS
    # --------------------------------------------------------

    elif strong_context:

        context_candidates = [
            s
            for s in CONTEXT_PRIORITY
            if context_scores.get(
                s,
                0.0
            ) > 0
        ]

        if context_candidates:

            selected = max(
                context_candidates,
                key=lambda s:
                    final_scores.get(
                        s,
                        0.0
                    )
            )

            selected_score = final_scores[
                selected
            ]


    # --------------------------------------------------------
    # EMOTIONAL / SOCIAL
    # --------------------------------------------------------

    else:

        emotional_candidates = [
            s
            for s in EMOTIONAL_PRIORITY
            if context_scores.get(
                s,
                0.0
            ) > 0
        ]

        if emotional_candidates:

            selected = max(
                emotional_candidates,
                key=lambda s:
                    final_scores.get(
                        s,
                        0.0
                    )
            )

            selected_score = final_scores[
                selected
            ]

        else:

            # Pure indicator fallback.

            fallback_candidates = [
                s
                for s in final_scores
                if fallback_scores.get(
                    s,
                    0.0
                ) > 0
            ]

            if fallback_candidates:

                selected = max(
                    fallback_candidates,
                    key=lambda s:
                        final_scores.get(
                            s,
                            0.0
                        )
                )

                selected_score = final_scores[
                    selected
                ]


    # --------------------------------------------------------
    # MATCHED RULES
    # --------------------------------------------------------

    selected_rules = matched_rules.get(
        selected,
        []
    )


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    direct_score = context_scores.get(
        selected,
        0.0
    )

    total_score = sum(
        max(
            score,
            0.0
        )
        for score in final_scores.values()
    )

    if selected == "UNKNOWN":

        confidence = 0.0

    elif direct_score >= 3.0:

        confidence = 1.0

    elif direct_score >= 2.0:

        confidence = 0.90

    elif direct_score >= 1.0:

        confidence = 0.80

    elif direct_score > 0:

        confidence = 0.65

    elif selected_score > 0:

        confidence = 0.40

    else:

        confidence = 0.0


    # If there is a strong direct rule,
    # don't allow weak indicator evidence to reduce
    # confidence.

    if direct_score > 0:

        confidence = max(
            confidence,
            min(
                1.0,
                direct_score / 3.0
            )
        )


    confidence = round(
        confidence,
        4
    )


    # --------------------------------------------------------
    # CLEAN SCORE OUTPUT
    # --------------------------------------------------------

    clean_scores = {}

    for situation, score in final_scores.items():

        if score > 0:

            clean_scores[
                situation
            ] = round(
                score,
                4
            )


    return {

        "situation":
            selected,

        "confidence":
            confidence,

        "matched_rules":
            selected_rules,

        "scores":
            clean_scores,

        "evidence_terms":
            evidence_terms,
    }


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def detect_situation(
    text,
    analysis_text=None,
    indicators=None,
    evidence=None
):

    # --------------------------------------------------------
    # Build combined text.
    #
    # cleaned/original text is important because translated
    # text may lose useful contextual information.
    # --------------------------------------------------------

    primary_text = text or ""

    secondary_text = (
        analysis_text
        if analysis_text
        else ""
    )

    combined = (
        str(primary_text)
        + " "
        + str(secondary_text)
    ).strip()


    result = classify(
        combined,
        indicators=indicators,
        evidence=evidence
    )


    return {

        "situation":
            result[
                "situation"
            ],

        "confidence":
            result[
                "confidence"
            ],

        "matched_rules":
            result[
                "matched_rules"
            ],

        "scores":
            result[
                "scores"
            ],

        "evidence_terms":
            result[
                "evidence_terms"
            ],
    }


# ============================================================
# TEST CASES
# ============================================================

TEST_CASES = [

    (
        "ACADEMIC_STRESS",
        "I am extremely stressed about my exams and my grades."
    ),

    (
        "FAMILY_STRESS",
        "Things have been difficult at home recently, and I feel like I can't handle everything by myself."
    ),

    (
        "WORK_STRESS",
        "I keep getting more work and I don't know how I will finish everything."
    ),

    (
        "ANXIETY",
        "I keep thinking something bad is going to happen and I cannot relax."
    ),

    (
        "SOCIAL_ISOLATION",
        "I feel completely alone and have nobody to talk to."
    ),

    (
        "INTIMIDATION",
        "I am scared about what might happen if I speak up."
    ),

    (
        "DISPLACEMENT",
        "I had to leave my home unexpectedly and I don't know where we will stay."
    ),

    (
        "VIOLENCE",
        "Someone physically attacked me and I am scared it could happen again."
    ),

    (
        "IMMEDIATE_DANGER",
        "I am in danger right now and I don't know what to do."
    ),

    (
        "THREAT",
        "Someone has threatened me and warned me not to speak about what happened."
    ),

    (
        "GRIEF",
        "I lost someone important to me and I feel deeply sad and empty."
    ),

    (
        "FINANCIAL_STRESS",
        "I am struggling financially and I don't know how I will pay my bills."
    ),

    (
        "EMOTIONAL_DISTRESS",
        "I feel overwhelmed by everything and I don't know what to do anymore."
    ),

    (
        "TRAUMA",
        "Something happened a few days ago and I keep thinking about it."
    ),
]


# ============================================================
# MAIN TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 70)
    print("NHAA SITUATION CLASSIFIER")
    print("=" * 70)


    for expected, text in TEST_CASES:

        result = detect_situation(
            text
        )

        print()
        print("-" * 70)

        print(
            "EXPECTED:",
            expected
        )

        print()
        print(
            "TEXT:"
        )

        print(
            text
        )

        print()

        print(
            "Situation:",
            result[
                "situation"
            ]
        )

        print(
            "Confidence:",
            result[
                "confidence"
            ]
        )

        print(
            "Matched rules:",
            result[
                "matched_rules"
            ]
        )

        print()
        print(
            "Scores:"
        )

        for situation, score in sorted(
            result[
                "scores"
            ].items(),
            key=lambda x: x[1],
            reverse=True
        ):

            print(
                f"  {situation:22} "
                f"{score:.4f}"
            )


    # --------------------------------------------------------
    # MULTILINGUAL TEST
    # --------------------------------------------------------

    print()
    print("=" * 70)
    print("MULTILINGUAL EVIDENCE TEST")
    print("=" * 70)

    telugu_text = (
        "naku exams antey chaala bayam "
        "vestundhi ippudu naku em cheyalo "
        "teliyatledu"
    )

    telugu_indicators = {

        "stress": 0.3333,

        "fear": 1.0,

        "anxiety": 0.0,

        "distress": 0.8,

        "trauma": 0.0,

        "threat": 0.0,

        "violence": 0.0,

        "immediate_danger": 0.0,

        "isolation": 0.0,

        "vulnerability": 0.0,
    }

    telugu_evidence = {

        "fear": [
            "bayam",
            "bayam vestundhi",
            "chaala bayam",
        ],

        "distress": [
            "em cheyalo teliyatledu",
        ],
    }


    result = detect_situation(

        telugu_text,

        analysis_text="",

        indicators=
            telugu_indicators,

        evidence=
            telugu_evidence
    )


    print()
    print(
        "Romanized Telugu:"
    )

    print(
        telugu_text
    )

    print()

    print(
        "Situation:",
        result[
            "situation"
        ]
    )

    print(
        "Confidence:",
        result[
            "confidence"
        ]
    )

    print(
        "Matched rules:",
        result[
            "matched_rules"
        ]
    )

    print()
    print(
        "All scores:"
    )

    for situation, score in sorted(
        result[
            "scores"
        ].items(),
        key=lambda x: x[1],
        reverse=True
    ):

        print(
            f"  {situation:22} "
            f"{score:.4f}"
        )


    print()
    print("=" * 70)
    print(
        "SITUATION CLASSIFICATION COMPLETED"
    )
    print("=" * 70)