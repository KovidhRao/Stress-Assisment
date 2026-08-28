/**
 * NHAA Multilingual NLP & Concept Engine
 * High-performance TypeScript implementation of the Day 2 NLP Pipeline & Lexicon Engine.
 * Supports:
 * - 10 Core Distress & Trauma Indicators
 * - 17 Situation Classifications
 * - 10 Indian Languages (Native Scripts + Romanized transliteration + English)
 * - Safety Escalation & SVI Composite Scoring
 */

import { NLPIndicators, ContributingFactor, RiskLevel } from '@/types'

// ============================================================
// LANGUAGE SCRIPTS & DETECTION
// ============================================================

export interface LanguageDetectionResult {
  language: string
  languageName: string
  isRomanized: boolean
  confidence: number
}

const SCRIPT_RANGES: Record<string, RegExp> = {
  hi: /[\u0900-\u097F]/, // Devanagari (Hindi/Marathi)
  bn: /[\u0980-\u09FF]/, // Bengali
  pa: /[\u0A00-\u0A7F]/, // Punjabi / Gurmukhi
  gu: /[\u0A80-\u0AFF]/, // Gujarati
  or: /[\u0B00-\u0B7F]/, // Odia
  ta: /[\u0B80-\u0BFF]/, // Tamil
  te: /[\u0C00-\u0C7F]/, // Telugu
  kn: /[\u0C80-\u0CFF]/, // Kannada
  ml: /[\u0D00-\u0D7F]/, // Malayalam
  ur: /[\u0600-\u06FF]/, // Urdu / Arabic script
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  kn: 'Kannada',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi',
  ur: 'Urdu',
  ml: 'Malayalam',
  or: 'Odia',
}

const ROMANIZED_HINTS: Record<string, string[]> = {
  hi: [
    'mujhe', 'mujhko', 'main', 'mein', 'mera', 'meri', 'mere', 'bahut', 'bohot',
    'mujhse', 'chinta', 'pareshan', 'pareshaan', 'tension', 'dar', 'darr', 'darta',
    'darti', 'akela', 'akeli', 'nahi', 'nahin', 'koi', 'kuch', 'madad', 'ghar',
    'parivar', 'zindagi', 'mar denge', 'jaan se', 'dhamki', 'maar dala'
  ],
  te: [
    'naku', 'naaku', 'naa', 'naadi', 'chala', 'chaala', 'tension', 'bhayanga',
    'bhayam', 'chachipovalani', 'sahayam', 'intlo', 'ippudu', 'badhaga', 'ontari'
  ],
  ta: [
    'enakku', 'romba', 'bayam', 'bayama', 'kavalai', 'thanimai', 'udhavi',
    'uyirukku', 'mirattal', 'kodumai', 'thunbam'
  ],
  kn: [
    'nanage', 'tumba', 'bhaya', 'bedarike', 'chinthe', 'sahaya', 'maneyalli',
    'saavina', 'ontitanava', 'anyaya', 'maran'
  ]
}

