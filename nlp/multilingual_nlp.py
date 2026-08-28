import sys
from pathlib import Path



# ============================================================
# NHAA MULTILINGUAL NLP BRIDGE
# IndicTrans2: Indic -> English
# ============================================================

import os
MODEL_PATH = os.environ.get(
    "INDICTRANS2_MODEL_PATH",
    r"models--TigreGotico--indictrans2-indic-en-dist-200M-onnx"
)

MODEL_DIR = Path(MODEL_PATH)
INT8_DIR = MODEL_DIR / "int8" if (MODEL_DIR / "int8").exists() else MODEL_DIR

TARGET_LANGUAGE = "eng_Latn"


# ============================================================
# LANGUAGE MAP
# ============================================================

LANGUAGE_CODES = {
    "as": "asm_Beng",
    "bn": "ben_Beng",
    "gu": "guj_Gujr",
    "hi": "hin_Deva",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "mr": "mar_Deva",
    "or": "ory_Orya",
    "pa": "pan_Guru",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "ur": "urd_Arab"
}


import importlib.util

# ============================================================
# LOAD PROCESSOR & ONNX MODEL SAFELY
# ============================================================

processor = None
tokenizer = None
model = None

try:
    if MODEL_DIR.exists() and importlib.util.find_spec("transformers") is not None:
        transformers = importlib.import_module("transformers")
        optimum_onnx = importlib.import_module("optimum.onnxruntime")
        indic_proc = importlib.import_module("IndicTransToolkit.processor")

        print("Loading IndicProcessor...")
        processor = getattr(indic_proc, "IndicProcessor")(inference=True)

        print("Loading IndicTrans2 tokenizer...")
        tokenizer = getattr(transformers, "AutoTokenizer").from_pretrained(
            str(MODEL_DIR),
            trust_remote_code=True
        )

        print("Loading IndicTrans2 ONNX model...")
        model = getattr(optimum_onnx, "ORTModelForSeq2SeqLM").from_pretrained(
            str(INT8_DIR),
            use_cache=True,
            trust_remote_code=True
        )
except Exception:
    # Graceful fallback to native & transliterated dictionary engine
    pass

# ============================================================
# TRANSLATE INDIC -> ENGLISH
# ============================================================

def translate_to_english(
    text,
    language
):

    if not text:

        return ""


    if language == "en":

        return text


    if language not in LANGUAGE_CODES:
        return text

    if processor is None or tokenizer is None or model is None:
        return text


    source_language = LANGUAGE_CODES[
        language
    ]


    # --------------------------------------------------------
    # Prepare language-tagged input
    # --------------------------------------------------------

    batch = [
        text
    ]


    processed_batch = processor.preprocess_batch(

        batch,

        src_lang=source_language,

        tgt_lang=TARGET_LANGUAGE
    )


    # --------------------------------------------------------
    # Tokenize
    # --------------------------------------------------------

    inputs = tokenizer(

        processed_batch,

        padding=True,

        truncation=True,

        return_tensors="pt"
    )


    # --------------------------------------------------------
    # Generate translation
    # --------------------------------------------------------

    generated_tokens = model.generate(

        **inputs,

        max_length=256,

        num_beams=5,

        early_stopping=True
    )


    # --------------------------------------------------------
    # Decode
    # --------------------------------------------------------

    generated_text = tokenizer.batch_decode(

        generated_tokens,

        skip_special_tokens=True
    )


    # --------------------------------------------------------
    # Postprocess
    # --------------------------------------------------------

    translated_batch = (
        processor.postprocess_batch(
            generated_text,
            lang=TARGET_LANGUAGE
        )
    )


    if not translated_batch:

        return text


    return translated_batch[0].strip()


# ============================================================
# DAY 2 PIPELINE INTERFACE
# ============================================================

def prepare_analysis_text(
    text,
    language,
    romanized=False
):

    # --------------------------------------------------------
    # English
    # --------------------------------------------------------

    if language == "en":

        return {

            "analysis_text":
                text,

            "translated":
                False,

            "translation_method":
                "none"
        }


    # --------------------------------------------------------
    # Romanized language
    # --------------------------------------------------------

    if romanized:
        # Romanized Indian languages are processed directly via the multilingual concept dictionary
        return {
            "analysis_text": text,
            "translated": False,
            "translation_method": "romanized_lexicon"
        }


    # --------------------------------------------------------
    # Native Indic language
    # --------------------------------------------------------

    if language in LANGUAGE_CODES:

        try:

            translated = (
                translate_to_english(
                    text,
                    language
                )
            )


            if translated:

                return {

                    "analysis_text":
                        translated,

                    "translated":
                        True,

                    "translation_method":
                        "indictrans2_onnx"
                }


        except Exception as error:

            print(
                "Translation error:",
                error
            )


    # --------------------------------------------------------
    # Safe fallback
    # --------------------------------------------------------

    return {

        "analysis_text":
            text,

        "translated":
            False,

        "translation_method":
            "fallback"
    }


# ============================================================
# DIRECT TRANSLATION TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 70)
    print("NHAA INDIC TRANS2 TRANSLATION TEST")
    print("=" * 70)


    TEST_CASES = [

        (
            "te",
            "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది."
        ),

        (
            "hi",
            "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।"
        ),

        (
            "ta",
            "எனக்கு என் தேர்வுகள் பற்றி மிகவும் கவலையாக இருக்கிறது."
        ),

        (
            "kn",
            "ನನ್ನ ಪರೀಕ್ಷೆಗಳ ಬಗ್ಗೆ ನನಗೆ ತುಂಬಾ ಆತಂಕವಾಗಿದೆ."
        ),

        (
            "ml",
            "എന്റെ പരീക്ഷകളെക്കുറിച്ച് എനിക്ക് വളരെ ആശങ്കയുണ്ട്."
        ),

        (
            "gu",
            "મને મારી પરીક્ષાઓ વિશે ખૂબ ચિંતા છે."
        ),

        (
            "pa",
            "ਮੈਨੂੰ ਆਪਣੀਆਂ ਪ੍ਰੀਖਿਆਵਾਂ ਬਾਰੇ ਬਹੁਤ ਚਿੰਤਾ ਹੈ."
        )
    ]


    for language, text in TEST_CASES:

        print()
        print("-" * 70)

        print(
            "Language:",
            language
        )

        print(
            "Original:",
            text
        )


        result = prepare_analysis_text(

            text,

            language,

            False
        )


        print(
            "Translated:",
            result["translated"]
        )

        print(
            "Method:",
            result["translation_method"]
        )

        print(
            "Analysis text:",
            result["analysis_text"]
        )


    print()
    print("=" * 70)
    print("INDIC TRANS2 TEST COMPLETED")
    print("=" * 70)