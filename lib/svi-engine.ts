import { RiskLevel, StressAssessment, VoiceAnalysisMetrics } from '@/types'

// Key emotional and trauma triggers in English and Indian transliterated terms
const CRITICAL_KEYWORDS = [
  'kill', 'murder', 'suicide', 'die', 'threat to life', 'mar denge', 'jaan se marne',
  'burn', 'acid', 'rape', 'gang rape', 'weapon', 'talwar', 'bandook', 'gun', 'hanging', 'no hope'
]

const INTIMIDATION_KEYWORDS = [
  'threat', 'threatened', 'dhamki', 'dar', 'terror', 'boycott', 'social boycott',
  'expelled', 'hata diya', 'pani band', 'ousted', 'basti', 'caste slur', 'jaati',
  'dalit', 'adivasi', 'untouchable', 'oppression', 'forced', 'kidnap'
]

const TRAUMA_KEYWORDS = [
  'crying', 'nightmare', 'shaking', 'trembling', 'anxious', 'can\'t sleep', 'panic',
  'beaten', 'injury', 'blood', 'hospital', 'pain', 'broken', 'helpless', 'fear', 'alone',
  'ghabrahat', 'dard', 'rone laga', 'chot'
]

export function analyzeNarrativeText(text: string): {
  traumaScore: number
  fearScore: number
  anxietyScore: number
  suicidalFlag: boolean
  intimidationFlag: boolean
  socialIsolationFlag: boolean
  triggers: string[]
} {
  const lower = text.toLowerCase()
  const detectedTriggers: string[] = []

  let suicidalFlag = false
  let intimidationFlag = false
  let socialIsolationFlag = false

  let criticalMatches = 0
  let intimidationMatches = 0
  let traumaMatches = 0

  CRITICAL_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      criticalMatches++
      detectedTriggers.push(kw)
      if (['suicide', 'die', 'marne', 'no hope', 'hanging'].includes(kw)) {
        suicidalFlag = true
      }
    }
  })

  INTIMIDATION_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      intimidationMatches++
      detectedTriggers.push(kw)
      intimidationFlag = true
      if (['boycott', 'social boycott', 'pani band', 'ousted', 'expelled'].includes(kw)) {
        socialIsolationFlag = true
      }
    }
  })

  TRAUMA_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      traumaMatches++
      detectedTriggers.push(kw)
    }
  })

  // Normalize scores 0 - 100
  let traumaScore = Math.min(100, Math.round(traumaMatches * 22 + criticalMatches * 30 + (text.length > 50 ? 15 : 5)))
  let fearScore = Math.min(100, Math.round(intimidationMatches * 25 + (intimidationFlag ? 20 : 0) + criticalMatches * 20))
  let anxietyScore = Math.min(100, Math.round(traumaMatches * 18 + intimidationMatches * 15 + (text.length > 100 ? 15 : 0)))

  if (text.trim().length === 0) {
    return {
      traumaScore: 10,
      fearScore: 10,
      anxietyScore: 15,
      suicidalFlag: false,
      intimidationFlag: false,
      socialIsolationFlag: false,
      triggers: []
    }
  }

  return {
    traumaScore: Math.max(15, traumaScore),
    fearScore: Math.max(15, fearScore),
    anxietyScore: Math.max(20, anxietyScore),
    suicidalFlag,
    intimidationFlag,
    socialIsolationFlag,
    triggers: Array.from(new Set(detectedTriggers))
  }
}

