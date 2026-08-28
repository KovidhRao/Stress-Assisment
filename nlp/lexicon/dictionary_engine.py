import re


# ============================================================
# NHAA MULTILINGUAL DICTIONARY ENGINE
# ============================================================
#
# Languages:
#   en = English
#   te = Telugu
#   hi = Hindi
#   ta = Tamil
#   kn = Kannada
#   gu = Gujarati
#   pa = Punjabi
#   mr = Marathi
#   bn = Bengali
#   ur = Urdu
#
# This is a CONCEPT dictionary.
#
# Language words/phrases
#          ↓
# Common English concept
#          ↓
# NHAA indicator
#
# It supports:
#   - Native scripts
#   - Romanized language
#   - English
#   - Multi-word phrases
#
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
    "vulnerability",
]


# ============================================================
# CONCEPT DICTIONARY
# ============================================================
#
# Each indicator contains multilingual concepts.
#
# We deliberately include phrases as well as individual words.
# Phrase matching is important for NHAA user stories.
#
# ============================================================


DICTIONARY = {

    # ========================================================
    # STRESS
    # ========================================================

    "stress": {

        "en": [
            "stress",
            "stressed",
            "stressful",
            "pressure",
            "pressured",
            "overwhelmed",
            "under pressure",
            "mental pressure",
            "work pressure",
            "study pressure",
            "exam pressure"
        ],

        "te": [
            "ఒత్తిడి",
            "ఒత్తిడిగా",
            "ఒత్తిడిలో",
            "టెన్షన్",
            "ఆందోళన",
            "చాలా ఒత్తిడి",
            "చాలా టెన్షన్"
        ],

        "hi": [
            "तनाव",
            "तनाव में",
            "तनावग्रस्त",
            "दबाव",
            "दबाव में",
            "टेंशन",
            "बहुत तनाव",
            "बहुत टेंशन"
        ],

        "ta": [
            "மன அழுத்தம்",
            "அழுத்தம்",
            "மன அழுத்தமாக",
            "டென்ஷன்",
            "மிகவும் டென்ஷன்",
            "மிகவும் அழுத்தம்"
        ],

        "kn": [
            "ಒತ್ತಡ",
            "ಒತ್ತಡದಲ್ಲಿ",
            "ಒತ್ತಡವಾಗಿದೆ",
            "ಟೆನ್ಷನ್",
            "ತುಂಬಾ ಒತ್ತಡ",
            "ತುಂಬಾ ಟೆನ್ಷನ್"
        ],

        "gu": [
            "તણાવ",
            "તણાવમાં",
            "દબાણ",
            "દબાણમાં",
            "ટેન્શન",
            "ખૂબ તણાવ"
        ],

        "pa": [
            "ਤਣਾਅ",
            "ਤਣਾਅ ਵਿੱਚ",
            "ਦਬਾਅ",
            "ਦਬਾਅ ਵਿੱਚ",
            "ਟੈਂਸ਼ਨ",
            "ਬਹੁਤ ਤਣਾਅ"
        ],

        "mr": [
            "ताण",
            "तणाव",
            "तणावात",
            "दडपण",
            "दडपणात",
            "टेंशन",
            "खूप तणाव"
        ],

        "bn": [
            "চাপ",
            "মানসিক চাপ",
            "চাপে",
            "টেনশন",
            "অনেক চাপ"
        ],

        "ur": [
            "تناؤ",
            "دباؤ",
            "دباؤ میں",
            "ٹینشن",
            "بہت تناؤ"
        ],
    },


    # ========================================================
    # FEAR
    # ========================================================

    "fear": {

        "en": [
            "fear",
            "afraid",
            "scared",
            "frightened",
            "terrified",
            "terrifying",
            "fearful",
            "i am afraid",
            "i am scared",
            "i am frightened",
            "very afraid",
            "very scared",
            "very frightened"
        ],

        "te": [
            "భయం",
            "భయంగా",
            "భయపడుతున్నాను",
            "భయపడుతున్నా",
            "భయమేస్తుంది",
            "భయం వేస్తుంది",
            "చాలా భయం",
            "చాలా భయంగా ఉంది"
        ],

        "hi": [
            "डर",
            "डर लग रहा है",
            "बहुत डर",
            "भय",
            "भय लग रहा है",
            "डर गया",
            "डर गई",
            "डर रहा",
            "डर रही"
        ],

        "ta": [
            "பயம்",
            "பயமாக",
            "பயமாக இருக்கிறது",
            "பயமாக இருக்கு",
            "பயமாக உள்ளது",
            "மிகவும் பயம்",
            "அச்சம்"
        ],

        "kn": [
            "ಭಯ",
            "ಭಯವಾಗಿದೆ",
            "ಭಯವಾಗುತ್ತಿದೆ",
            "ತುಂಬಾ ಭಯ",
            "ಭಯ ಇದೆ",
            "ಹೆದರಿಕೆ",
            "ಹೆದರಿಕೆಯಾಗುತ್ತಿದೆ"
        ],

        "gu": [
            "ભય",
            "ડર",
            "ડર લાગે છે",
            "ખૂબ ડર",
            "ભય લાગે છે"
        ],

        "pa": [
            "ਡਰ",
            "ਡਰ ਲੱਗ ਰਿਹਾ ਹੈ",
            "ਬਹੁਤ ਡਰ",
            "ਭੈ",
            "ਡਰ ਲੱਗਦਾ ਹੈ"
        ],

        "mr": [
            "भीती",
            "भीती वाटते",
            "भय",
            "भय वाटते",
            "खूप भीती",
            "घाबरलो",
            "घाबरले"
        ],

        "bn": [
            "ভয়",
            "ভয় লাগছে",
            "ভয় লাগে",
            "অনেক ভয়",
            "আতঙ্ক"
        ],

        "ur": [
            "خوف",
            "ڈر",
            "ڈر لگ رہا ہے",
            "بہت ڈر",
            "خوفزدہ"
        ],
    },


    # ========================================================
    # ANXIETY
    # ========================================================

    "anxiety": {

        "en": [
            "anxiety",
            "anxious",
            "worried",
            "worry",
            "worrying",
            "nervous",
            "nervousness",
            "uneasy",
            "restless",
            "concerned",
            "very worried",
            "very anxious",
            "feeling anxious"
        ],

        "te": [
            "ఆందోళన",
            "ఆందోళనగా",
            "చింత",
            "చింతగా",
            "టెన్షన్",
            "నెర్వస్",
            "ఆత్రుత",
            "చాలా ఆందోళన"
        ],

        "hi": [
            "चिंता",
            "चिंतित",
            "परेशान",
            "परेशानी",
            "घबराहट",
            "बेचैनी",
            "टेंशन",
            "बहुत चिंता"
        ],

        "ta": [
            "கவலை",
            "கவலையாக",
            "கவலைப்படுகிறேன்",
            "பதற்றம்",
            "அமைதியின்மை",
            "டென்ஷன்",
            "மிகவும் கவலை"
        ],

        "kn": [
            "ಆತಂಕ",
            "ಆತಂಕವಾಗಿದೆ",
            "ಚಿಂತೆ",
            "ಚಿಂತೆಯಾಗಿದೆ",
            "ಗಾಬರಿ",
            "ಟೆನ್ಷನ್",
            "ತುಂಬಾ ಚಿಂತೆ"
        ],

        "gu": [
            "ચિંતા",
            "ચિંતિત",
            "ગભરાટ",
            "બેચેની",
            "ટેન્શન",
            "ખૂબ ચિંતા"
        ],

        "pa": [
            "ਚਿੰਤਾ",
            "ਚਿੰਤਤ",
            "ਘਬਰਾਹਟ",
            "ਬੇਚੈਨੀ",
            "ਟੈਂਸ਼ਨ",
            "ਬਹੁਤ ਚਿੰਤਾ"
        ],

        "mr": [
            "चिंता",
            "चिंतित",
            "घाबरलेला",
            "घाबरलेली",
            "घबराट",
            "बेचैनी",
            "टेंशन",
            "खूप चिंता"
        ],

        "bn": [
            "চিন্তা",
            "চিন্তিত",
            "উদ্বেগ",
            "অস্থিরতা",
            "টেনশন",
            "অনেক চিন্তা"
        ],

        "ur": [
            "فکر",
            "فکرمند",
            "پریشانی",
            "بے چینی",
            "ٹینشن",
            "بہت فکر"
        ],
    },


    # ========================================================
    # DISTRESS
    # ========================================================

    "distress": {

        "en": [
            "distress",
            "distressed",
            "helpless",
            "hopeless",
            "desperate",
            "i don't know what to do",
            "i do not know what to do",
            "don't know what to do",
            "do not know what to do",
            "cannot cope",
            "can't cope",
            "unable to cope",
            "i feel helpless",
            "i feel hopeless",
            "i feel lost",
            "i am lost"
        ],

        "te": [
            "నాకు ఏం చేయాలో తెలియడం లేదు",
            "నాకు ఏమి చేయాలో తెలియడం లేదు",
            "ఏం చేయాలో తెలియడం లేదు",
            "ఏమి చేయాలో తెలియడం లేదు",
            "ఏం చేయాలో తెలియదు",
            "ఏమి చేయాలో తెలియదు",
            "నిస్సహాయంగా",
            "నిస్సహాయంగా ఉంది",
            "తట్టుకోలేకపోతున్నాను",
            "చాలా కష్టంగా ఉంది"
        ],

        "hi": [
            "मुझे नहीं पता क्या करूं",
            "मुझे नहीं पता क्या करना है",
            "पता नहीं क्या करूं",
            "समझ नहीं आ रहा क्या करूं",
            "समझ नहीं आ रहा",
            "बेबस",
            "निराश",
            "निराशा",
            "मैं संभाल नहीं पा रहा",
            "मैं संभाल नहीं पा रही"
        ],

        "ta": [
            "என்ன செய்வது என்று தெரியவில்லை",
            "என்ன செய்ய வேண்டும் என்று தெரியவில்லை",
            "என்ன செய்வது தெரியவில்லை",
            "என்ன பண்றது தெரியல",
            "என்ன செய்ய வேண்டும் தெரியல",
            "சமாளிக்க முடியவில்லை",
            "கையாலாகாத",
            "மிகவும் கஷ்டமாக"
        ],

        "kn": [
            "ಏನು ಮಾಡಬೇಕು ಎಂದು ಗೊತ್ತಿಲ್ಲ",
            "ಏನು ಮಾಡಬೇಕೆಂದು ಗೊತ್ತಿಲ್ಲ",
            "ಏನು ಮಾಡಬೇಕು ಗೊತ್ತಿಲ್ಲ",
            "ಏನು ಮಾಡಬೇಕೆಂದು ತಿಳಿದಿಲ್ಲ",
            "ತಿಳಿಯುತ್ತಿಲ್ಲ ಏನು ಮಾಡಬೇಕು",
            "ಅಸಹಾಯಕ",
            "ಸಹಿಸಿಕೊಳ್ಳಲು ಆಗುತ್ತಿಲ್ಲ",
            "ತುಂಬಾ ಕಷ್ಟ"
        ],

        "gu": [
            "શું કરવું તે સમજાતું નથી",
            "શું કરવું તે ખબર નથી",
            "મને ખબર નથી શું કરવું",
            "સમજાતું નથી",
            "લાચાર",
            "નિરાશ",
            "સહન કરી શકતો નથી"
        ],

        "pa": [
            "ਕੀ ਕਰਨਾ ਹੈ ਸਮਝ ਨਹੀਂ ਆ ਰਿਹਾ",
            "ਕੀ ਕਰਾਂ ਸਮਝ ਨਹੀਂ ਆ ਰਿਹਾ",
            "ਪਤਾ ਨਹੀਂ ਕੀ ਕਰਾਂ",
            "ਸਮਝ ਨਹੀਂ ਆ ਰਹੀ",
            "ਬੇਬਸ",
            "ਨਿਰਾਸ਼",
            "ਸਹਿਣ ਨਹੀਂ ਹੋ ਰਿਹਾ"
        ],

        "mr": [
            "काय करावे हे समजत नाही",
            "काय करायचे हे कळत नाही",
            "मला काय करावे हे कळत नाही",
            "काय करू समजत नाही",
            "समजत नाही काय करावे",
            "असहाय्य",
            "निराश",
            "सहन होत नाही"
        ],

        "bn": [
            "কি করব বুঝতে পারছি না",
            "কি করতে হবে বুঝতে পারছি না",
            "আমি জানি না কি করব",
            "বুঝতে পারছি না",
            "অসহায়",
            "হতাশ"
        ],

        "ur": [
            "کیا کرنا ہے سمجھ نہیں آ رہا",
            "کیا کروں سمجھ نہیں آ رہا",
            "پتہ نہیں کیا کروں",
            "سمجھ نہیں آ رہا",
            "بے بس",
            "مایوس"
        ],
    },


    # ========================================================
    # TRAUMA
    # ========================================================

    "trauma": {

        "en": [
            "trauma",
            "traumatized",
            "traumatic",
            "flashback",
            "nightmares",
            "nightmare",
            "traumatic experience",
            "painful memories",
            "haunted by",
            "cannot forget what happened"
        ],

        "te": [
            "గాయం",
            "మానసిక గాయం",
            "ఆఘాతం",
            "చెడు జ్ఞాపకాలు",
            "పీడకలలు"
        ],

        "hi": [
            "आघात",
            "मानसिक आघात",
            "सदमा",
            "बुरी यादें",
            "बुरे सपने"
        ],

        "ta": [
            "அதிர்ச்சி",
            "மன அதிர்ச்சி",
            "கெட்ட நினைவுகள்",
            "கெட்ட கனவுகள்"
        ],

        "kn": [
            "ಆಘಾತ",
            "ಮಾನಸಿಕ ಆಘಾತ",
            "ಕೆಟ್ಟ ನೆನಪುಗಳು",
            "ಕೆಟ್ಟ ಕನಸುಗಳು"
        ],

        "gu": [
            "આઘાત",
            "માનસિક આઘાત",
            "ખરાબ યાદો",
            "ખરાબ સપના"
        ],

        "pa": [
            "ਸਦਮਾ",
            "ਮਾਨਸਿਕ ਸਦਮਾ",
            "ਬੁਰੀਆਂ ਯਾਦਾਂ",
            "ਮਾੜੇ ਸੁਪਨੇ"
        ],

        "mr": [
            "आघात",
            "मानसिक आघात",
            "वाईट आठवणी",
            "वाईट स्वप्ने"
        ],

        "bn": [
            "আঘাত",
            "মানসিক আঘাত",
            "খারাপ স্মৃতি",
            "দুঃস্বপ্ন"
        ],

        "ur": [
            "صدمہ",
            "ذہنی صدمہ",
            "بری یادیں",
            "برے خواب"
        ],
    },


    # ========================================================
    # THREAT
    # ========================================================

    "threat": {

        "en": [
            "threat",
            "threats",
            "threatened",
            "threatening",
            "threaten me",
            "threatening me",
            "warned me",
            "warning me",
            "keep warning",
            "keep threatening",
            "they warned me",
            "they threatened me",
            "harm me",
            "hurt me",
            "kill me",
            "death threat"
        ],

        "te": [
            "బెదిరింపు",
            "బెదిరిస్తున్నారు",
            "బెదిరించాడు",
            "బెదిరించింది",
            "హెచ్చరిస్తున్నారు",
            "హెచ్చరించాడు",
            "చంపేస్తామని",
            "హాని చేస్తామని",
            "నన్ను బెదిరిస్తున్నారు"
        ],

        "hi": [
            "धमकी",
            "धमकी दी",
            "धमकी दे रहे हैं",
            "धमका रहे हैं",
            "चेतावनी",
            "चेतावनी दी",
            "मारने की धमकी",
            "नुकसान पहुंचाने की धमकी"
        ],

        "ta": [
            "மிரட்டல்",
            "மிரட்டுகிறார்கள்",
            "மிரட்டுகிறார்",
            "எச்சரிக்கை",
            "கொலை மிரட்டல்",
            "தீங்கு செய்வதாக மிரட்டல்"
        ],

        "kn": [
            "ಬೆದರಿಕೆ",
            "ಬೆದರಿಸುತ್ತಿದ್ದಾರೆ",
            "ಬೆದರಿಸಿದ್ದಾರೆ",
            "ಎಚ್ಚರಿಕೆ",
            "ಕೊಲ್ಲುವುದಾಗಿ ಬೆದರಿಕೆ",
            "ಹಾನಿ ಮಾಡುವುದಾಗಿ ಬೆದರಿಕೆ"
        ],

        "gu": [
            "ધમકી",
            "ધમકી આપી",
            "ધમકી આપી રહ્યા છે",
            "ચેતવણી",
            "મારી નાખવાની ધમકી",
            "નુકસાન કરવાની ધમકી"
        ],

        "pa": [
            "ਧਮਕੀ",
            "ਧਮਕੀ ਦਿੱਤੀ",
            "ਧਮਕੀ ਦੇ ਰਹੇ ਹਨ",
            "ਚੇਤਾਵਨੀ",
            "ਜਾਨੋਂ ਮਾਰਨ ਦੀ ਧਮਕੀ",
            "ਨੁਕਸਾਨ ਦੀ ਧਮਕੀ"
        ],

        "mr": [
            "धमकी",
            "धमकी दिली",
            "धमकी देत आहेत",
            "इशारा",
            "जीवे मारण्याची धमकी",
            "नुकसान करण्याची धमकी"
        ],

        "bn": [
            "হুমকি",
            "হুমকি দিয়েছে",
            "হুমকি দিচ্ছে",
            "সতর্কবার্তা",
            "মেরে ফেলার হুমকি",
            "ক্ষতি করার হুমকি"
        ],

        "ur": [
            "دھمکی",
            "دھمکی دی",
            "دھمکی دے رہے ہیں",
            "انتباہ",
            "جان سے مارنے کی دھمکی",
            "نقصان پہنچانے کی دھمکی"
        ],
    },


    # ========================================================
    # VIOLENCE
    # ========================================================

    "violence": {

        "en": [
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
            "physical attack",
            "physical violence",
            "abused physically"
        ],

        "te": [
            "హింస",
            "హింసించారు",
            "దాడి",
            "దాడి చేశారు",
            "కొట్టారు",
            "నన్ను కొట్టారు",
            "దాడి చేశారు"
        ],

        "hi": [
            "हिंसा",
            "हिंसक",
            "हमला",
            "हमला किया",
            "मारपीट",
            "मुझे मारा",
            "पीटा",
            "कूटा"
        ],

        "ta": [
            "வன்முறை",
            "தாக்குதல்",
            "தாக்கினர்",
            "அடித்தார்கள்",
            "என்னை அடித்தார்கள்",
            "உடல் வன்முறை"
        ],

        "kn": [
            "ಹಿಂಸೆ",
            "ಹಿಂಸಾತ್ಮಕ",
            "ದಾಳಿ",
            "ದಾಳಿ ಮಾಡಿದರು",
            "ಹೊಡೆದರು",
            "ನನ್ನನ್ನು ಹೊಡೆದರು"
        ],

        "gu": [
            "હિંસા",
            "હુમલો",
            "હુમલો કર્યો",
            "માર માર્યો",
            "મને માર્યો"
        ],

        "pa": [
            "ਹਿੰਸਾ",
            "ਹਮਲਾ",
            "ਹਮਲਾ ਕੀਤਾ",
            "ਕੁੱਟਿਆ",
            "ਮੈਨੂੰ ਮਾਰਿਆ"
        ],

        "mr": [
            "हिंसा",
            "हल्ला",
            "हल्ला केला",
            "मारहाण",
            "मला मारले"
        ],

        "bn": [
            "সহিংসতা",
            "আক্রমণ",
            "আক্রমণ করেছে",
            "মারধর",
            "আমাকে মেরেছে"
        ],

        "ur": [
            "تشدد",
            "حملہ",
            "حملہ کیا",
            "مارا پیٹا",
            "مجھے مارا"
        ],
    },


    # ========================================================
    # IMMEDIATE DANGER
    # ========================================================

    "immediate_danger": {

        "en": [
            "immediate danger",
            "in immediate danger",
            "danger right now",
            "in danger right now",
            "i am in danger",
            "we are in danger",
            "my life is in danger",
            "life in danger",
            "someone is coming to hurt me",
            "someone is trying to kill me",
            "they are going to kill me",
            "help me now",
            "need help now",
            "emergency"
        ],

        "te": [
            "తక్షణ ప్రమాదం",
            "ఇప్పుడు ప్రమాదంలో",
            "నా ప్రాణానికి ప్రమాదం",
            "ప్రాణానికి ప్రమాదం",
            "ఇప్పుడే ప్రమాదం",
            "నాకు ఇప్పుడు ప్రమాదం",
            "ఇప్పుడే సహాయం కావాలి"
        ],

        "hi": [
            "तुरंत खतरा",
            "अभी खतरे में",
            "मेरी जान को खतरा",
            "जान को खतरा",
            "अभी खतरा है",
            "मुझे अभी खतरा है",
            "अभी मदद चाहिए"
        ],

        "ta": [
            "உடனடி ஆபத்து",
            "இப்போது ஆபத்தில்",
            "என் உயிருக்கு ஆபத்து",
            "உயிருக்கு ஆபத்து",
            "இப்போதே உதவி வேண்டும்"
        ],

        "kn": [
            "ತಕ್ಷಣದ ಅಪಾಯ",
            "ಈಗ ಅಪಾಯದಲ್ಲಿದ್ದೇನೆ",
            "ನನ್ನ ಜೀವಕ್ಕೆ ಅಪಾಯ",
            "ಜೀವಕ್ಕೆ ಅಪಾಯ",
            "ಈಗಲೇ ಸಹಾಯ ಬೇಕು"
        ],

        "gu": [
            "તાત્કાલિક જોખમ",
            "હમણાં જોખમમાં",
            "મારા જીવને જોખમ",
            "જીવને જોખમ",
            "હમણાં મદદ જોઈએ"
        ],

        "pa": [
            "ਤੁਰੰਤ ਖ਼ਤਰਾ",
            "ਹੁਣ ਖ਼ਤਰੇ ਵਿੱਚ",
            "ਮੇਰੀ ਜਾਨ ਨੂੰ ਖ਼ਤਰਾ",
            "ਜਾਨ ਨੂੰ ਖ਼ਤਰਾ",
            "ਹੁਣੇ ਮਦਦ ਚਾਹੀਦੀ ਹੈ"
        ],

        "mr": [
            "तात्काळ धोका",
            "आत्ता धोक्यात",
            "माझ्या जीवाला धोका",
            "जीवाला धोका",
            "आत्ता मदत हवी"
        ],

        "bn": [
            "তাৎক্ষণিক বিপদ",
            "এখন বিপদে",
            "আমার জীবনের ঝুঁকি",
            "জীবনের ঝুঁকি",
            "এখনই সাহায্য চাই"
        ],

        "ur": [
            "فوری خطرہ",
            "ابھی خطرے میں",
            "میری جان کو خطرہ",
            "جان کو خطرہ",
            "ابھی مدد چاہیے"
        ],
    },


    # ========================================================
    # ISOLATION
    # ========================================================

    "isolation": {

        "en": [
            "alone",
            "lonely",
            "loneliness",
            "isolated",
            "isolation",
            "no one is with me",
            "nobody is with me",
            "i have no one",
            "no one to talk to",
            "nobody to talk to",
            "feel alone",
            "feeling alone"
        ],

        "te": [
            "ఒంటరిగా",
            "ఒంటరితనం",
            "ఎవరూ లేరు",
            "నాతో ఎవరూ లేరు",
            "మాట్లాడటానికి ఎవరూ లేరు"
        ],

        "hi": [
            "अकेला",
            "अकेली",
            "अकेलापन",
            "कोई मेरे साथ नहीं",
            "मेरे पास कोई नहीं",
            "बात करने वाला कोई नहीं"
        ],

        "ta": [
            "தனியாக",
            "தனிமை",
            "யாரும் இல்லை",
            "என்னுடன் யாரும் இல்லை",
            "பேச யாரும் இல்லை"
        ],

        "kn": [
            "ಒಂಟಿಯಾಗಿ",
            "ಒಂಟಿತನ",
            "ಯಾರೂ ಇಲ್ಲ",
            "ನನ್ನ ಜೊತೆ ಯಾರೂ ಇಲ್ಲ",
            "ಮಾತನಾಡಲು ಯಾರೂ ಇಲ್ಲ"
        ],

        "gu": [
            "એકલો",
            "એકલી",
            "એકલતા",
            "મારી સાથે કોઈ નથી",
            "વાત કરવા કોઈ નથી"
        ],

        "pa": [
            "ਇਕੱਲਾ",
            "ਇਕੱਲੀ",
            "ਇਕੱਲਾਪਣ",
            "ਮੇਰੇ ਨਾਲ ਕੋਈ ਨਹੀਂ",
            "ਗੱਲ ਕਰਨ ਲਈ ਕੋਈ ਨਹੀਂ"
        ],

        "mr": [
            "एकटा",
            "एकटी",
            "एकटेपणा",
            "माझ्यासोबत कोणी नाही",
            "बोलायला कोणी नाही"
        ],

        "bn": [
            "একা",
            "একাকীত্ব",
            "আমার সঙ্গে কেউ নেই",
            "কথা বলার কেউ নেই"
        ],

        "ur": [
            "اکیلا",
            "اکیلی",
            "تنہائی",
            "میرے ساتھ کوئی نہیں",
            "بات کرنے والا کوئی نہیں"
        ],
    },


    # ========================================================
    # VULNERABILITY
    # ========================================================

    "vulnerability": {

        "en": [
            "vulnerable",
            "helpless",
            "powerless",
            "unsafe",
            "unprotected",
            "weak",
            "dependent",
            "i cannot protect myself",
            "cannot protect myself",
            "no protection"
        ],

        "te": [
            "బలహీనంగా",
            "అసహాయంగా",
            "రక్షణ లేదు",
            "సురక్షితంగా లేను",
            "నన్ను నేను రక్షించుకోలేను"
        ],

        "hi": [
            "कमजोर",
            "असहाय",
            "लाचार",
            "सुरक्षित नहीं",
            "रक्षा नहीं",
            "मैं खुद को बचा नहीं सकता",
            "मैं खुद को बचा नहीं सकती"
        ],

        "ta": [
            "பலவீனமாக",
            "உதவியற்ற",
            "பாதுகாப்பாக இல்லை",
            "பாதுகாப்பு இல்லை",
            "என்னை பாதுகாத்துக்கொள்ள முடியவில்லை"
        ],

        "kn": [
            "ದುರ್ಬಲ",
            "ಅಸಹಾಯಕ",
            "ಸುರಕ್ಷಿತವಾಗಿಲ್ಲ",
            "ರಕ್ಷಣೆ ಇಲ್ಲ",
            "ನನ್ನನ್ನು ರಕ್ಷಿಸಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಿಲ್ಲ"
        ],

        "gu": [
            "નબળો",
            "અસહાય",
            "સુરક્ષિત નથી",
            "રક્ષણ નથી",
            "હું મારી જાતને બચાવી શકતો નથી"
        ],

        "pa": [
            "ਕਮਜ਼ੋਰ",
            "ਬੇਸਹਾਰਾ",
            "ਅਸਹਾਇ",
            "ਸੁਰੱਖਿਅਤ ਨਹੀਂ",
            "ਸੁਰੱਖਿਆ ਨਹੀਂ",
            "ਮੈਂ ਆਪਣੇ ਆਪ ਨੂੰ ਬਚਾ ਨਹੀਂ ਸਕਦਾ"
        ],

        "mr": [
            "कमकुवत",
            "असहाय",
            "असुरक्षित",
            "संरक्षण नाही",
            "मी स्वतःचे रक्षण करू शकत नाही"
        ],

        "bn": [
            "দুর্বল",
            "অসহায়",
            "নিরাপদ নই",
            "সুরক্ষা নেই",
            "নিজেকে রক্ষা করতে পারছি না"
        ],

        "ur": [
            "کمزور",
            "بے بس",
            "غیر محفوظ",
            "حفاظت نہیں",
            "میں خود کو بچا نہیں سکتا"
        ],
    },
}


