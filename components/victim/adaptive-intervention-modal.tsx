'use client'

/**
 * components/victim/adaptive-intervention-modal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptive Intervention Modal
 *
 * Orchestrates the full Day 4 intervention loop:
 *   1. Before-check      — "Rate your stress right now (0–10)"
 *   2. Recommendation chip — show which journey was selected + why
 *   3. Intervention       — FocusJourney | CalmGarden | GroundingJourney
 *   4. After-check        — same 0–10 slider
 *   5. Session summary    — delta, encouragement, session record stored
 *
 * Critical: HUMAN_REVIEW and SAFETY_PATHWAY paths MUST NOT render any
 * game/tool — they render a redirect notice instead. This is enforced by
 * checking gameAllowed before mounting any intervention component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import { X, ChevronRight, TrendingDown, TrendingUp, Minus, Lock, AlertOctagon, CheckCircle2 } from 'lucide-react'
import { InterventionPath, InterventionSession, DistressRating } from '@/types'
import { RecommendationResult, INTERVENTION_META } from '@/lib/recommendation-engine'
import { FocusJourney } from '@/components/victim/interventions/focus-journey'
import { CalmGarden } from '@/components/victim/interventions/calm-garden'
import { GroundingJourney } from '@/components/victim/interventions/grounding-journey'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdaptiveInterventionModalProps {
  isOpen: boolean
  onClose: () => void
  recommendation: RecommendationResult
  caseId?: string
  userId?: string
  onSessionComplete?: (session: InterventionSession) => void
  onTriggerSOS?: () => void
}

// ─── Phase type ───────────────────────────────────────────────────────────────

type Phase = 'before' | 'recommend' | 'intervention' | 'after' | 'summary'

// ─── Component ────────────────────────────────────────────────────────────────

export function AdaptiveInterventionModal({
  isOpen,
  onClose,
  recommendation,
  caseId,
  userId,
  onSessionComplete,
  onTriggerSOS,
}: AdaptiveInterventionModalProps) {
  const [phase, setPhase] = useState<Phase>('before')
  const [beforeScore, setBeforeScore] = useState(5)
  const [afterScore, setAfterScore] = useState(5)
  const [session, setSession] = useState<InterventionSession | null>(null)

  if (!isOpen) return null

  const meta = INTERVENTION_META[recommendation.path]

  // ─── Defense: block game for Human Review / Safety Pathway ────────────────
  if (!recommendation.gameAllowed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl border border-[#fca5a5] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div
            className="p-5 text-white flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Lock size={18} className="text-[#fca5a5]" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Tools Unavailable</h3>
                <p className="text-[11px] text-[#fca5a5]">{recommendation.label} active</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#fca5a5] hover:text-white transition cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4 text-center">
            <p className="text-sm font-semibold text-[#7f1d1d]">
              Wellbeing tools are not available at your current support level.
            </p>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              {recommendation.rationale}
            </p>
            <p className="text-xs font-bold text-[#dc2626]">
              Please use the SOS button or call <span className="underline">14566</span> for immediate support.
            </p>
            {onTriggerSOS && (
              <button
                type="button"
                onClick={onTriggerSOS}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-3 text-sm font-bold transition cursor-pointer shadow-md"
              >
                <AlertOctagon size={16} />
                SOS — Call 14566
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-[#6b7280] hover:text-[#374151] cursor-pointer"
            >
              Return to my support options
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleBeforeConfirm = () => {
    setAfterScore(beforeScore)  // initialise after to same so slider shows start
    setPhase('recommend')
  }

  const handleStartIntervention = () => {
    setPhase('intervention')
  }

  const handleInterventionComplete = () => {
    setPhase('after')
  }

  const handleAfterConfirm = () => {
    const before: DistressRating = { score: beforeScore, captured_at: new Date().toISOString(), label: 'Before' }
    const after: DistressRating  = { score: afterScore,  captured_at: new Date().toISOString(), label: 'After' }
    const delta = beforeScore - afterScore
    const newSession: InterventionSession = {
      id: `SESSION-${Date.now()}`,
      case_id: caseId,
      user_id: userId,
      intervention_path: recommendation.path,
      before_rating: before,
      after_rating: after,
      delta,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      completed: true,
    }
    setSession(newSession)
    onSessionComplete?.(newSession)
    setPhase('summary')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        style={{ border: `2px solid ${meta.borderColor}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ backgroundColor: meta.bgColor, borderBottom: `1px solid ${meta.borderColor}` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h2 className="font-bold text-sm" style={{ color: meta.color }}>{recommendation.label}</h2>
              <p className="text-[10px] text-[#6b7280]">
                {phase === 'before' && 'Before check-in'}
                {phase === 'recommend' && 'Your personalised path'}
                {phase === 'intervention' && 'Guided session'}
                {phase === 'after' && 'After check-in'}
                {phase === 'summary' && 'Session complete'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── PHASE: Before check ─────────────────────────────────── */}
          {phase === 'before' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-[#111827]">How stressed do you feel right now?</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  This is your starting point — we&apos;ll ask again after the session so you can see your shift.
                </p>
              </div>

              <div className="space-y-3 py-2">
                <div className="flex justify-between text-xs font-semibold text-[#6b7280]">
                  <span>0 — No stress</span>
                  <span className="text-3xl font-extrabold" style={{ color: meta.color }}>{beforeScore}</span>
                  <span>10 — Extreme</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={beforeScore}
                  onChange={e => setBeforeScore(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: meta.color }}
                />
                <div className="flex justify-between text-[10px] text-[#d1d5db]">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <span key={n} className={n === beforeScore ? 'font-bold' : ''} style={{ color: n === beforeScore ? meta.color : undefined }}>|</span>
                  ))}
                </div>
              </div>

              {/* Emoji feedback */}
              <div className="text-center text-xs text-[#6b7280] font-medium">
                {beforeScore <= 2 ? '😌 You seem fairly calm' :
                 beforeScore <= 4 ? '😐 A little stressed' :
                 beforeScore <= 6 ? '😰 Noticeably stressed' :
                 beforeScore <= 8 ? '😟 Quite distressed' :
                                    '😣 Extremely stressed'}
              </div>

              <button
                type="button"
                onClick={handleBeforeConfirm}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer shadow-md"
                style={{ backgroundColor: meta.color }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── PHASE: Recommendation chip ────────────────────────────── */}
          {phase === 'recommend' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div
                className="rounded-2xl p-5 border-2 space-y-3"
                style={{ backgroundColor: meta.bgColor, borderColor: meta.borderColor }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                      Recommended for you
                    </p>
                    <h3 className="text-lg font-extrabold" style={{ color: meta.color }}>{recommendation.label}</h3>
                  </div>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">{recommendation.rationale}</p>

                <div className="flex items-center gap-4 pt-1 border-t" style={{ borderColor: meta.borderColor }}>
                  <div className="text-center">
                    <p className="text-[10px] text-[#6b7280]">Your stress</p>
                    <p className="text-lg font-extrabold" style={{ color: meta.color }}>{beforeScore}/10</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${beforeScore * 10}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                  {meta.steps > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-[#6b7280]">Steps</p>
                      <p className="text-lg font-extrabold" style={{ color: meta.color }}>{meta.steps}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartIntervention}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold transition cursor-pointer shadow-lg"
                style={{ backgroundColor: meta.color, boxShadow: `0 4px 14px ${meta.color}40` }}
              >
                Start {recommendation.label} <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-[#9ca3af] hover:text-[#6b7280] cursor-pointer"
              >
                Not now — return to journey
              </button>
            </div>
          )}

          {/* ── PHASE: Intervention ──────────────────────────────────── */}
          {phase === 'intervention' && (
            <div className="animate-in fade-in duration-200">
              {recommendation.path === 'FOCUS_JOURNEY' && (
                <FocusJourney onComplete={handleInterventionComplete} onSkip={handleInterventionComplete} />
              )}
              {recommendation.path === 'CALM_GARDEN' && (
                <CalmGarden onComplete={handleInterventionComplete} onSkip={handleInterventionComplete} />
              )}
              {recommendation.path === 'GROUNDING_JOURNEY' && (
                <GroundingJourney onComplete={handleInterventionComplete} onSkip={handleInterventionComplete} />
              )}
            </div>
          )}

          {/* ── PHASE: After check ───────────────────────────────────── */}
          {phase === 'after' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={18} style={{ color: meta.color }} />
                  <h3 className="text-base font-bold text-[#111827]">Session complete — how do you feel now?</h3>
                </div>
                <p className="text-xs text-[#6b7280]">
                  Started at <strong>{beforeScore}/10</strong> stress. Where are you now?
                </p>
              </div>

              <div className="space-y-3 py-2">
                <div className="flex justify-between text-xs font-semibold text-[#6b7280]">
                  <span>0 — No stress</span>
                  <span className="text-3xl font-extrabold" style={{ color: meta.color }}>{afterScore}</span>
                  <span>10 — Extreme</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={afterScore}
                  onChange={e => setAfterScore(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: meta.color }}
                />
              </div>

              {/* Live delta preview */}
              {(() => {
                const delta = beforeScore - afterScore
                return (
                  <div
                    className="rounded-2xl p-3 flex items-center gap-3 border"
                    style={{ backgroundColor: meta.bgColor, borderColor: meta.borderColor }}
                  >
                    {delta > 0
                      ? <TrendingDown size={18} className="text-[#059669] shrink-0" />
                      : delta < 0
                      ? <TrendingUp size={18} className="text-[#dc2626] shrink-0" />
                      : <Minus size={18} className="text-[#6b7280] shrink-0" />}
                    <p className="text-xs font-semibold text-[#374151]">
                      {delta > 0
                        ? `Stress reduced by ${delta} point${delta !== 1 ? 's' : ''} — that's meaningful progress.`
                        : delta < 0
                        ? `Stress went up by ${Math.abs(delta)} — that's okay, it's just one session.`
                        : `Same level — all sessions take time to integrate.`}
                    </p>
                  </div>
                )
              })()}

              <button
                type="button"
                onClick={handleAfterConfirm}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer shadow-md"
                style={{ backgroundColor: meta.color }}
              >
                Save session <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── PHASE: Summary ───────────────────────────────────────── */}
          {phase === 'summary' && session && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <span className="text-4xl block">{meta.icon}</span>
                <h3 className="text-lg font-bold" style={{ color: meta.color }}>Session Recorded</h3>
                <p className="text-xs text-[#6b7280]">Here is your session-level change. This is not a clinical outcome — it&apos;s a moment of care.</p>
              </div>

              {/* Before / After bars */}
              <div
                className="rounded-2xl p-4 border-2 space-y-3"
                style={{ backgroundColor: meta.bgColor, borderColor: meta.borderColor }}
              >
                {[
                  { label: 'Before', score: beforeScore },
                  { label: 'After',  score: afterScore  },
                ].map(({ label, score }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span style={{ color: meta.color }}>{label}</span>
                      <span className="text-[#111827]">{score}/10</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#f3f4f6] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${score * 10}%`, backgroundColor: meta.color, opacity: label === 'After' ? 1 : 0.4 }}
                      />
                    </div>
                  </div>
                ))}

                {/* Delta chip */}
                {(() => {
                  const delta = (session.delta ?? 0)
                  return (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {delta > 0
                        ? <><TrendingDown size={16} className="text-[#059669]" /><span className="text-sm font-extrabold text-[#059669]">−{delta} stress</span></>
                        : delta < 0
                        ? <><TrendingUp   size={16} className="text-[#dc2626]" /><span className="text-sm font-extrabold text-[#dc2626]">+{Math.abs(delta)} stress</span></>
                        : <><Minus size={16} className="text-[#6b7280]" /><span className="text-sm font-extrabold text-[#6b7280]">No change</span></>}
                    </div>
                  )
                })()}
              </div>

              <div className="rounded-xl bg-[#f9fafb] border border-[#e5e7eb] px-4 py-3 text-xs text-[#374151] italic leading-relaxed text-center">
                &ldquo;This session-level shift reflects how you felt in this moment. It is a step, not a destination — and every step counts.&rdquo;
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-white text-sm font-bold cursor-pointer shadow-md"
                style={{ backgroundColor: meta.color }}
              >
                Close & return to my journey
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
