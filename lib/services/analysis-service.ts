import { CaseAnalysisResult, RiskLevel, VoiceAnalysisMetrics } from '@/types'
import { computeSVI, computeComprehensiveNLP } from '@/lib/svi-engine'

/**
 * Interface definition for pluggable ML/NLP Mental Condition Analysis Providers.
 * When the ML model is deployed, simply switch the provider implementation.
 */
export interface IAnalysisProvider {
  name: string
  version: string
  analyze(
    narrativeText: string,
    voiceMetrics?: VoiceAnalysisMetrics | null,
    clinicalScore?: number
  ): Promise<CaseAnalysisResult>
}

// ─── 1. Real NLP + SVI Engine Provider (Production) ─────────────────────────

export class RealNLPAnalysisProvider implements IAnalysisProvider {
  name = 'NHAA-Multilingual-NLP-SVI-Engine'
  version = 'v2.0.0'

  async analyze(
    narrativeText: string,
    voiceMetrics?: VoiceAnalysisMetrics | null,
    clinicalScore: number = 0
  ): Promise<CaseAnalysisResult> {
    // Use the real SVI engine with full NLP + voice integration
    const assessment = computeSVI(narrativeText, voiceMetrics, clinicalScore)
    const nlpDetail = computeComprehensiveNLP(narrativeText, assessment.speech_stress_detected ? 50 : 0)

    // Map NLP contributing factors to detected conditions
    const detectedConditions: string[] = []
    if (assessment.suicidal_ideation_flag) detectedConditions.push('Acute Suicidal Risk')
    if (assessment.intimidation_flag) detectedConditions.push('Severe Intimidation')
    if (assessment.social_isolation_flag) detectedConditions.push('Social Boycott / Ostracization')
    if (assessment.speech_stress_detected) detectedConditions.push('Acoustic Vocal Tremor & Speech Distress')
    if (assessment.depression_indicator) detectedConditions.push('Depression / Severe Helplessness')
    if (assessment.trauma_score > 50) detectedConditions.push('Acute Trauma & Shock Response')
    if (detectedConditions.length === 0) detectedConditions.push('General Stress')

    return {
      svi_score: assessment.svi_score,
      risk_level: assessment.risk_level,
      detected_conditions: detectedConditions,
      confidence: nlpDetail.confidence,
      fear_score: assessment.fear_score,
      trauma_score: assessment.trauma_score,
      anxiety_score: assessment.anxiety_score,
      key_triggers: assessment.key_trauma_triggers,
      recommendations: assessment.recommended_actions,
      model_version: this.version,
      analyzed_at: new Date().toISOString()
    }
  }
}

// ─── 2. Mock Fallback Provider (Development / Offline) ──────────────────────

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

export class MockAnalysisProvider implements IAnalysisProvider {
  name = 'MockNLP-KeywordAndAcoustics'
  version = 'v1.2.0'

