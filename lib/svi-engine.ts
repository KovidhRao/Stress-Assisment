import { OfficerProfile, RiskLevel, StressAssessment, VoiceAnalysisMetrics } from '@/types'
import { computeComprehensiveNLP, extractNLPIndicators } from './nlp-engine'

export { extractNLPIndicators, computeComprehensiveNLP }

export function analyzeNarrativeText(text: string) {
  const result = computeComprehensiveNLP(text)
  const allTriggers: string[] = []
  Object.values(result.matchedKeywords).forEach(list => list.forEach(k => allTriggers.push(k)))
  return {
    traumaScore: Math.round(result.indicators.trauma * 100),
    fearScore: Math.round(result.indicators.fear * 100),
    anxietyScore: Math.round(result.indicators.anxiety * 100),
    suicidalFlag: result.suicidalFlag,
    intimidationFlag: result.intimidationFlag,
    socialIsolationFlag: result.socialIsolationFlag,
    triggers: Array.from(new Set(allTriggers))
  }
}

export function computeSVI(
  narrativeText: string,
  voiceMetrics?: VoiceAnalysisMetrics | null,
  clinicalAnswersScore: number = 0 // from questionnaire if answered (0-20)
): StressAssessment {
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

  const nlpResult = computeComprehensiveNLP(narrativeText, voiceDistressScore)

  // Integrate clinical questionnaire if provided
  let finalSVI = nlpResult.sviScore
  if (clinicalAnswersScore > 0) {
    const clinicalContribution = (clinicalAnswersScore / 20) * 20
    finalSVI = Math.min(100, Math.round(finalSVI * 0.85 + clinicalContribution))
  }

  let riskLevel = nlpResult.riskLevel
  if (finalSVI >= 75 || nlpResult.suicidalFlag) {
    riskLevel = 'Critical'
  } else if (finalSVI >= 50) {
    riskLevel = 'High'
  } else if (finalSVI >= 25) {
    riskLevel = 'Moderate'
  } else {
    riskLevel = 'Low'
  }

  // Extract all matched triggers
  const allTriggers: string[] = []
  Object.values(nlpResult.matchedKeywords).forEach(kwList => {
    kwList.forEach(k => allTriggers.push(k))
  })

  return {
    id: `SA-${Date.now().toString().slice(-6)}`,
    case_id: '',
    svi_score: finalSVI,
    risk_level: riskLevel,
    trauma_score: Math.round(nlpResult.indicators.trauma * 100),
    fear_score: Math.round(nlpResult.indicators.fear * 100),
    anxiety_score: Math.round(nlpResult.indicators.anxiety * 100),
    depression_indicator: finalSVI > 55 || nlpResult.indicators.trauma > 0.65,
    suicidal_ideation_flag: nlpResult.suicidalFlag,
    intimidation_flag: nlpResult.intimidationFlag,
    social_isolation_flag: nlpResult.socialIsolationFlag,
    speech_stress_detected: speechStressDetected,
    key_trauma_triggers: Array.from(new Set(allTriggers)),
    recommended_actions: nlpResult.recommendedActions,
    assessed_at: new Date().toISOString(),
    situation: nlpResult.situation,
    situation_confidence: nlpResult.situationConfidence,
    indicators: nlpResult.indicators,
    confidence: nlpResult.confidence,
    contributing_factors: nlpResult.contributingFactors,
    detected_language: nlpResult.languageName,
    romanized: nlpResult.isRomanized,
    safety_escalation_applied: nlpResult.safetyEscalationApplied
  }
}

/**
 * Proximity-based Officer Matching Engine:
 * When a high/critical SVI case occurs, routes directly to the officer situated closest to the victim's location.
 */
const DEFAULT_FALLBACK_OFFICER: OfficerProfile = {
  id: 'OFF-NODAL-HQ',
  officer_badge_id: 'NHAA-HQ-99',
  full_name: 'Dr. Ramesh Chandra',
  department: 'Psychological Triage',
  role: 'counsellor',
  assigned_state: 'National HQ',
  assigned_district: 'Central Cell',
  station_name: 'National Atrocity Redressal HQ',
  active_cases_count: 0,
  email: 'triage@nhaa.gov.in',
  phone: '14566',
  is_available: true
}

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
    return {
      officer: DEFAULT_FALLBACK_OFFICER,
      matchLevel: 'national_hq',
      routingReason: 'Assigned to National Atrocity Redressal & Triage HQ (14566 Helpline).'
    }
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

