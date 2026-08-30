/**
 * lib/safety-gate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Day 4 — Single source-of-truth Safety Gate
 *
 * This is the ONLY place in the codebase that maps a StressAssessment
 * (or a bare RiskLevel for fallback paths) to one of 4 gate states.
 *
 * UI components MUST read the gate result — they must NOT re-check risk_level
 * locally. This prevents the "5 components, 5 slightly different rules" drift
 * bug documented in the Day 4 spec.
 *
 * Gate states:
 *   WELLBEING      — Low risk. Bubble game + box breathing allowed.
 *   SUPPORT        — Moderate. Grounding exercise + psychiatrist booking.
 *   HUMAN_REVIEW   — High. Psychiatrist card + officer card; game blocked.
 *   SAFETY_PATHWAY — Critical or suicidal ideation. SOS-forward; game hard-blocked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { RiskLevel, StressAssessment } from '@/types'

// ─── Exported Types ──────────────────────────────────────────────────────────

export type SafetyGateDecision =
  | 'WELLBEING'
  | 'SUPPORT'
  | 'HUMAN_REVIEW'
  | 'SAFETY_PATHWAY'

export interface SafetyGateResult {
  /** Which of the 4 pathways to render */
  gate: SafetyGateDecision
  /** Whether the bubble game / breathing widget may be shown */
  gameAllowed: boolean
  /**
   * Human-readable explanation appended to the triage note so officers
   * (Day 5 dashboard) can see why the system routed the case here —
   * without re-deriving it.
   */
  reason: string
}

// ─── Core Gate Function ───────────────────────────────────────────────────────

/**
 * safetyGate — maps a full StressAssessment to a SafetyGateResult.
 *
 * Hard overrides are checked first and can never be downgraded:
 *   1. suicidal_ideation_flag → SAFETY_PATHWAY regardless of svi_score
 *   2. intimidation_flag AND fear_score > 70 → SAFETY_PATHWAY
 *
 * Otherwise the raw risk_level drives the gate.
 */
export function safetyGate(assessment: StressAssessment): SafetyGateResult {
  // ── Hard override 1: suicidal ideation ──────────────────────────────────
  if (assessment.suicidal_ideation_flag) {
    return {
      gate: 'SAFETY_PATHWAY',
      gameAllowed: false,
      reason:
        'SAFETY_PATHWAY (override): Suicidal ideation flag detected. Immediate escalation — 14566 Helpline + iCall + on-call psychiatrist notified. Wellbeing game hard-blocked.'
    }
  }

  // ── Hard override 2: credible intimidation + high fear ──────────────────
  if (assessment.intimidation_flag && (assessment.fear_score ?? 0) > 70) {
    return {
      gate: 'SAFETY_PATHWAY',
      gameAllowed: false,
      reason:
        `SAFETY_PATHWAY (override): Active intimidation flag with fear score ${assessment.fear_score}/100 (>70 threshold). Physical safety at risk — officer escort and safe-house protocols activated.`
    }
  }

  // ── Risk-level routing ───────────────────────────────────────────────────
  switch (assessment.risk_level) {
    case 'Critical':
      return {
        gate: 'SAFETY_PATHWAY',
        gameAllowed: false,
        reason:
          `SAFETY_PATHWAY: SVI ${assessment.svi_score}/100 (Critical >=75). Immediate escalation — case forwarded to on-call psychiatrist and nodal officer. Wellbeing game hard-blocked.`
      }

    case 'High':
      return {
        gate: 'HUMAN_REVIEW',
        gameAllowed: false,
        reason:
          `HUMAN_REVIEW: SVI ${assessment.svi_score}/100 (High >=50). Priority human review — psychiatrist tele-consultation and officer assignment dispatched. Wellbeing game blocked pending clinical clearance.`
      }

    case 'Moderate':
      return {
        gate: 'SUPPORT',
        gameAllowed: true,
        reason:
          `SUPPORT: SVI ${assessment.svi_score}/100 (Moderate >=25). Assigned to psychiatrist for tele-consultation. Grounding exercise (5-4-3-2-1) and support resources unlocked.`
      }

    case 'Low':
    default:
      return {
        gate: 'WELLBEING',
        gameAllowed: true,
        reason:
          `WELLBEING: SVI ${assessment.svi_score}/100 (Low <25). Wellbeing journey with breathing + bubble game + self-care resources enabled.`
      }
  }
}

// ─── Fallback — bare RiskLevel only (for demo toggles, UI-only contexts) ─────

/**
 * safetyGateFromRiskLevel — lightweight fallback for components or demo toggles
 * that only have a bare RiskLevel, not a full StressAssessment.
 *
 * NOTE: Hard overrides (suicidal_ideation_flag, intimidation_flag) cannot be
 * checked here. Always prefer safetyGate(assessment) when the full object is
 * available.
 */
export function safetyGateFromRiskLevel(riskLevel: RiskLevel): SafetyGateResult {
  switch (riskLevel) {
    case 'Critical':
      return {
        gate: 'SAFETY_PATHWAY',
        gameAllowed: false,
        reason: 'SAFETY_PATHWAY: Critical risk level — immediate escalation.'
      }
    case 'High':
      return {
        gate: 'HUMAN_REVIEW',
        gameAllowed: false,
        reason: 'HUMAN_REVIEW: High risk level — priority human review.'
      }
    case 'Moderate':
      return {
        gate: 'SUPPORT',
        gameAllowed: true,
        reason: 'SUPPORT: Moderate risk level — grounding + psychiatrist resources.'
      }
    case 'Low':
    default:
      return {
        gate: 'WELLBEING',
        gameAllowed: true,
        reason: 'WELLBEING: Low risk level — wellbeing journey enabled.'
      }
  }
}