  async analyze(
    narrativeText: string,
    voiceMetrics?: VoiceAnalysisMetrics | null,
    clinicalScore: number = 0
  ): Promise<CaseAnalysisResult> {
    const lower = (narrativeText || '').toLowerCase()
    const detectedTriggers: string[] = []
    const detectedConditions: string[] = []

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
          detectedConditions.push('Acute Suicidal Risk')
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
          detectedConditions.push('Social Boycott / Ostracization')
        }
      }
    })

    TRAUMA_KEYWORDS.forEach(kw => {
      if (lower.includes(kw)) {
        traumaMatches++
        detectedTriggers.push(kw)
      }
    })

    if (traumaMatches > 0) detectedConditions.push('Acute Anxiety & Trauma')
    if (intimidationFlag) detectedConditions.push('Severe Intimidation')

    // Normalize emotional sub-scores 0 - 100
    const traumaScore = Math.min(100, Math.round(traumaMatches * 24 + criticalMatches * 32 + (narrativeText.length > 50 ? 15 : 5)))
    const fearScore = Math.min(100, Math.round(intimidationMatches * 26 + (intimidationFlag ? 20 : 0) + criticalMatches * 22))
    const anxietyScore = Math.min(100, Math.round(traumaMatches * 20 + intimidationMatches * 16 + (narrativeText.length > 100 ? 15 : 0)))

    // Acoustic distress calculation
    let voiceDistressScore = 0
    if (voiceMetrics) {
      const rateDistress = (voiceMetrics.speech_rate_wpm < 95 || voiceMetrics.speech_rate_wpm > 175) ? 25 : 5
      const pitchJitterDistress = Math.min(30, (voiceMetrics.pitch_variation_hz / 50) * 30)
      const pauseDistress = Math.min(25, voiceMetrics.pause_duration_ratio * 50)
      const energyDrop = voiceMetrics.energy_level < 35 ? 20 : 0

      voiceDistressScore = Math.min(100, Math.round(rateDistress + pitchJitterDistress + pauseDistress + energyDrop))
      if (voiceDistressScore > 50) {
        detectedConditions.push('Acoustic Vocal Tremor & Speech Distress')
      }
    }

    // Composite Stress Vulnerability Index (SVI)
    const textWeight = voiceMetrics ? 0.45 : 0.75
    const voiceWeight = voiceMetrics ? 0.40 : 0
    const clinicalWeight = 0.15

    const normalizedClinical = (clinicalScore / 20) * 100
    const compositeRaw = (
      ((traumaScore + fearScore + anxietyScore) / 3) * textWeight +
      voiceDistressScore * voiceWeight +
      normalizedClinical * (voiceMetrics ? clinicalWeight : 0.25)
    )

    let finalSVI = Math.min(100, Math.round(compositeRaw))
    if (suicidalFlag) finalSVI = Math.max(88, finalSVI)
    if (intimidationFlag && fearScore > 60) finalSVI = Math.max(74, finalSVI)
    if (narrativeText.trim().length === 0 && !voiceMetrics) finalSVI = 22

    let riskLevel: RiskLevel = 'Low'
    if (finalSVI >= 75 || suicidalFlag) {
      riskLevel = 'Critical'
    } else if (finalSVI >= 50) {
      riskLevel = 'High'
    } else if (finalSVI >= 25) {
      riskLevel = 'Moderate'
    }

    const recommendations: string[] = []
    if (riskLevel === 'Critical') {
      recommendations.push('Immediate Emergency Police Intervention & Protection')
      recommendations.push('Urgent Psychological Crisis Counselling (Within 15 mins)')
      recommendations.push('District Magistrate / Nodal Atrocity Cell Notification')
      recommendations.push('Medical Emergency & Physical Safety Verification')
    } else if (riskLevel === 'High') {
      recommendations.push('Assigned Dedicated Trauma Counsellor (Within 2 hours)')
      recommendations.push('Free Legal Aid Cell (NALSA / SLSA Advocate Appointment)')
      recommendations.push('Local Police Station Station House Officer (SHO) Alert')
      recommendations.push('Witness Protection Assessment')
    } else if (riskLevel === 'Moderate') {
      recommendations.push('Scheduled Tele-Counselling Session within 24 Hours')
      recommendations.push('Guidance on Filing SC/ST PoA Act FIR & Portal Redressal')
      recommendations.push('Community Support & Welfare Officer Allocation')
    } else {
      recommendations.push('Self-Guided Coping & Grounding Exercises')
      recommendations.push('Informational Legal Brochure & Rights Guide')
      recommendations.push('Follow-up Check-in in 48 Hours')
    }

    return {
      svi_score: finalSVI,
      risk_level: riskLevel,
      detected_conditions: detectedConditions.length > 0 ? detectedConditions : ['General Stress'],
      confidence: 0.92,
      fear_score: fearScore,
      trauma_score: traumaScore,
      anxiety_score: anxietyScore,
      key_triggers: Array.from(new Set(detectedTriggers)),
      recommendations,
      model_version: this.version,
      analyzed_at: new Date().toISOString()
    }
  }
}

// ─── 3. Future ML/NLP Microservice Adapter (Ready for plug-in) ───────────────

export class FutureMLAnalysisProvider implements IAnalysisProvider {
  name = 'DistilBERT-Trauma-NLP-Server'
  version = 'v2.0.0-ml'
  private apiEndpoint = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000/api/analyze'

  async analyze(
    narrativeText: string,
    voiceMetrics?: VoiceAnalysisMetrics | null,
    clinicalScore: number = 0
  ): Promise<CaseAnalysisResult> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: narrativeText,
          voice_metrics: voiceMetrics,
          clinical_score: clinicalScore
        })
      })

      if (!response.ok) {
        throw new Error(`ML server returned HTTP ${response.status}`)
      }

      const data = await response.json()
      return {
        svi_score: data.svi_score ?? 65,
        risk_level: data.risk_level ?? 'Moderate',
        detected_conditions: data.detected_conditions ?? ['Stress'],
        confidence: data.confidence ?? 0.89,
        fear_score: data.fear_score ?? 50,
        trauma_score: data.trauma_score ?? 50,
        anxiety_score: data.anxiety_score ?? 50,
        key_triggers: data.key_triggers ?? [],
        recommendations: data.recommendations ?? [],
        model_version: this.version,
        analyzed_at: new Date().toISOString()
      }
    } catch (err) {
      console.warn('ML Service unreachable, falling back to real NLP provider:', err)
      return new RealNLPAnalysisProvider().analyze(narrativeText, voiceMetrics, clinicalScore)
    }
  }
}

// ─── 4. Unified Analysis Service ─────────────────────────────────────────────

class AnalysisServiceManager {
  private activeProvider: IAnalysisProvider = new RealNLPAnalysisProvider()

  public setProvider(provider: IAnalysisProvider) {
    this.activeProvider = provider
  }

  public async analyzeStory(
    text: string,
    voiceMetrics?: VoiceAnalysisMetrics | null,
    clinicalScore?: number
  ): Promise<CaseAnalysisResult> {
    return this.activeProvider.analyze(text, voiceMetrics, clinicalScore)
  }
}

export const AnalysisService = new AnalysisServiceManager()
