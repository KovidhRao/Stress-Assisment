import { OfficerProfile, RiskLevel, StressAssessment, VoiceAnalysisMetrics } from '@/types'

// Key emotional and trauma triggers in English and Indian transliterated terms
const CRITICAL_KEYWORDS = [
  'kill', 'murder', 'suicide', 'die', 'threat to life', 'mar denge', 'jaan se marne',
  'burn', 'acid', 'rape', 'gang rape', 'weapon', 'talwar', 'bandook', 'gun', 'hanging', 'no hope',
  'saavina', 'kollu', 'chavu', 'kolai', 'maran', 'maar dalna', 'chaku', 'hathyar'
]

const INTIMIDATION_KEYWORDS = [
  'threat', 'threatened', 'dhamki', 'dar', 'terror', 'boycott', 'social boycott',
  'expelled', 'hata diya', 'pani band', 'ousted', 'basti', 'caste slur', 'jaati',
  'dalit', 'adivasi', 'untouchable', 'oppression', 'forced', 'kidnap',
  'bahiskara', 'bedarike', 'kulabhasti', 'jaati nindane', 'theendedadhavan', 'jaathiya'
]

const TRAUMA_KEYWORDS = [
  'crying', 'nightmare', 'shaking', 'trembling', 'anxious', 'can\'t sleep', 'panic',
  'beaten', 'injury', 'blood', 'hospital', 'pain', 'broken', 'helpless', 'fear', 'alone',
  'ghabrahat', 'dard', 'rone laga', 'chot', 'bhaya', 'alugai', 'kanniru', 'bedarike'
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
  const lower = (text || '').toLowerCase()
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
      if (['suicide', 'die', 'marne', 'no hope', 'hanging', 'saavina', 'chavu'].includes(kw)) {
        suicidalFlag = true
      }
    }
  })

  INTIMIDATION_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      intimidationMatches++
      detectedTriggers.push(kw)
      intimidationFlag = true
      if (['boycott', 'social boycott', 'pani band', 'ousted', 'expelled', 'bahiskara'].includes(kw)) {
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
  let traumaScore = Math.min(100, Math.round(traumaMatches * 24 + criticalMatches * 32 + (text.length > 50 ? 15 : 5)))
  let fearScore = Math.min(100, Math.round(intimidationMatches * 26 + (intimidationFlag ? 20 : 0) + criticalMatches * 22))
  let anxietyScore = Math.min(100, Math.round(traumaMatches * 20 + intimidationMatches * 16 + (text.length > 100 ? 15 : 0)))

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
  if (textAnalysis.intimidationFlag && textAnalysis.fearScore > 60) finalSVI = Math.max(74, finalSVI)

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

/**
 * Proximity-based Officer Matching Engine:
 * When a high/critical SVI case occurs, routes directly to the officer situated closest to the victim's location.
 */
export function findNearestOfficer(
  officers: OfficerProfile[],
  victimLocation: {
    state?: string
    district?: string
    village_town_city?: string
    pincode?: string
  }
): {
  officer: OfficerProfile
  matchLevel: 'pincode' | 'district' | 'state' | 'national_hq'
  routingReason: string
} {
  if (!officers || officers.length === 0) {
    throw new Error('No officers available for proximity routing.')
  }

  const vPincode = (victimLocation.pincode || '').trim()
  const vDistrict = (victimLocation.district || '').trim().toLowerCase()
  const vState = (victimLocation.state || '').trim().toLowerCase()
  const vCity = (victimLocation.village_town_city || '').trim().toLowerCase()

  // 1. Check Exact Pincode Match
  if (vPincode) {
    const pinMatch = officers.find(o => 
      o.jurisdiction_pincodes && o.jurisdiction_pincodes.includes(vPincode)
    )
    if (pinMatch) {
      return {
        officer: pinMatch,
        matchLevel: 'pincode',
        routingReason: `Exact postal zone match (${vPincode}) at ${pinMatch.station_name || pinMatch.assigned_district}`
      }
    }
  }

  // 2. Check District Match
  if (vDistrict || vCity) {
    const districtMatch = officers.find(o => {
      const oDistrict = (o.assigned_district || '').toLowerCase()
      return (
        (vDistrict && oDistrict.includes(vDistrict)) ||
        (vDistrict && vDistrict.includes(oDistrict)) ||
        (vCity && oDistrict.includes(vCity))
      )
    })
    if (districtMatch) {
      return {
        officer: districtMatch,
        matchLevel: 'district',
        routingReason: `Jurisdiction District match: ${districtMatch.assigned_district}, ${districtMatch.assigned_state}`
      }
    }
  }

  // 3. Check State Match
  if (vState) {
    const stateMatch = officers.find(o => {
      const oState = (o.assigned_state || '').toLowerCase()
      return oState.includes(vState) || vState.includes(oState)
    })
    if (stateMatch) {
      return {
        officer: stateMatch,
        matchLevel: 'state',
        routingReason: `State Territorial Jurisdiction: ${stateMatch.assigned_state}`
      }
    }
  }

  // 4. Fallback to least loaded active officer or National HQ
  const sorted = [...officers].sort((a, b) => (a.active_cases_count || 0) - (b.active_cases_count || 0))
  const fallback = sorted[0] || officers[0]
  return {
    officer: fallback,
    matchLevel: 'national_hq',
    routingReason: `Assigned to Nodal Special Officer (${fallback.station_name || fallback.assigned_state}) based on availability.`
  }
}

/**
 * Dynamically generate tailored Wellbeing Journey stages & recommendations based on the user's latest story SVI and NLP sentiment.
 */
export function generateDynamicWellbeingJourney(
  narrativeText: string,
  sviScore: number,
  triggers: string[] = []
) {
  const isHigh = sviScore >= 50
  const isCritical = sviScore >= 75

  return {
    sviScore,
    stageTitle: isCritical 
      ? 'Emergency Stabilization & Safe Harbor' 
      : isHigh 
      ? 'Trauma Processing & Legal Safeguards' 
      : 'Restorative Care & Emotional Grounding',
    resilienceScore: Math.max(18, 100 - sviScore),
    keyFocus: isCritical 
      ? 'Immediate 24/7 security watch, hotline trauma de-escalation, and family safety shelter.'
      : isHigh
      ? 'Tele-consultation with verified psychiatrist, SC/ST legal aid assignment, and stress reduction exercises.'
      : 'Daily breathing routines, community support circles, and mindful journaling.',
    actionSteps: [
      {
        id: 'step-1',
        title: isHigh ? 'Priority Tele-Triage & Safety Call' : 'Daily Breathwork & Box Grounding',
        status: 'In Progress',
        timeframe: isCritical ? 'Within 15 minutes' : isHigh ? 'Within 2 hours' : 'Self-paced'
      },
      {
        id: 'step-2',
        title: isHigh ? 'Local SHO Protection Unit Notification' : 'Join Community Healing Circle',
        status: isHigh ? 'Dispatched' : 'Available',
        timeframe: 'Same day'
      },
      {
        id: 'step-3',
        title: 'Trauma Narrative Resolution & Follow-up',
        status: 'Scheduled',
        timeframe: 'In 48 hours'
      }
    ]
  }
}

