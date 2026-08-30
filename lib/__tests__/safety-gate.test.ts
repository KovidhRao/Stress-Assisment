/**
 * lib/__tests__/safety-gate.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Day 4 Safety Gate — Unit Tests
 *
 * Covers all 4 fixtures from the spec + hard-override edge cases.
 * Run with:  npx jest lib/__tests__/safety-gate.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { safetyGate, safetyGateFromRiskLevel } from '../safety-gate'
import { StressAssessment } from '@/types'

// ─── Helper ──────────────────────────────────────────────────────────────────
const makeAssessment = (overrides: Partial<StressAssessment>): StressAssessment => ({
  id: 'SA-TEST',
  case_id: 'CASE-TEST',
  svi_score: 10,
  risk_level: 'Low',
  trauma_score: 0,
  fear_score: 0,
  anxiety_score: 0,
  depression_indicator: false,
  suicidal_ideation_flag: false,
  intimidation_flag: false,
  social_isolation_flag: false,
  speech_stress_detected: false,
  key_trauma_triggers: [],
  recommended_actions: [],
  assessed_at: new Date().toISOString(),
  ...overrides
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: The 4 core fixtures from the Day 4 spec (§5)
// ─────────────────────────────────────────────────────────────────────────────

describe('Safety Gate — Core Fixtures (Day 4 Spec §5)', () => {
  test('FIXTURE LOW: "exams tomorrow, a bit stressed" → WELLBEING, gameAllowed: true', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 12,
      risk_level: 'Low'
    }))
    expect(result.gate).toBe('WELLBEING')
    expect(result.gameAllowed).toBe(true)
    expect(result.reason).toMatch(/WELLBEING/i)
  })

  test('FIXTURE MODERATE: "overwhelmed for weeks, cant sleep" → SUPPORT, gameAllowed: true', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 38,
      risk_level: 'Moderate'
    }))
    expect(result.gate).toBe('SUPPORT')
    expect(result.gameAllowed).toBe(true)
    expect(result.reason).toMatch(/SUPPORT/i)
  })

  test('FIXTURE HIGH: "threatened family, dhamki de rahe hain" → HUMAN_REVIEW, gameAllowed: false', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 62,
      risk_level: 'High',
      intimidation_flag: true,
      fear_score: 55  // below 70 so no hard override; routes via risk_level
    }))
    expect(result.gate).toBe('HUMAN_REVIEW')
    expect(result.gameAllowed).toBe(false)
    expect(result.reason).toMatch(/HUMAN_REVIEW/i)
  })

  test('FIXTURE CRITICAL: "no hope left, feel like ending it" → SAFETY_PATHWAY, gameAllowed: false', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 85,
      risk_level: 'Critical',
      suicidal_ideation_flag: true
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
    expect(result.gameAllowed).toBe(false)
    expect(result.reason).toMatch(/SAFETY_PATHWAY/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: gameAllowed is FALSE for both High AND Critical
// (confirms game is blocked before Priority Human Review, not just Safety Pathway)
// ─────────────────────────────────────────────────────────────────────────────

describe('Safety Gate — gameAllowed enforcement', () => {
  test('gameAllowed is TRUE for Low', () => {
    expect(safetyGate(makeAssessment({ risk_level: 'Low', svi_score: 10 })).gameAllowed).toBe(true)
  })

  test('gameAllowed is TRUE for Moderate', () => {
    expect(safetyGate(makeAssessment({ risk_level: 'Moderate', svi_score: 35 })).gameAllowed).toBe(true)
  })

  test('gameAllowed is FALSE for High', () => {
    expect(safetyGate(makeAssessment({ risk_level: 'High', svi_score: 60 })).gameAllowed).toBe(false)
  })

  test('gameAllowed is FALSE for Critical', () => {
    expect(safetyGate(makeAssessment({ risk_level: 'Critical', svi_score: 80 })).gameAllowed).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Hard overrides (must fire regardless of raw svi_score/risk_level)
// ─────────────────────────────────────────────────────────────────────────────

describe('Safety Gate — Hard Overrides', () => {
  test('suicidal_ideation_flag forces SAFETY_PATHWAY even if risk_level is only High', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 60,
      risk_level: 'High',   // raw score = High, but flag should override to Critical path
      suicidal_ideation_flag: true
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
    expect(result.gameAllowed).toBe(false)
    expect(result.reason).toMatch(/suicidal/i)
  })

  test('suicidal_ideation_flag forces SAFETY_PATHWAY even if risk_level is only Moderate', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 35,
      risk_level: 'Moderate',
      suicidal_ideation_flag: true
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
    expect(result.gameAllowed).toBe(false)
  })

  test('suicidal_ideation_flag forces SAFETY_PATHWAY even if risk_level is Low', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 10,
      risk_level: 'Low',
      suicidal_ideation_flag: true
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
    expect(result.gameAllowed).toBe(false)
  })

  test('intimidation_flag + fear_score > 70 forces SAFETY_PATHWAY from Moderate', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 40,
      risk_level: 'Moderate',
      intimidation_flag: true,
      fear_score: 85
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
    expect(result.gameAllowed).toBe(false)
    expect(result.reason).toMatch(/intimidation/i)
  })

  test('intimidation_flag ALONE (no high fear) does NOT override — routes normally', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 40,
      risk_level: 'Moderate',
      intimidation_flag: true,
      fear_score: 30  // below 70 threshold
    }))
    expect(result.gate).toBe('SUPPORT')  // normal Moderate path
  })

  test('fear_score > 70 ALONE (no intimidation_flag) does NOT override', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 40,
      risk_level: 'Moderate',
      intimidation_flag: false,
      fear_score: 90
    }))
    expect(result.gate).toBe('SUPPORT')  // normal Moderate path
  })

  test('boundary: fear_score exactly 70 with intimidation does NOT trigger override (> 70 required)', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 40,
      risk_level: 'Moderate',
      intimidation_flag: true,
      fear_score: 70  // the condition is > 70, not >= 70
    }))
    expect(result.gate).toBe('SUPPORT')
  })

  test('boundary: fear_score 71 with intimidation DOES trigger override', () => {
    const result = safetyGate(makeAssessment({
      svi_score: 40,
      risk_level: 'Moderate',
      intimidation_flag: true,
      fear_score: 71
    }))
    expect(result.gate).toBe('SAFETY_PATHWAY')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Fallback function — safetyGateFromRiskLevel
// ─────────────────────────────────────────────────────────────────────────────

describe('safetyGateFromRiskLevel — fallback function', () => {
  const cases: Array<[string, string, boolean]> = [
    ['Low',      'WELLBEING',      true],
    ['Moderate', 'SUPPORT',        true],
    ['High',     'HUMAN_REVIEW',   false],
    ['Critical', 'SAFETY_PATHWAY', false]
  ]

  test.each(cases)(
    'risk_level %s → gate %s, gameAllowed %s',
    (riskLevel, expectedGate, expectedGameAllowed) => {
      const result = safetyGateFromRiskLevel(riskLevel as any)
      expect(result.gate).toBe(expectedGate)
      expect(result.gameAllowed).toBe(expectedGameAllowed)
    }
  )

  test('safetyGateFromRiskLevel matches safetyGate for all standard levels (no flags)', () => {
    const levels = ['Low', 'Moderate', 'High', 'Critical'] as const
    levels.forEach(level => {
      const fromFull = safetyGate(makeAssessment({ risk_level: level, svi_score: 30 }))
      const fromShortcut = safetyGateFromRiskLevel(level)
      expect(fromShortcut.gate).toBe(fromFull.gate)
      expect(fromShortcut.gameAllowed).toBe(fromFull.gameAllowed)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Reason strings — must always be non-empty and identify the gate
// ─────────────────────────────────────────────────────────────────────────────

describe('Safety Gate — reason strings (officer explainability)', () => {
  test('every gate produces a non-empty reason', () => {
    const levels = ['Low', 'Moderate', 'High', 'Critical'] as const
    levels.forEach(level => {
      const result = safetyGate(makeAssessment({ risk_level: level, svi_score: 30 }))
      expect(result.reason.length).toBeGreaterThan(10)
    })
  })

  test('reason includes SVI score for standard (non-override) routes', () => {
    const result = safetyGate(makeAssessment({ svi_score: 62, risk_level: 'High' }))
    expect(result.reason).toContain('62')
  })
})