export function detectLanguage(text: string): LanguageDetectionResult {
  const clean = text || ''
  
  // 1. Check Native Scripts
  for (const [lang, regex] of Object.entries(SCRIPT_RANGES)) {
    if (regex.test(clean)) {
      return {
        language: lang,
        languageName: LANGUAGE_NAMES[lang] || lang,
        isRomanized: false,
        confidence: 0.95
      }
    }
  }

  // 2. Check Romanized Indian Language Hints
  const lower = clean.toLowerCase()
  const words = lower.split(/\s+/)

  let bestLang = 'en'
  let maxMatches = 0

  for (const [lang, hints] of Object.entries(ROMANIZED_HINTS)) {
    let matches = 0
    for (const hint of hints) {
      if (lower.includes(hint)) {
        matches++
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches
      bestLang = lang
    }
  }

  if (maxMatches >= 2) {
    return {
      language: bestLang,
      languageName: `${LANGUAGE_NAMES[bestLang] || bestLang} (Transliterated)`,
      isRomanized: true,
      confidence: Math.min(0.9, 0.4 + maxMatches * 0.15)
    }
  }

  return {
    language: 'en',
    languageName: 'English',
    isRomanized: false,
    confidence: 0.85
  }
}

// ============================================================
// MULTILINGUAL CONCEPT LEXICON (10 INDICATORS)
// ============================================================

export const CONCEPT_DICTIONARY: Record<keyof NLPIndicators, Record<string, string[]>> = {
  stress: {
    en: ['stress', 'stressed', 'stressful', 'pressure', 'pressured', 'overwhelmed', 'under pressure', 'mental pressure', 'work pressure', 'exam pressure', 'burden', 'exhausted'],
    hi: ['तनाव', 'दबाव', 'परेशान', 'बोझ', 'tanav', 'pareshan', 'bojh', 'dabav', 'sar dard'],
    te: ['ఒత్తిడి', 'టెన్షన్', 'భారం', 'ottidi', 'tension', 'bharam'],
    ta: ['மன அழுத்தம்', 'அழுத்தம்', 'சுமை', 'mana azhutham', 'azhutham', 'sumai'],
    kn: ['ಒತ್ತಡ', 'ಹಿಂಸೆ', 'ತಲೆನೋವು', 'ottada', 'thale novu', 'himse']
  },
  fear: {
    en: ['fear', 'fearful', 'afraid', 'scared', 'terrified', 'frightened', 'horror', 'panic', 'dread', 'terror', 'alarmed', 'shaking in fear'],
    hi: ['डर', 'डरा हुआ', 'भय', 'खौफ', 'दहशत', 'dar', 'darr', 'bhay', 'khauf', 'dahshat', 'darpok'],
    te: ['భయం', 'భయంగా', 'దడ', 'వణుకు', 'bhayam', 'bhayanga', 'dada', 'vanuku'],
    ta: ['பயம்', 'அச்சம்', 'பயந்து', 'திகில்', 'bayam', 'acham', 'thigil'],
    kn: ['ಭಯ', 'ಹೆದರಿಕೆ', 'ದಿಗ್ಭ್ರಮೆ', 'bhaya', 'hedarike', 'digbhrame']
  },
  anxiety: {
    en: ['anxiety', 'anxious', 'nervous', 'worry', 'worried', 'uneasy', 'restless', 'apprehensive', 'shaking', 'can\'t breathe', 'heart racing', 'overthinking'],
    hi: ['चिंता', 'घबराहट', 'बेचैनी', 'आशंका', 'chinta', 'ghabrahat', 'bechaini', 'fark'],
    te: ['ఆందోళన', 'కంగారు', 'బెంగ', 'andolana', 'kangaaru', 'benga'],
    ta: ['பதட்டம்', 'கவலை', 'படபடப்பு', 'padattam', 'kavalai', 'padapadappu'],
    kn: ['ಆತಂಕ', 'ಚಿಂತೆ', 'ಕಳವಳ', 'aathanka', 'chinthe', 'kalavala']
  },
  distress: {
    en: ['distress', 'distressed', 'agony', 'suffering', 'anguish', 'crying', 'broken', 'helpless', 'despair', 'misery', 'torment'],
    hi: ['कष्ट', 'पीड़ा', 'यातना', 'दुख', 'लाचार', 'kasht', 'peeda', 'yatna', 'dukh', 'lachar', 'rone laga'],
    te: ['బాధ', 'వేదన', 'క్షోభ', 'ఏడుపు', 'badha', 'vedana', 'ksobha', 'edupu'],
    ta: ['துன்பம்', 'வேதனை', 'கண்ணீர்', 'துயரம்', 'thunbam', 'vedhanai', 'kanneer'],
    kn: ['ಯಾತನೆ', 'ಸಂಕಟ', 'ನೋವು', 'ಕಣ್ಣೀರು', 'yaathane', 'sankata', 'novu', 'kanniru']
  },
  trauma: {
    en: ['trauma', 'traumatized', 'nightmare', 'flashback', 'shock', 'haunted', 'intrusive memory', 'cannot forget the sight', 'scarred', 'ptsd'],
    hi: ['आघात', 'सदमा', 'बुरे सपने', 'पुराना घाव', 'aaghat', 'sadma', 'bure sapne', 'manasik chot'],
    te: ['తీవ్ర గాయం', 'షాక్', 'భయానక కలలు', 'trauma', 'shock', 'bhayanaka kalalu'],
    ta: ['அதிர்ச்சி', 'மனக்காயம்', 'கெட்ட கனவு', 'adhirchi', 'manakkayam', 'kanavu'],
    kn: ['ಆಘಾತ', 'ಮನೋವೇದನೆ', 'ಘಾಸಿ', 'aaghaatha', 'ghasi', 'shock']
  },
  threat: {
    en: ['threat', 'threatened', 'threatening', 'warning', 'intimidated', 'extortion', 'blackmail', 'destroy you', 'consequences', 'kill threat'],
    hi: ['धमकी', 'डराना', 'वारनिंग', 'जान से मारने की धमकी', 'dhamki', 'darana', 'jaan se marne ki dhamki', 'hata denge'],
    te: ['బెదిరింపు', 'హెచ్చరిక', 'చంపేస్తామని బెదిరింపు', 'bedirimpu', 'heccharika', 'champesthamu'],
    ta: ['மிரட்டல்', 'எச்சரிக்கை', 'கொலை மிரட்டல்', 'mirattal', 'echarikkai', 'kolai mirattal'],
    kn: ['ಬೆದರಿಕೆ', 'ಎಚ್ಚರಿಕೆ', 'ಕೊಲ್ಲುವ ಬೆದರಿಕೆ', 'bedarike', 'eccharike', 'kolluva bedarike']
  },
  violence: {
    en: ['violence', 'attack', 'attacked', 'beaten', 'assault', 'hit', 'abuse', 'injure', 'injury', 'blood', 'weapon', 'slapped', 'lynched', 'knife', 'gun', 'acid', 'molested', 'raped'],
    hi: ['हिंसा', 'हमला', 'मारपीट', 'चोट', 'खून', 'हथियार', 'चाकू', 'बलात्कार', 'hinsa', 'hamla', 'marpeet', 'chot', 'khoon', 'hathyar', 'chaku', 'balatkar', 'mara'],
    te: ['హింస', 'దాడి', 'కొట్టడం', 'గాయం', 'రక్తం', 'ఆయుధం', 'చంపడం', 'hinsa', 'dadi', 'kottadam', 'gayam', 'raktham', 'aayudham'],
    ta: ['வன்முறை', 'தாக்குதல்', 'அடிதடி', 'காயம்', 'ரத்தம்', 'ஆயுதம்', 'vanmurai', 'thakkudhal', 'adithadi', 'gayam', 'ratham'],
    kn: ['ಹಿಂಸಾಚಾರ', 'ದಾಳಿ', 'ಹಲ್ಲೆ', 'ಗಾಯ', 'ರಕ್ತ', 'ಆಯುಧ', 'himsachara', 'daali', 'halle', 'gaya', 'raktha']
  },
  immediate_danger: {
    en: ['immediate danger', 'danger', 'life at risk', 'save me', 'emergency', 'right now', 'outside my door', 'surrounded', 'weapon in hand', 'call police', 'urgent help', 'about to kill'],
    hi: ['खतरा', 'जान का खतरा', 'बचाओ', 'अभी', 'घर घेर लिया', 'पुलिस बुलाओ', 'khatra', 'jaan ka khatra', 'bachao', 'abhi', 'gher liya', 'police bulao'],
    te: ['ప్రమాదం', 'ప్రాణాపాయం', 'కాపాడండి', 'ఇప్పుడే', 'రక్షించండి', 'pramadam', 'pranapayam', 'kapadandi', 'rakshinchandi'],
    ta: ['ஆபத்து', 'உயிர் ஆபத்து', 'காப்பாற்றுங்கள்', 'இப்போதே', 'abathu', 'uyir abathu', 'kappatrungal'],
    kn: ['ಅಪಾಯ', 'ಪ್ರಾಣಾಪಾಯ', 'ಕಾಪಾಡಿ', 'ಈಗಲೇ', 'apaya', 'pranapaya', 'kapadi']
  },
  isolation: {
    en: ['isolation', 'isolated', 'alone', 'lonely', 'abandoned', 'boycott', 'social boycott', 'ostracized', 'no one talks to me', 'cut off', 'excluded', 'cast out', 'ousted'],
    hi: ['अकेला', 'अकेलापन', 'बहिष्कार', 'सामाजिक बहिष्कार', 'हुक्का पानी बंद', 'akela', 'akelapan', 'bahishkar', 'pani band', 'alag thalag'],
    te: ['ఒంటరి', 'బహిష్కరణ', 'వెలివేత', 'ఎవరూ మాట్లాడట్లేదు', 'ontari', 'bahiskarana', 'velivetha'],
    ta: ['தனிமை', 'புறக்கணிப்பு', 'விலக்கி வைக்கப்பட்டது', 'thanimai', 'purakkanippu'],
    kn: ['ಒಂಟಿತನ', 'ಬಹಿಷ್ಕಾರ', 'ಹೊರಹಾಕಿದ್ದಾರೆ', 'ontithana', 'bahiskara', 'horahakidare']
  },
  vulnerability: {
    en: ['vulnerability', 'vulnerable', 'hopeless', 'helpless', 'no money', 'homeless', 'disabled', 'nowhere to go', 'orphan', 'powerless', 'caste slur', 'untouchable', 'oppressed'],
    hi: ['लाचार', 'बेबस', 'मजबूर', 'असहाय', 'कोई आसरा नहीं', 'गरीब', 'जातिसूचक', 'lachar', 'bebas', 'majboor', 'asahay', 'jaati', 'dalit'],
    te: ['నిస్సహాయ', 'దిక్కులేని', 'అసహాయత', 'ఏం చేయలేను', 'nissahaya', 'dikkuleni', 'asahayatha'],
    ta: ['ஆதரவற்ற', 'இயலாமை', 'ஏழை', 'திக்கற்ற', 'aatharavatra', 'iyalamai'],
    kn: ['ಅಸಹಾಯಕ', 'ದಿಕ್ಕಿಲ್ಲದ', 'ಬಡತನ', 'ದಲಿತ', 'asahayaka', 'dikkillada', 'dalit']
  }
}

// ============================================================
// SITUATION DETECTION RULES (17 CATEGORIES)
// ============================================================

export const SITUATION_RULES: Record<string, string[]> = {
  IMMEDIATE_DANGER: [
    'immediate danger', 'kill me right now', 'outside my house', 'surrounded us', 'break inside',
    'weapon pointed', 'jaan ka khatra', 'abhi bachao', 'pranapayam', 'uyir abathu'
  ],
  VIOLENCE: [
    'attack', 'attacked', 'beaten', 'assault', 'hit me', 'blood', 'weapon', 'stabbed',
    'lynched', 'slapped', 'acid attack', 'rape', 'gang rape', 'molested', 'fracture',
    'hospitalized', 'marpeet', 'khoon', 'chaku', 'balatkar', 'kottadam', 'gayam'
  ],
  THREAT: [
    'threat', 'threatened', 'dhamki', 'mar denge', 'kill you', 'burn down',
    'warned us', 'blackmail', 'extortion', 'bedirimpu', 'mirattal', 'bedarike'
  ],
  INTIMIDATION: [
    'intimidation', 'intimidated', 'harassed', 'stalking', 'fear in village',
    'terrorized', 'caste slur', 'jaati', 'dalit abuse', 'untouchable slur', 'oppressed'
  ],
  SOCIAL_ISOLATION: [
    'boycott', 'social boycott', 'pani band', 'basti ousted', 'expelled from village',
    'nobody speaks', 'community ban', 'bahiskara', 'velivetha', 'purakkanippu'
  ],
  DISPLACEMENT: [
    'evicted', 'house burned', 'land grabbed', 'forced to leave', 'homeless',
    'ran away from village', 'nowhere to stay', 'ghar chhodna pada', 'displaced'
  ],
  ACADEMIC_STRESS: [
    'exam', 'exams', 'test', 'study pressure', 'marks', 'failed exam', 'college burden',
    'pariksha', 'padhai', 'board exam', 'entrance exam'
  ],
  WORK_STRESS: [
    'boss pressure', 'salary unpaid', 'workload', 'job harassment', 'office torture',
    'terminated from job', 'night shifts', 'overtime'
  ],
  FINANCIAL_STRESS: [
    'debt', 'moneylender', 'loan', 'no food', 'starving', 'bankruptcy', 'karz',
    'vyaj', 'interest harassment'
  ],
  GRIEF: [
    'death', 'died', 'passed away', 'lost my mother', 'lost my father', 'mourning',
    'funeral', 'suicide of relative', 'khatam ho gaya'
  ],
  FAMILY_STRESS: [
    'domestic dispute', 'in-laws torture', 'dowry demand', 'husband beating',
    'forced marriage', 'dahej'
  ],
  TRAUMA: [
    'flashbacks', 'nightmares every night', 'cannot erase memory', 'hallucinating',
    'ptsd', 'severe shock'
  ],
  FEAR: [
    'scared to walk out', 'constant dread', 'shivering in dark', 'darr lagta hai',
    'bhayanga undi'
  ],
  ANXIETY: [
    'panic attack', 'palpitations', 'restless nights', 'chinta', 'andolana', 'padapadappu'
  ],
  EMOTIONAL_DISTRESS: [
    'crying constantly', 'cannot stop tears', 'deep sadness', 'hopelessness', 'depression'
  ],
  ISOLATION: [
    'completely alone', 'no friends', 'abandoned by family', 'nobody cares'
  ],
  VULNERABILITY: [
    'disabled', 'minor orphan', 'no legal support', 'uneducated', 'illiterate exploited'
  ]
}

export const SITUATION_SEVERITY_SCORES: Record<string, number> = {
  UNKNOWN: 0,
  ACADEMIC_STRESS: 0,
  GENERAL_ANXIETY: 5,
  GRIEF: 5,
  SOCIAL_ISOLATION: 5,
  ISOLATION: 5,
  FAMILY_STRESS: 5,
  WORK_STRESS: 5,
  FEAR: 10,
  DISPLACEMENT: 10,
  SOCIAL_BOYCOTT: 10,
  INTIMIDATION: 15,
  THREAT: 20,
  VIOLENCE: 25,
  IMMEDIATE_DANGER: 30
}

export const SVI_INDICATOR_WEIGHTS: Record<keyof NLPIndicators, number> = {
  threat: 16,
  violence: 15,
  fear: 12,
  anxiety: 12,
  distress: 12,
  trauma: 10,
  immediate_danger: 10,
  stress: 8,
  isolation: 3,
  vulnerability: 2
}

// ============================================================
// CORE EXTRACTION & CLASSIFICATION LOGIC
// ============================================================

export interface NLPAnalysisOutput {
  language: string
  languageName: string
  isRomanized: boolean
  situation: string
  situationConfidence: number
  indicators: NLPIndicators
  matchedKeywords: Record<string, string[]>
  sviScore: number
  riskLevel: RiskLevel
  confidence: number
  contributingFactors: ContributingFactor[]
  safetyEscalationApplied: boolean
  suicidalFlag: boolean
  intimidationFlag: boolean
  socialIsolationFlag: boolean
  recommendedActions: string[]
}

export function extractNLPIndicators(text: string): {
  indicators: NLPIndicators
  matchedKeywords: Record<string, string[]>
  suicidalFlag: boolean
  intimidationFlag: boolean
  socialIsolationFlag: boolean
} {
  const lower = (text || '').toLowerCase()
  const matchedKeywords: Record<string, string[]> = {}

  let suicidalFlag = false
  let intimidationFlag = false
  let socialIsolationFlag = false

  const rawIndicators: NLPIndicators = {
    stress: 0,
    fear: 0,
    anxiety: 0,
    distress: 0,
    trauma: 0,
    threat: 0,
    violence: 0,
    immediate_danger: 0,
    isolation: 0,
    vulnerability: 0
  }

  // Suicidal ideation check
  const suicideTriggers = ['suicide', 'kill myself', 'end my life', 'want to die', 'chachipovalani', 'mar jau', 'saavina', 'chavu', 'no hope to live']
  for (const trigger of suicideTriggers) {
    if (lower.includes(trigger)) {
      suicidalFlag = true
      rawIndicators.distress = Math.max(rawIndicators.distress, 0.9)
      rawIndicators.vulnerability = Math.max(rawIndicators.vulnerability, 0.9)
      if (!matchedKeywords['suicide_triggers']) matchedKeywords['suicide_triggers'] = []
      matchedKeywords['suicide_triggers'].push(trigger)
    }
  }

  // Dictionary concept matching across all indicators and languages
  for (const [indicator, langMap] of Object.entries(CONCEPT_DICTIONARY) as [keyof NLPIndicators, Record<string, string[]>][]) {
    let matchCount = 0
    const detected: string[] = []

    for (const [lang, keywords] of Object.entries(langMap)) {
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          matchCount++
          detected.push(kw)
        }
      }
    }

    if (detected.length > 0) {
      matchedKeywords[indicator] = Array.from(new Set(detected))
    }

    // Dynamic strength mapping
    if (matchCount >= 4) {
      rawIndicators[indicator] = 1.0
    } else if (matchCount === 3) {
      rawIndicators[indicator] = 0.85
    } else if (matchCount === 2) {
      rawIndicators[indicator] = 0.70
    } else if (matchCount === 1) {
      rawIndicators[indicator] = 0.45
    } else {
      rawIndicators[indicator] = 0.0
    }
  }

  if (rawIndicators.threat > 0.4 || rawIndicators.violence > 0.4) {
    intimidationFlag = true
  }
  if (rawIndicators.isolation > 0.4) {
    socialIsolationFlag = true
  }

  return {
    indicators: rawIndicators,
    matchedKeywords,
    suicidalFlag,
    intimidationFlag,
    socialIsolationFlag
  }
}