export function computeSVI(
  narrativeText: string,
  voiceMetrics?: VoiceAnalysisMetrics | null,
  clinicalAnswersScore: number = 0 // from questionnaire if answered (0-20)
): StressAssessment {
  const textAnalysis = analyzeNarrativeText(narrativeText)

  let voiceDistressScore = 0
  let speechStressDetected = false

  if (voiceMetrics) {
    // Acoustic distress formula based on speech rate, pitch jitter, energy drop, and pauses
    const rateDistress = (voiceMetrics.speech_rate_wpm < 95 || voiceMetrics.speech_rate_wpm > 175) ? 25 : 5
    const pitchJitterDistress = Math.min(30, (voiceMetrics.pitch_variation_hz / 50) * 30)
    const pauseDistress = Math.min(25, voiceMetrics.pause_duration_ratio * 50)
    const energyDrop = voiceMetrics.energy_level < 35 ? 20 : 0

    voiceDistressScore = Math.min(100, Math.round(rateDistress + pitchJitterDistress + pauseDistress + energyDrop))
    speechStressDetected = voiceDistressScore > 45
  }

  // Composite Stress Vulnerability Index (SVI)
  const textWeight = voiceMetrics ? 0.45 : 0.75
  const voiceWeight = voiceMetrics ? 0.40 : 0
  const clinicalWeight = 0.15

  const normalizedClinical = (clinicalAnswersScore / 20) * 100

  const compositeRaw = (
    ((textAnalysis.traumaScore + textAnalysis.fearScore + textAnalysis.anxietyScore) / 3) * textWeight +
    voiceDistressScore * voiceWeight +
    normalizedClinical * (voiceMetrics ? clinicalWeight : 0.25)
  )

  let finalSVI = Math.min(100, Math.round(compositeRaw))

  // Boost for critical indicators
  if (textAnalysis.suicidalFlag) finalSVI = Math.max(88, finalSVI)
  if (textAnalysis.intimidationFlag && textAnalysis.fearScore > 60) finalSVI = Math.max(72, finalSVI)

  let riskLevel: RiskLevel = 'Low'
  if (finalSVI >= 75 || textAnalysis.suicidalFlag) {
    riskLevel = 'Critical'
  } else if (finalSVI >= 50) {
    riskLevel = 'High'
  } else if (finalSVI >= 25) {
    riskLevel = 'Moderate'
  }

  // Build actionable recommendations based on problem statement
  const recommendedActions: string[] = []
  if (riskLevel === 'Critical') {
    recommendedActions.push('Immediate Emergency Police Intervention & Protection')
    recommendedActions.push('Urgent Psychological Crisis Counselling (Within 15 mins)')
    recommendedActions.push('District Magistrate / Nodal Atrocity Cell Notification')
    recommendedActions.push('Medical Emergency & Physical Safety Verification')
  } else if (riskLevel === 'High') {
    recommendedActions.push('Assigned Dedicated Trauma Counsellor (Within 2 hours)')
    recommendedActions.push('Free Legal Aid Cell (NALSA / SLSA Advocate Appointment)')
    recommendedActions.push('Local Police Station Station House Officer (SHO) Alert')
    recommendedActions.push('Witness Protection Assessment')
  } else if (riskLevel === 'Moderate') {
    recommendedActions.push('Scheduled Tele-Counselling Session within 24 Hours')
    recommendedActions.push('Guidance on Filing SC/ST PoA Act FIR & Portal Redressal')
    recommendedActions.push('Community Support & Welfare Officer Allocation')
  } else {
    recommendedActions.push('Self-Guided Coping & Grounding Exercises')
    recommendedActions.push('Informational Legal Brochure & Rights Guide')
    recommendedActions.push('Follow-up Check-in in 48 Hours')
  }

  return {
    id: `SA-${Date.now().toString().slice(-6)}`,
    case_id: '',
    svi_score: finalSVI,
    risk_level: riskLevel,
    trauma_score: textAnalysis.traumaScore,
    fear_score: textAnalysis.fearScore,
    anxiety_score: textAnalysis.anxietyScore,
    depression_indicator: finalSVI > 55 || textAnalysis.traumaScore > 65,
    suicidal_ideation_flag: textAnalysis.suicidalFlag,
    intimidation_flag: textAnalysis.intimidationFlag,
    social_isolation_flag: textAnalysis.socialIsolationFlag,
    speech_stress_detected: speechStressDetected,
    key_trauma_triggers: textAnalysis.triggers,
    recommended_actions: recommendedActions,
    assessed_at: new Date().toISOString()
  }
}
