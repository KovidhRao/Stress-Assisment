/**
 * lib/recommendation-engine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Day 4 — Recommendation Engine
 *
 * Maps a StressAssessment (situation + gate + indicators + flags) to a
 * specific InterventionPath.  The Safety Gate is the outer guard (blocks game
 * for High/Critical).  The Recommendation Engine is the inner selector — it
 * picks WHICH wellbeing journey to run for Low and Moderate cases.
 *
 * Decision table:
 *  SAFETY_PATHWAY gate   → SAFETY_PATHWAY  (immediate escalation, no game)
 *  HUMAN_REVIEW gate     → HUMAN_REVIEW    (professional review, no game)
 *  SUPPORT gate (Mod.)   → GROUNDING_JOURNEY (5-sense grounding + check-in)
 *  WELLBEING gate (Low)
 *    situation = ACADEMIC_STRESS / WORK_STRESS / FINANCIAL_STRESS
 *                                  → FOCUS_JOURNEY
 *    situation = ANXIETY / GENERAL_ANXIETY / GRIEF / EMOTIONAL_DISTRESS
 *    OR anxiety indicator > 0.45   → CALM_GARDEN
 *    default                       → CALM_GARDEN  (safe fallback)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { InterventionPath, StressAssessment } from '@/types'
import { SafetyGateDecision } from '@/types'

// ─── Exported types ───────────────────────────────────────────────────────────

export interface RecommendationResult {
  /** The specific journey to launch */
  path: InterventionPath
  /** Short label shown to the user */
  label: string
  /** One-sentence explanation shown on the UI chip */
  rationale: string
  /** Whether any interactive game/tool may be shown */
  gameAllowed: boolean
}

// ─── Situations that map to FOCUS_JOURNEY ─────────────────────────────────────
const FOCUS_SITUATIONS = new Set([
  'ACADEMIC_STRESS',
  'WORK_STRESS',
  'FINANCIAL_STRESS',
])

// ─── Situations that map to CALM_GARDEN ──────────────────────────────────────
const CALM_GARDEN_SITUATIONS = new Set([
  'ANXIETY',
  'GENERAL_ANXIETY',
  'GRIEF',
  'EMOTIONAL_DISTRESS',
  'ISOLATION',
  'FEAR',
])

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * recommendIntervention — given a pre-computed gate decision and the full
 * StressAssessment, returns the specific InterventionPath to launch.
 *
 * Critical rule: SAFETY_PATHWAY and HUMAN_REVIEW gates can never be downgraded
 * to a game path — this function enforces that invariant explicitly.
 */
export function recommendIntervention(
  gate: SafetyGateDecision,
  assessment: StressAssessment
): RecommendationResult {
  // ── Non-game gates: pass through immediately ─────────────────────────────
  if (gate === 'SAFETY_PATHWAY') {
    return {
      path: 'SAFETY_PATHWAY',
      label: 'Safety Pathway',
      rationale: 'Immediate escalation — please contact the emergency helpline or your assigned officer.',
      gameAllowed: false,
    }
  }
  if (gate === 'HUMAN_REVIEW') {
    return {
      path: 'HUMAN_REVIEW',
      label: 'Priority Human Review',
      rationale: 'Your case requires clinical attention. A psychiatrist and officer have been notified.',
      gameAllowed: false,
    }
  }

  // ── SUPPORT gate (Moderate) → always Grounding Journey ───────────────────
  if (gate === 'SUPPORT') {
    return {
      path: 'GROUNDING_JOURNEY',
      label: 'Grounding Journey',
      rationale: 'A guided 5-sense grounding exercise to help you feel present and calm.',
      gameAllowed: true,
    }
  }

  // ── WELLBEING gate (Low) → situation-aware selection ─────────────────────
  const situation = (assessment.situation || '').toUpperCase().replace(/ /g, '_')
  const anxietyScore = assessment.indicators?.anxiety ?? 0

  if (FOCUS_SITUATIONS.has(situation)) {
    return {
      path: 'FOCUS_JOURNEY',
      label: 'Focus Journey',
      rationale: 'A structured micro-task flow to break down your stressor and restore a sense of control.',
      gameAllowed: true,
    }
  }

  if (CALM_GARDEN_SITUATIONS.has(situation) || anxietyScore > 0.45) {
    return {
      path: 'CALM_GARDEN',
      label: 'Calm Garden',
      rationale: 'Breathing + an interactive plant-growth animation to gently release anxiety.',
      gameAllowed: true,
    }
  }

  // Default for Low gate with unknown/unmatched situation
  return {
    path: 'CALM_GARDEN',
    label: 'Calm Garden',
    rationale: 'A gentle breathing and mindfulness exercise to restore calm.',
    gameAllowed: true,
  }
}

// ─── UI metadata for each path ────────────────────────────────────────────────

export const INTERVENTION_META: Record<
  InterventionPath,
  { icon: string; color: string; bgColor: string; borderColor: string; steps: number }
> = {
  FOCUS_JOURNEY: {
    icon: '🎯',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    steps: 5,
  },
  CALM_GARDEN: {
    icon: '🌿',
    color: '#059669',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    steps: 4,
  },
  GROUNDING_JOURNEY: {
    icon: '🧭',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    steps: 5,
  },
  HUMAN_REVIEW: {
    icon: '👩‍⚕️',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    steps: 0,
  },
  SAFETY_PATHWAY: {
    icon: '🚨',
    color: '#dc2626',
    bgColor: '#fff5f5',
    borderColor: '#fca5a5',
    steps: 0,
  },
}
