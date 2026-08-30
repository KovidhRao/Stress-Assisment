/**
 * lib/__tests__/recommendation-engine.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Recommendation Engine Unit Tests
 *
 * Tests situation classification + gate state → intervention pathway selection.
 * Ensures critical cases (HUMAN_REVIEW, SAFETY_PATHWAY) NEVER receive a game path.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { recommendIntervention } from '../recommendation-engine'
import { StressAssessment, SafetyGateDecision } from '@/types'

const makeAssessment = (overrides: Partial<StressAssessment>): StressAssessment => ({
  id: 'SA-REC-TEST',
  case_id: 'CASE-REC-TEST',
  svi_score: 15,
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

describe('Recommendation Engine — Situation & Gate Adaptive Selection', () => {

  test('Academic Stress + Low Gate → FOCUS_JOURNEY', () => {
    const assessment = makeAssessment({
      situation: 'ACADEMIC_STRESS',
      risk_level: 'Low',
      svi_score: 15
    })
    const res = recommendIntervention('WELLBEING', assessment)
    expect(res.path).toBe('FOCUS_JOURNEY')
    expect(res.gameAllowed).toBe(true)
    expect(res.label).toBe('Focus Journey')
  })

  test('Work Stress + Low Gate → FOCUS_JOURNEY', () => {
    const assessment = makeAssessment({
      situation: 'WORK_STRESS',
      risk_level: 'Low',
      svi_score: 18
    })
    const res = recommendIntervention('WELLBEING', assessment)
    expect(res.path).toBe('FOCUS_JOURNEY')
    expect(res.gameAllowed).toBe(true)
  })

  test('General Anxiety + Low Gate → CALM_GARDEN', () => {
    const assessment = makeAssessment({
      situation: 'ANXIETY',
      risk_level: 'Low',
      svi_score: 20
    })
    const res = recommendIntervention('WELLBEING', assessment)
    expect(res.path).toBe('CALM_GARDEN')
    expect(res.gameAllowed).toBe(true)
    expect(res.label).toBe('Calm Garden')
  })

  test('High Anxiety Score (> 0.45) + Low Gate → CALM_GARDEN', () => {
    const assessment = makeAssessment({
      situation: 'UNKNOWN',
      indicators: { anxiety: 0.6 } as any,
      risk_level: 'Low',
      svi_score: 22
    })
    const res = recommendIntervention('WELLBEING', assessment)
    expect(res.path).toBe('CALM_GARDEN')
    expect(res.gameAllowed).toBe(true)
  })

  test('Moderate Distress + SUPPORT Gate → GROUNDING_JOURNEY', () => {
    const assessment = makeAssessment({
      situation: 'FAMILY_STRESS',
      risk_level: 'Moderate',
      svi_score: 40
    })
    const res = recommendIntervention('SUPPORT', assessment)
    expect(res.path).toBe('GROUNDING_JOURNEY')
    expect(res.gameAllowed).toBe(true)
    expect(res.label).toBe('Grounding Journey')
  })

  test('Threat + High Gate (HUMAN_REVIEW) → HUMAN_REVIEW (gameAllowed = FALSE)', () => {
    const assessment = makeAssessment({
      situation: 'THREAT',
      risk_level: 'High',
      svi_score: 65,
      intimidation_flag: true
    })
    const res = recommendIntervention('HUMAN_REVIEW', assessment)
    expect(res.path).toBe('HUMAN_REVIEW')
    expect(res.gameAllowed).toBe(false)
  })

  test('Critical Gate (SAFETY_PATHWAY) → SAFETY_PATHWAY (gameAllowed = FALSE)', () => {
    const assessment = makeAssessment({
      situation: 'IMMEDIATE_DANGER',
      risk_level: 'Critical',
      svi_score: 85,
      suicidal_ideation_flag: true
    })
    const res = recommendIntervention('SAFETY_PATHWAY', assessment)
    expect(res.path).toBe('SAFETY_PATHWAY')
    expect(res.gameAllowed).toBe(false)
  })

  test('CRITICAL RULE: High/Critical cases must NEVER enter a normal wellbeing game', () => {
    const highGates: SafetyGateDecision[] = ['HUMAN_REVIEW', 'SAFETY_PATHWAY']
    const situations = ['ACADEMIC_STRESS', 'ANXIETY', 'FAMILY_STRESS', 'WORK_STRESS']

    highGates.forEach(gate => {
      situations.forEach(situation => {
        const assessment = makeAssessment({ situation, risk_level: gate === 'HUMAN_REVIEW' ? 'High' : 'Critical' })
        const res = recommendIntervention(gate, assessment)
        expect(res.gameAllowed).toBe(false)
        expect(res.path).not.toBe('FOCUS_JOURNEY')
        expect(res.path).not.toBe('CALM_GARDEN')
        expect(res.path).not.toBe('GROUNDING_JOURNEY')
      })
    })
  })
})