# ============================================================
# ROMANIZED DICTIONARY
# ============================================================
#
# These are common Romanized forms used in everyday typing.
#
# This is NOT a replacement for the native-language dictionary.
# It is an additional layer.
#
# ============================================================


ROMANIZED_DICTIONARY = {

    "fear": {

        "te": [
            "bayam",
            "bhayam",
            "bayama",
            "bhayanga",
            "bayanga",
            "bayam vestundi",
            "bayam vestundhi",
            "bhayam vestundi",
            "bhayam vestundhi",
            "chaala bayam",
            "chala bayam",
            "chaala bhayam",
            "chala bhayam",
            "bayapadutunnanu",
            "bhayapadutunnanu"
        ],

        "hi": [
            "dar",
            "darr",
            "bhay",
            "bhaya",
            "bahut dar",
            "bahut darr",
            "dar lag",
            "darr lag",
            "dar lag raha hai",
            "darr lag raha hai"
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
            "hedarike",
            "bhaya agide"
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
            "naku tension",
            "chaala tension",
            "chala tension",
            "nervous"
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
    },


    "threat": {

        "te": [
            "bedirimpulu",
            "bediristunnaru",
            "bedirincharu",
            "hechcharistunnaru",
            "champestamani",
            "hami chestamani"
        ],

        "hi": [
            "dhamki",
            "dhamki di",
            "dhamki de rahe hain",
            "dhamka rahe hain",
            "chetavani",
            "jaan se maarne ki dhamki"
        ],

        "ta": [
            "mirattal",
            "mirattugirargal",
            "echcharikkai",
            "kolai mirattal"
        ],

        "kn": [
            "bedarike",
            "bedarisuttiddare",
            "eccharike",
            "koluvudagi bedarike"
        ],

        "gu": [
            "dhamki",
            "dhamki aapi",
            "chetavni"
        ],

        "pa": [
            "dhamki",
            "dhamki ditti",
            "chetavni"
        ],

        "mr": [
            "dhamki",
            "dhamki dili",
            "ishara"
        ],

        "bn": [
            "humki",
            "humki diyeche",
            "satorkobarta"
        ],

        "ur": [
            "dhamki",
            "dhamki di",
            "intabah"
        ]
    }
}


# ============================================================
# TEXT NORMALIZATION
# ============================================================


def normalize_text(text):

    if text is None:
        return ""

    text = str(text)

    replacements = {
        "’": "'",
        "‘": "'",
        "“": '"',
        "”": '"',
        "\u200c": "",
        "\u200d": ""
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = text.lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# PHRASE MATCHING
# ============================================================


def phrase_matches(text, phrase):

    text = normalize_text(text)

    phrase = normalize_text(phrase)

    if not text or not phrase:
        return False

    # For English/Romanized text, use word boundaries.
    # For Indic scripts, direct substring matching works better
    # because word-boundary behaviour is less reliable.

    has_indic = any(
        ord(char) > 127
        for char in phrase
    )

    if has_indic:

        return phrase in text

    pattern = (
        r"(?<!\w)"
        + re.escape(phrase)
        + r"(?!\w)"
    )

    return re.search(
        pattern,
        text
    ) is not None


# ============================================================
# FIND DICTIONARY EVIDENCE
# ============================================================


def find_dictionary_matches(
    text,
    language,
    romanized=False
):

    text = normalize_text(text)

    evidence = {}

    # --------------------------------------------------------
    # Native / English dictionary
    # --------------------------------------------------------

    for indicator in INDICATORS:

        matches = []

        language_words = DICTIONARY.get(
            indicator,
            {}
        ).get(
            language,
            []
        )

        for term in language_words:

            if phrase_matches(
                text,
                term
            ):

                matches.append({
                    "term": term,
                    "matched_term": term,
                    "source": "dictionary",
                    "language": language
                })

        # ----------------------------------------------------
        # Romanized dictionary
        # ----------------------------------------------------

        if romanized:

            romanized_words = (
                ROMANIZED_DICTIONARY.get(
                    indicator,
                    {}
                ).get(
                    language,
                    []
                )
            )

            for term in romanized_words:

                if phrase_matches(
                    text,
                    term
                ):

                    matches.append({
                        "term": term,
                        "matched_term": term,
                        "source": "romanized_dictionary",
                        "language": language
                    })

        if matches:

            evidence[
                indicator
            ] = matches

    return evidence


# ============================================================
# CONVERT EVIDENCE TO SCORE
# ============================================================


def evidence_to_score(
    evidence
):

    scores = {}

    for indicator in INDICATORS:

        matches = evidence.get(
            indicator,
            []
        )

        if not matches:

            scores[
                indicator
            ] = 0.0

            continue

        # Multiple independent matches strengthen evidence.
        #
        # 1 match  -> 0.80
        # 2 matches -> 0.90
        # 3+ matches -> 1.00

        count = len(matches)

        if count >= 3:
            score = 1.0

        elif count == 2:
            score = 0.9

        else:
            score = 0.8

        scores[
            indicator
        ] = score

    return scores


# ============================================================
# ANALYZE MULTILINGUAL
# ============================================================
#
# THIS is the function required by indicator_extractor.py.
#
# ============================================================


def analyze_multilingual(
    original_text,
    language="en",
    romanized=False,
    analysis_text=None
):

    original_text = (
        original_text or ""
    )

    analysis_text = (
        analysis_text or ""
    )

    # --------------------------------------------------------
    # First analyze ORIGINAL text.
    # --------------------------------------------------------

    original_evidence = (
        find_dictionary_matches(
            original_text,
            language,
            romanized
        )
    )

    # --------------------------------------------------------
    # Also analyze English translated text.
    #
    # This provides a second safety layer.
    #
    # Example:
    #
    # Telugu original
    #     ↓
    # IndicTrans2
    #     ↓
    # "I am very worried about my exams."
    #     ↓
    # English dictionary
    #
    # --------------------------------------------------------

    translated_evidence = {}

    if analysis_text:

        translated_evidence = (
            find_dictionary_matches(
                analysis_text,
                "en",
                False
            )
        )

    # --------------------------------------------------------
    # Merge evidence
    # --------------------------------------------------------

    evidence = {}

    for indicator in INDICATORS:

        combined = []

        combined.extend(
            original_evidence.get(
                indicator,
                []
            )
        )

        combined.extend(
            translated_evidence.get(
                indicator,
                []
            )
        )

        if combined:

            # Remove duplicate entries.

            unique = []

            seen = set()

            for item in combined:

                key = (
                    item.get("term"),
                    item.get("source"),
                    item.get("language")
                )

                if key not in seen:

                    seen.add(key)

                    unique.append(item)

            evidence[
                indicator
            ] = unique

    # --------------------------------------------------------
    # Scores
    # --------------------------------------------------------

    scores = evidence_to_score(
        evidence
    )

    return {

        "scores": scores,

        "evidence": evidence,

        "language": language,

        "romanized": romanized
    }


# ============================================================
# SIMPLE PUBLIC API
# ============================================================


def get_indicator_scores(
    text,
    language="en",
    romanized=False,
    analysis_text=None
):

    result = analyze_multilingual(

        original_text=text,

        language=language,

        romanized=romanized,

        analysis_text=analysis_text
    )

    return result["scores"]


def get_indicator_evidence(
    text,
    language="en",
    romanized=False,
    analysis_text=None
):

    result = analyze_multilingual(

        original_text=text,

        language=language,

        romanized=romanized,

        analysis_text=analysis_text
    )

    return result["evidence"]


# ============================================================
# TEST
# ============================================================


if __name__ == "__main__":

    tests = [

        (
            "ROMANIZED TELUGU",
            "te",
            True,
            "naku exams antey chaala bayam vestundhi ippudu naku em cheyalo teliyatledu",
            ""
        ),

        (
            "NATIVE TELUGU",
            "te",
            False,
            "నా పరీక్షల గురించి నాకు చాలా ఆందోళనగా ఉంది.",
            "I am very worried about my exams."
        ),

        (
            "ROMANIZED HINDI",
            "hi",
            True,
            "mujhe exams ko lekar bahut dar lag raha hai",
            ""
        ),

        (
            "NATIVE HINDI",
            "hi",
            False,
            "मुझे अपनी परीक्षा को लेकर बहुत चिंता हो रही है।",
            "I am very worried about my exams."
        ),

        (
            "ROMANIZED TAMIL",
            "ta",
            True,
            "enakku romba bayama irukku",
            ""
        ),

        (
            "ROMANIZED KANNADA",
            "kn",
            True,
            "nanage tumba bhaya ide",
            ""
        ),

        (
            "ENGLISH",
            "en",
            False,
            "I am very afraid about my exams.",
            ""
        ),

        (
            "THREAT",
            "en",
            False,
            "They keep warning me to stay silent.",
            ""
        ),

        (
            "DISPLACEMENT",
            "en",
            False,
            "We were forced to leave our home because of threats.",
            ""
        ),

        (
            "VIOLENCE",
            "en",
            False,
            "They attacked me and beat me.",
            ""
        ),

        (
            "IMMEDIATE DANGER",
            "en",
            False,
            "I am in immediate danger right now.",
            ""
        ),

        (
            "ISOLATION",
            "en",
            False,
            "I feel completely alone and have no one to talk to.",
            ""
        )
    ]


    print()
    print("=" * 70)
    print("NHAA DICTIONARY ENGINE TEST")
    print("=" * 70)


    for (
        name,
        language,
        romanized,
        text,
        analysis_text
    ) in tests:

        print()
        print("-" * 70)
        print("TEST:", name)
        print("Language:", language)
        print("Romanized:", romanized)
        print("Text:", text)

        result = analyze_multilingual(

            original_text=text,

            language=language,

            romanized=romanized,

            analysis_text=analysis_text
        )

        print()
        print("INDICATOR SCORES:")

        for indicator in INDICATORS:

            score = result[
                "scores"
            ].get(
                indicator,
                0.0
            )

            print(
                f"  {indicator:<20}"
                f"{score:.4f}"
            )

        print()
        print("EVIDENCE:")

        for indicator, matches in (
            result["evidence"].items()
        ):

            terms = [

                item[
                    "matched_term"
                ]

                for item in matches
            ]

            print(
                f"  {indicator}: "
                f"{terms}"
            )


    print()
    print("=" * 70)
    print("DICTIONARY ENGINE TEST COMPLETED")
    print("=" * 70)