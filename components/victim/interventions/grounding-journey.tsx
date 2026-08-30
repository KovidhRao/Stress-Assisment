'use client'

/**
 * components/victim/interventions/grounding-journey.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GROUNDING JOURNEY — Adaptive intervention for Moderate Distress (Support gate)
 *
 * Based on the 5-4-3-2-1 Sensory Grounding technique.
 * Flow (5 steps):
 *  Step 1 — 5 things you can SEE      (user types / picks)
 *  Step 2 — 4 things you can HEAR     (user types / picks)
 *  Step 3 — 3 things you can TOUCH    (user types / picks)
 *  Step 4 — 2 slow breaths            (animated breath guide)
 *  Step 5 — 1 check-in               (how present do you feel? 0–10)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react'
import { Eye, Music, Hand, Wind, Heart, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react'

interface GroundingJourneyProps {
  onComplete: () => void
  onSkip?: () => void
}

const STEP_CONFIG = [
  { n: 5, sense: 'SEE',   icon: Eye,   color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', prompts: ['A colour on the wall', 'Something moving', 'A piece of furniture', 'Light source', 'Something small'] },
  { n: 4, sense: 'HEAR',  icon: Music, color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', prompts: ['Traffic / nature sounds', 'Your own breathing', 'A distant sound', 'Silence'] },
  { n: 3, sense: 'TOUCH', icon: Hand,  color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', prompts: ['Something smooth', 'Something warm', 'The floor under your feet'] },
]

export function GroundingJourney({ onComplete, onSkip }: GroundingJourneyProps) {
  const [step, setStep] = useState(0)  // 0=intro, 1-3=senses, 4=breath, 5=checkin, 6=complete
  const [entries, setEntries] = useState<string[][]>([[], [], []])
  const [presentScore, setPresentScore] = useState(5)
  const [breathsDone, setBreathsDone] = useState(0)
  const [breathActive, setBreathActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'in'|'out'>('in')
  const [breathSecs, setBreathSecs] = useState(4)
  const [draftText, setDraftText] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const stepCfg = step >= 1 && step <= 3 ? STEP_CONFIG[step - 1] : null

  // Breathing timer (step 4)
  useEffect(() => {
    if (!breathActive || step !== 4) return
    timerRef.current = setInterval(() => {
      setBreathSecs(prev => {
        if (prev <= 1) {
          setBreathPhase(curr => {
            if (curr === 'in') return 'out'
            setBreathsDone(d => d + 1)
            return 'in'
          })
          return 4
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [breathActive, step])

  useEffect(() => {
    if (breathsDone >= 2 && step === 4) {
      setBreathActive(false)
      setTimeout(() => setStep(5), 600)
    }
  }, [breathsDone, step])

  const addEntry = (senseIdx: number, value: string) => {
    const cfg = STEP_CONFIG[senseIdx]
    if (!value.trim() || entries[senseIdx].length >= cfg.n) return
    setEntries(prev => {
      const copy = prev.map(arr => [...arr])
      copy[senseIdx] = [...copy[senseIdx], value.trim()]
      return copy
    })
    setDraftText('')
  }

  const removeEntry = (senseIdx: number, idx: number) => {
    setEntries(prev => {
      const copy = prev.map(arr => [...arr])
      copy[senseIdx] = copy[senseIdx].filter((_, i) => i !== idx)
      return copy
    })
  }

  const canAdvanceSense = (senseIdx: number) => {
    return entries[senseIdx].length >= Math.min(2, STEP_CONFIG[senseIdx].n)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1,2,3,4,5].map(n => (
          <div
            key={n}
            className="h-1.5 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor:
                step > n ? '#0284c7' :
                step === n ? '#38bdf8' :
                '#e0f2fe'
            }}
          />
        ))}
        <span className="text-[10px] font-bold text-[#0284c7] ml-1 shrink-0">
          {step === 0 ? 'Start' : step === 6 ? 'Done' : `${Math.min(step, 5)}/5`}
        </span>
      </div>

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4 text-center animate-in fade-in duration-200 py-3">
          <div className="size-16 mx-auto rounded-2xl bg-[#e0f2fe] flex items-center justify-center">
            <span className="text-3xl">🧭</span>
          </div>
          <h3 className="text-lg font-bold text-[#0c4a6e]">5-4-3-2-1 Grounding</h3>
          <p className="text-xs text-[#6b7280] max-w-xs mx-auto leading-relaxed">
            This technique brings your attention to the present moment using your senses.
            It takes 3–5 minutes and helps reduce emotional overwhelm.
          </p>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {[
              { emoji: '👀', label: '5 See' },
              { emoji: '👂', label: '4 Hear' },
              { emoji: '🤚', label: '3 Touch' },
              { emoji: '💨', label: '2 Breaths' },
              { emoji: '💙', label: '1 Check-in' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1 bg-[#f0f9ff] rounded-xl p-2 border border-[#bae6fd]">
                <span className="text-base">{s.emoji}</span>
                <span className="text-[9px] font-bold text-[#0284c7]">{s.label}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-bold transition cursor-pointer shadow-md shadow-[#0284c7]/20"
          >
            Begin Grounding Journey
          </button>
        </div>
      )}

      {/* ── STEPS 1-3: Senses ────────────────────────────────────── */}
      {step >= 1 && step <= 3 && stepCfg && (() => {
        const senseIdx = step - 1
        const cfg = stepCfg
        const Icon = cfg.icon
        const remaining = cfg.n - entries[senseIdx].length
        return (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                <Icon size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold" style={{ color: cfg.color }}>
                  {cfg.n} things you can <strong>{cfg.sense}</strong>
                </h3>
                <p className="text-[10px] text-[#6b7280]">
                  {remaining > 0 ? `${remaining} more to go` : 'All done ✓'}
                </p>
              </div>
            </div>

            {/* Entered items */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {entries[senseIdx].map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
                  style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.color }}
                >
                  <CheckCircle2 size={12} />
                  <span>{e}</span>
                  <button
                    type="button"
                    onClick={() => removeEntry(senseIdx, i)}
                    className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer"
                  >×</button>
                </div>
              ))}
            </div>

            {/* Quick prompts */}
            {remaining > 0 && (
              <div className="flex flex-wrap gap-2">
                {cfg.prompts.slice(0, remaining + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addEntry(senseIdx, p)}
                    disabled={entries[senseIdx].includes(p)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer disabled:opacity-30"
                    style={{ borderColor: cfg.border, color: cfg.color, backgroundColor: 'white' }}
                  >
                    + {p}
                  </button>
                ))}
              </div>
            )}

            {/* Custom input */}
            {remaining > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addEntry(senseIdx, draftText) }}
                  placeholder={`Name something you can ${cfg.sense.toLowerCase()}...`}
                  className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 transition"
                  style={{ borderColor: cfg.border, backgroundColor: cfg.bg }}
                />
                <button
                  type="button"
                  onClick={() => addEntry(senseIdx, draftText)}
                  disabled={!draftText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: cfg.color }}
                >Add</button>
              </div>
            )}

            {/* Advance */}
            <div className="flex justify-between items-center pt-1">
              {onSkip && <button type="button" onClick={onSkip} className="text-xs text-[#9ca3af] cursor-pointer">Skip</button>}
              <button
                type="button"
                onClick={() => { setDraftText(''); setStep(s => s + 1) }}
                disabled={!canAdvanceSense(senseIdx)}
                className="ml-auto flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
                style={{ backgroundColor: cfg.color }}
              >
                Next sense <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── STEP 4: Breathing ────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#d1fae5] text-[#059669]"><Wind size={18} /></span>
            <h3 className="text-base font-bold text-[#064e3b]">2 slow, mindful breaths</h3>
          </div>
          <p className="text-xs text-[#6b7280]">You&apos;ve grounded 3 senses. Let two deep breaths anchor you fully in the present.</p>

          <div className="flex flex-col items-center gap-4">
            <div className="relative size-40 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                  breathPhase === 'in' && breathActive ? 'scale-100 opacity-80' : 'scale-65 opacity-40'
                }`}
                style={{ backgroundColor: '#bbf7d0' }}
              />
              <div className="relative text-center">
                <p className="text-xs font-bold text-[#059669]">{breathActive ? (breathPhase === 'in' ? 'Breathe In' : 'Breathe Out') : 'Ready'}</p>
                <p className="text-3xl font-extrabold text-[#064e3b]">{breathActive ? `${breathSecs}s` : '4s'}</p>
                <p className="text-[10px] text-[#6b7280]">{breathsDone}/2 breaths</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBreathActive(b => !b)}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md cursor-pointer"
              style={{ backgroundColor: breathActive ? '#dc2626' : '#059669' }}
            >
              {breathActive ? 'Pause' : breathsDone >= 2 ? 'Done ✓' : 'Start'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="w-full text-xs text-[#9ca3af] hover:text-[#6b7280] py-1 cursor-pointer"
          >
            Skip breathing →
          </button>
        </div>
      )}

      {/* ── STEP 5: Check-in ─────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#fce7f3] text-[#db2777]"><Heart size={18} /></span>
            <h3 className="text-base font-bold text-[#831843]">How present do you feel?</h3>
          </div>
          <p className="text-xs text-[#6b7280]">
            0 = Completely scattered &nbsp;•&nbsp; 10 = Fully grounded and present
          </p>

          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={10}
              value={presentScore}
              onChange={e => setPresentScore(Number(e.target.value))}
              className="w-full accent-[#0284c7] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6b7280] font-semibold px-0.5">
              <span>0 — Scattered</span>
              <span className="text-2xl font-extrabold text-[#0284c7]">{presentScore}</span>
              <span>10 — Grounded</span>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-[#f0f9ff] border border-[#bae6fd] text-xs text-[#0284c7] leading-relaxed font-medium">
            {presentScore <= 3
              ? '🌊 That\'s okay. Grounding takes practice. You showed up — that\'s what matters.'
              : presentScore <= 6
              ? '🌿 You\'re finding your footing. Each breath and sense you noticed helps.'
              : '✨ You feel grounded. Carry this feeling with you as you move forward.'}
          </div>

          <button
            type="button"
            onClick={() => { setStep(6); setTimeout(onComplete, 1600) }}
            className="w-full py-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-bold transition cursor-pointer shadow-md shadow-[#0284c7]/20"
          >
            Complete grounding session
          </button>
        </div>
      )}

      {/* ── STEP 6: Completion ───────────────────────────────────── */}
      {step === 6 && (
        <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="size-16 mx-auto rounded-2xl bg-[#e0f2fe] flex items-center justify-center text-3xl shadow-md">
            🧭
          </div>
          <h3 className="text-lg font-bold text-[#0c4a6e]">You are grounded</h3>
          <p className="text-xs text-[#6b7280] max-w-xs mx-auto leading-relaxed">
            You used your 5 senses to anchor yourself in the present moment. That is a real clinical technique — and you just did it.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {entries.map((arr, i) => (
              <div key={i} className="rounded-xl p-2 border" style={{ backgroundColor: STEP_CONFIG[i].bg, borderColor: STEP_CONFIG[i].border }}>
                <p className="text-[10px] font-bold" style={{ color: STEP_CONFIG[i].color }}>{STEP_CONFIG[i].sense}</p>
                <p className="text-xs font-semibold text-[#374151]">{arr.length}/{STEP_CONFIG[i].n}</p>
              </div>
            ))}
          </div>
          <Sparkles size={20} className="text-[#0284c7] mx-auto" />
        </div>
      )}
    </div>
  )
}
