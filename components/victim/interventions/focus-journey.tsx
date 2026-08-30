'use client'

/**
 * components/victim/interventions/focus-journey.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * FOCUS JOURNEY — Adaptive intervention for Academic / Work stress (Low gate)
 *
 * Flow:
 *  Step 1 — Identify your main stressor  (text input with quick-picks)
 *  Step 2 — Choose your top priority     (3 cards to pick from)
 *  Step 3 — Mini clarify puzzle          (break problem into "What? Why? Can I control it?")
 *  Step 4 — Break into one small task    (drag/click to pick ONE first action)
 *  Step 5 — Commit & completion          (celebration + affirmation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react'
import { Target, CheckCircle2, ChevronRight, RotateCcw, Sparkles, Brain, Zap, ArrowRight } from 'lucide-react'

interface FocusJourneyProps {
  onComplete: () => void
  onSkip?: () => void
}

const QUICK_STRESSORS = [
  'Upcoming exam / test',
  'Assignment deadline',
  'Syllabus not finished',
  'College admission pressure',
  'Work deadline / project',
  'Job performance pressure',
  'Financial worry',
]

const PRIORITY_OPTIONS = [
  { id: 'a', label: 'Study / Revise one subject', icon: '📚', color: '#7c3aed' },
  { id: 'b', label: 'Talk to someone I trust', icon: '💬', color: '#2563eb' },
  { id: 'c', label: 'Take a short planned break', icon: '☕', color: '#059669' },
]

const SMALL_TASKS = [
  'Open one book for 10 minutes',
  'Write a to-do list for today',
  'Drink a glass of water first',
  'Take 5 deep breaths, then start',
  'Message one friend or teacher',
  'Set a 25-minute focus timer',
]

const AFFIRMATIONS = [
  'One step at a time is enough.',
  'You have overcome challenges before.',
  'Small progress is still progress.',
  'You are doing your best — that matters.',
]

export function FocusJourney({ onComplete, onSkip }: FocusJourneyProps) {
  const [step, setStep] = useState(1)
  const [stressor, setStressor] = useState('')
  const [priority, setPriority] = useState('')
  const [whatControl, setWhatControl] = useState<'yes' | 'partial' | 'no' | ''>('')
  const [chosenTask, setChosenTask] = useState('')
  const [committed, setCommitted] = useState(false)
  const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]

  const canNext = () => {
    if (step === 1) return stressor.trim().length > 0
    if (step === 2) return !!priority
    if (step === 3) return !!whatControl
    if (step === 4) return !!chosenTask
    return true
  }

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1)
    else { setCommitted(true); setTimeout(onComplete, 1800) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {[1,2,3,4,5].map(n => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              n < step ? 'bg-[#7c3aed]' : n === step ? 'bg-[#a78bfa]' : 'bg-[#ede9fe]'
            }`}
          />
        ))}
        <span className="text-[10px] font-bold text-[#7c3aed] ml-1 shrink-0">{step}/5</span>
      </div>

      {/* ── STEP 1: Identify stressor ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#ede9fe] text-[#7c3aed]"><Target size={16} /></span>
            <h3 className="text-base font-bold text-[#3b0764]">What is stressing you out?</h3>
          </div>
          <p className="text-xs text-[#6b7280]">Name it — naming a stressor reduces its psychological weight by up to 30%.</p>

          <div className="flex flex-wrap gap-2">
            {QUICK_STRESSORS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStressor(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  stressor === s
                    ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                    : 'bg-white border-[#ddd6fe] text-[#4c1d95] hover:bg-[#ede9fe]'
                }`}
              >{s}</button>
            ))}
          </div>

          <textarea
            value={stressor}
            onChange={e => setStressor(e.target.value)}
            placeholder="Or describe it in your own words..."
            rows={2}
            className="w-full rounded-2xl border border-[#ddd6fe] bg-[#faf5ff] p-3 text-xs text-[#3b0764] placeholder-[#a78bfa] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 resize-none"
          />
        </div>
      )}

      {/* ── STEP 2: Choose priority ───────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#ede9fe] text-[#7c3aed]"><Zap size={16} /></span>
            <h3 className="text-base font-bold text-[#3b0764]">What would help most right now?</h3>
          </div>
          <p className="text-xs text-[#6b7280]">You named: <span className="font-semibold text-[#7c3aed]">{stressor}</span></p>

          <div className="space-y-3">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPriority(opt.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                  priority === opt.id
                    ? 'border-[#7c3aed] bg-[#faf5ff]'
                    : 'border-[#ede9fe] bg-white hover:border-[#c4b5fd]'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-semibold text-[#3b0764]">{opt.label}</span>
                {priority === opt.id && <CheckCircle2 size={18} className="ml-auto text-[#7c3aed]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Clarity puzzle — What / Why / Control ─────────── */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#ede9fe] text-[#7c3aed]"><Brain size={16} /></span>
            <h3 className="text-base font-bold text-[#3b0764]">Can you control this stressor?</h3>
          </div>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Research shows that simply categorising a worry as "controllable" or "not" activates the prefrontal cortex and reduces rumination.
          </p>

          <div className="p-3 rounded-2xl bg-[#faf5ff] border border-[#ddd6fe] text-xs text-[#4c1d95] font-semibold">
            Stressor: "{stressor}"
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'yes',     label: 'Yes, I can act on it',   emoji: '✅', desc: 'It\'s in your hands.' },
              { id: 'partial', label: 'Partially',              emoji: '⚖️', desc: 'Some parts are.' },
              { id: 'no',      label: 'Not really',             emoji: '🌊', desc: 'Let it flow past.' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWhatControl(opt.id as typeof whatControl)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition cursor-pointer text-center ${
                  whatControl === opt.id
                    ? 'border-[#7c3aed] bg-[#faf5ff]'
                    : 'border-[#ede9fe] bg-white hover:border-[#c4b5fd]'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[11px] font-bold text-[#3b0764]">{opt.label}</span>
                <span className="text-[10px] text-[#6b7280]">{opt.desc}</span>
              </button>
            ))}
          </div>

          {whatControl === 'no' && (
            <div className="rounded-xl bg-[#ede9fe] border border-[#c4b5fd] px-4 py-3 text-xs text-[#4c1d95] leading-relaxed animate-in fade-in">
              <strong>That&apos;s okay.</strong> When we can&apos;t control something, the most helpful action is to ground ourselves — we&apos;ll still pick one small thing to do for your wellbeing.
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: One small task ────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#ede9fe] text-[#7c3aed]"><ArrowRight size={16} /></span>
            <h3 className="text-base font-bold text-[#3b0764]">Choose ONE small first step</h3>
          </div>
          <p className="text-xs text-[#6b7280]">The smallest possible action reduces avoidance and builds momentum.</p>

          <div className="grid gap-2 sm:grid-cols-2">
            {SMALL_TASKS.map(task => (
              <button
                key={task}
                type="button"
                onClick={() => setChosenTask(task)}
                className={`p-3 rounded-2xl border-2 text-left text-xs font-semibold transition cursor-pointer ${
                  chosenTask === task
                    ? 'border-[#7c3aed] bg-[#faf5ff] text-[#3b0764]'
                    : 'border-[#ede9fe] bg-white text-[#4c1d95] hover:border-[#c4b5fd]'
                }`}
              >
                {chosenTask === task && <CheckCircle2 size={13} className="inline mr-1.5 text-[#7c3aed]" />}
                {task}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 5: Commit & celebrate ────────────────────────────── */}
      {step === 5 && (
        <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#7c3aed]/30">
            <Sparkles size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#3b0764]">Your Focus Plan is Ready</h3>
            <p className="text-xs text-[#6b7280] mt-1 max-w-xs mx-auto leading-relaxed">
              You&apos;ve named your stressor, chosen a priority, and identified one first step.
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf5ff] border-2 border-[#ddd6fe] p-4 text-left space-y-2">
            <p className="text-[11px] font-bold text-[#7c3aed] uppercase tracking-wider">Your Commitment</p>
            <p className="text-sm font-semibold text-[#3b0764]">📌 {stressor}</p>
            <p className="text-xs text-[#4c1d95]">→ First step: <strong>{chosenTask}</strong></p>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-[#ede9fe] to-[#faf5ff] border border-[#ddd6fe] px-4 py-3">
            <p className="text-xs italic text-[#4c1d95] font-medium">&ldquo;{affirmation}&rdquo;</p>
          </div>

          {committed && (
            <div className="flex items-center justify-center gap-2 text-[#059669] text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={16} />
              <span>Session recorded — great work!</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition cursor-pointer"
          >
            Skip journey
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 rounded-xl border border-[#ddd6fe] text-xs font-semibold text-[#7c3aed] hover:bg-[#faf5ff] transition cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-[#7c3aed]/20"
          >
            <span>{step === 5 ? 'Finish' : 'Next'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