export function detectPrimarySituation(text: string, indicators: NLPIndicators): {
  situation: string
  confidence: number
  matchedRules: string[]
} {
  const lower = (text || '').toLowerCase()
  let bestSituation = 'UNKNOWN'
  let bestScore = 0
  let matchedRules: string[] = []

  for (const [sit, rules] of Object.entries(SITUATION_RULES)) {
    let matches: string[] = []
    for (const rule of rules) {
      if (lower.includes(rule)) {
        matches.push(rule)
      }
    }
    if (matches.length > bestScore) {
      bestScore = matches.length
      bestSituation = sit
      matchedRules = matches
    }
  }

  // Fallback to dominant high-severity indicator if situation keyword not explicit
  if (bestScore === 0) {
    if (indicators.immediate_danger >= 0.6) {
      bestSituation = 'IMMEDIATE_DANGER'
      bestScore = 1
    } else if (indicators.violence >= 0.6) {
      bestSituation = 'VIOLENCE'
      bestScore = 1
    } else if (indicators.threat >= 0.6) {
      bestSituation = 'THREAT'
      bestScore = 1
    } else if (indicators.trauma >= 0.6) {
      bestSituation = 'TRAUMA'
      bestScore = 1
    } else if (indicators.anxiety >= 0.6) {
      bestSituation = 'ANXIETY'
      bestScore = 1
    } else if (indicators.stress >= 0.6) {
      bestSituation = 'EMOTIONAL_DISTRESS'
      bestScore = 1
    }
  }

  const confidence = bestScore >= 3 ? 0.95 : bestScore === 2 ? 0.85 : bestScore === 1 ? 0.65 : 0.20
  return {
    situation: bestSituation,
    confidence,
    matchedRules
  }
}

export function computeComprehensiveNLP(
  narrativeText: string,
  voiceDistressScore: number = 0
): NLPAnalysisOutput {
  const langResult = detectLanguage(narrativeText)
  const extraction = extractNLPIndicators(narrativeText)
  const situationResult = detectPrimarySituation(narrativeText, extraction.indicators)

  // 1. Calculate weighted indicator score
  let weightedScore = 0
  const totalWeight = Object.values(SVI_INDICATOR_WEIGHTS).reduce((a, b) => a + b, 0)
  const contributions: Record<string, number> = {}

  for (const [indicator, weight] of Object.entries(SVI_INDICATOR_WEIGHTS) as [keyof NLPIndicators, number][]) {
    const val = extraction.indicators[indicator] || 0
    const contrib = Math.round((val * weight) * 100) / 100
    weightedScore += contrib
    contributions[indicator] = contrib
  }

  let baseSVI = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0

  // 2. Situation Severity Adjustment
  const situationAdjustment = (SITUATION_SEVERITY_SCORES[situationResult.situation] || 0) * situationResult.confidence
  baseSVI += situationAdjustment
  if (situationAdjustment > 0) {
    contributions['situation_severity'] = Math.round(situationAdjustment * 100) / 100
  }

  // 3. Voice distress contribution (if voice recorded)
  if (voiceDistressScore > 0) {
    baseSVI = baseSVI * 0.7 + voiceDistressScore * 0.3
    contributions['voice_acoustics'] = Math.round(voiceDistressScore * 0.3 * 100) / 100
  }

  // 4. Safety Escalation Rules
  let safetyEscalationApplied = false
  const immDanger = extraction.indicators.immediate_danger
  const viol = extraction.indicators.violence
  const thr = extraction.indicators.threat
  const fear = extraction.indicators.fear

  if (immDanger >= 0.66 && thr >= 0.66) {
    baseSVI = Math.max(baseSVI, 76.0)
    safetyEscalationApplied = true
  } else if (immDanger >= 0.66 && viol >= 0.66) {
    baseSVI = Math.max(baseSVI, 76.0)
    safetyEscalationApplied = true
  } else if (viol >= 0.66) {
    baseSVI = Math.max(baseSVI, 60.0)
    safetyEscalationApplied = true
  } else if (thr >= 0.66 && fear >= 0.33) {
    baseSVI = Math.max(baseSVI, 50.0)
    safetyEscalationApplied = true
  }

  if (extraction.suicidalFlag) {
    baseSVI = Math.max(baseSVI, 88.0)
    safetyEscalationApplied = true
  }

  const finalSVI = Math.min(100, Math.max(5, Math.round(baseSVI)))

  // 5. Risk Category
  let riskLevel: RiskLevel = 'Low'
  if (finalSVI >= 75 || extraction.suicidalFlag) {
    riskLevel = 'Critical'
  } else if (finalSVI >= 50) {
    riskLevel = 'High'
  } else if (finalSVI >= 25) {
    riskLevel = 'Moderate'
  }

  // 6. Contributing Factors (sorted descending)
  const contributingFactors: ContributingFactor[] = Object.entries(contributions)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ indicator: k, contribution: v }))
    .sort((a, b) => b.contribution - a.contribution)

  // 7. Overall Confidence
  const activeIndicatorsCount = Object.values(extraction.indicators).filter(v => v > 0).length
  const indicatorSupport = Math.min(activeIndicatorsCount / 5.0, 1.0)
  const confidence = Math.round((0.6 * situationResult.confidence + 0.4 * indicatorSupport) * 100) / 100

  // 8. Recommendations
  const recommendedActions: string[] = []
  if (riskLevel === 'Critical') {
    recommendedActions.push('Immediate Emergency Police Intervention & Protection (NHAA Critical Triage)')
    recommendedActions.push('Urgent 24/7 Psychological Crisis Counselling (Within 15 mins)')
    recommendedActions.push('District Magistrate / Nodal Atrocity Cell Rapid Alert')
    recommendedActions.push('Physical Safety Harbor & Emergency Medical Assessment')
  } else if (riskLevel === 'High') {
    recommendedActions.push('Dedicated Trauma Counsellor Dispatch (Within 2 hours)')
    recommendedActions.push('Free Legal Aid Cell (NALSA / SLSA Advocate Appointment)')
    recommendedActions.push('Local Police Station Station House Officer (SHO) Notification')
    recommendedActions.push('Witness Protection & Housing Safety Review')
  } else if (riskLevel === 'Moderate') {
    recommendedActions.push('Scheduled Tele-Counselling Session within 24 Hours')
    recommendedActions.push('Guidance on Filing SC/ST PoA Act FIR & Redressal Redress')
    recommendedActions.push('Community Support & Welfare Officer Allocation')
  } else {
    recommendedActions.push('Self-Guided Coping, Grounding & Breathing Exercises')
    recommendedActions.push('Legal Rights Brochure & Redressal Info Portal Access')
    recommendedActions.push('Follow-up Check-in in 48 Hours')
  }

  return {
    language: langResult.language,
    languageName: langResult.languageName,
    isRomanized: langResult.isRomanized,
    situation: situationResult.situation,
    situationConfidence: situationResult.confidence,
    indicators: extraction.indicators,
    matchedKeywords: extraction.matchedKeywords,
    sviScore: finalSVI,
    riskLevel,
    confidence,
    contributingFactors,
    safetyEscalationApplied,
    suicidalFlag: extraction.suicidalFlag,
    intimidationFlag: extraction.intimidationFlag,
    socialIsolationFlag: extraction.socialIsolationFlag,
    recommendedActions
  }
}
