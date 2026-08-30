'use client'

/**
 * components/victim/interventions/calm-garden.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CALM GARDEN — Adaptive intervention for Anxiety / Grief / Emotional Distress (Low gate)
 *
 * Flow:
 *  Step 1 — Breathing preparation  (inhale/hold/exhale guide — 2 cycles)
 *  Step 2 — Plant your seed        (user picks what they want to grow — hope/peace/courage/joy)
 *  Step 3 — Water your plant       (interactive animated plant grows as user clicks "water" 5×)
 *  Step 4 — Completion             (fully grown plant + personalised affirmation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react'
import { Leaf, Droplets, Wind, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'

interface CalmGardenProps {
  onComplete: () => void
  onSkip?: () => void
}

const SEEDS = [
  { id: 'hope',    label: 'Hope',    emoji: '🌱', color: '#059669', desc: 'A belief that things can improve.' },
  { id: 'peace',   label: 'Peace',   emoji: '🕊️',  color: '#0284c7', desc: 'Stillness within, even in storms.' },
  { id: 'courage', label: 'Courage', emoji: '🌻', color: '#d97706', desc: 'The strength to keep going.' },
  { id: 'joy',     label: 'Joy',     emoji: '🌸', color: '#db2777', desc: 'Small moments of light.' },
]

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest'

export function CalmGarden({ onComplete, onSkip }: CalmGardenProps) {
  const [step, setStep] = useState(1)
  const [chosenSeed, setChosenSeed] = useState<typeof SEEDS[0] | null>(null)
  const [waterCount, setWaterCount] = useState(0)
  const [completed, setCompleted] = useState(false)

  // Breathing state (step 1)
  const [breathActive, setBreathActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale')
  const [breathSecs, setBreathSecs] = useState(4)
  const [breathCycles, setBreathCycles] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-advance after 2 breathing cycles
  useEffect(() => {
    if (breathCycles >= 2 && step === 1) {
      setTimeout(() => setStep(2), 1000)
    }
  }, [breathCycles, step])

  useEffect(() => {
    if (!breathActive) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setBreathSecs(prev => {
        if (prev <= 1) {
          setBreathPhase(curr => {
            if (curr === 'inhale') return 'hold'
            if (curr === 'hold') return 'exhale'
            if (curr === 'exhale') return 'rest'
            setBreathCycles(c => c + 1)
            return 'inhale'
          })
          return 4
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [breathActive])

  const BREATH_LABELS: Record<BreathPhase, string> = {
    inhale: 'Breathe In',
    hold:   'Hold',
    exhale: 'Breathe Out',
    rest:   'Rest',
  }

  const handleWater = () => {
    if (waterCount >= 5) return
    const next = waterCount + 1
    setWaterCount(next)
    if (next >= 5) {
      setTimeout(() => {
        setCompleted(true)
        setTimeout(onComplete, 2000)
      }, 600)
    }
  }

  // Plant growth: 0–5 water = 0–100% growth
  const growthPct = Math.min(100, waterCount * 20)
  const seedColor = chosenSeed?.color || '#059669'

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1,2,3,4].map(n => (
          <div
            key={n}
            className="h-1.5 flex-1 rounded-full transition-all duration-500"
            style={{ backgroundColor: n <= step ? seedColor : '#d1fae5' }}
          />
        ))}
        <span className="text-[10px] font-bold ml-1 shrink-0" style={{ color: seedColor }}>{step}/4</span>
      </div>

      {/* ── STEP 1: Breathing ────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#d1fae5] text-[#059669]"><Wind size={16} /></span>
            <h3 className="text-base font-bold text-[#064e3b]">Start with your breath</h3>
          </div>
          <p className="text-xs text-[#6b7280]">Two slow breathing cycles will prepare your nervous system before we tend your garden.</p>

          {/* Breathing ring */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative size-44 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-1000 ease-in-out ${
                  !breathActive ? 'scale-75 opacity-50'
                  : breathPhase === 'inhale' ? 'scale-100 opacity-90'
                  : breathPhase === 'hold'   ? 'scale-100 opacity-100'
                  : breathPhase === 'exhale' ? 'scale-65 opacity-60'
                  : 'scale-65 opacity-40'
                }`}
                style={{ backgroundColor: '#bbf7d0', boxShadow: breathActive ? '0 0 30px rgba(5,150,105,0.25)' : 'none' }}
              />
              <div className="relative z-10 text-center">
                <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">
                  {breathActive ? BREATH_LABELS[breathPhase] : 'Ready'}
                </p>
                <p className="text-3xl font-extrabold text-[#064e3b] mt-0.5">
                  {breathActive ? `${breathSecs}s` : '4s'}
                </p>
                <p className="text-[10px] text-[#6b7280] mt-1">
                  {breathActive ? `Cycle ${breathCycles + 1} / 2` : 'Press Start'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBreathActive(!breathActive)}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer"
              style={{ backgroundColor: breathActive ? '#dc2626' : '#059669' }}
            >
              {breathActive ? 'Pause' : breathCycles >= 2 ? 'Done ✓' : 'Start Breathing'}
            </button>

            {breathCycles >= 2 && (
              <p className="text-xs text-[#059669] font-semibold animate-in fade-in">
                ✓ 2 cycles complete — garden opening...
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full text-xs text-[#9ca3af] hover:text-[#6b7280] transition cursor-pointer py-1"
          >
            Skip breathing, go to garden →
          </button>
        </div>
      )}

      {/* ── STEP 2: Choose seed ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#d1fae5] text-[#059669]"><Leaf size={16} /></span>
            <h3 className="text-base font-bold text-[#064e3b]">Plant a seed in your garden</h3>
          </div>
          <p className="text-xs text-[#6b7280]">What feeling do you most want to nurture right now?</p>

          <div className="grid grid-cols-2 gap-3">
            {SEEDS.map(seed => (
              <button
                key={seed.id}
                type="button"
                onClick={() => setChosenSeed(seed)}
                className={`p-4 rounded-2xl border-2 text-center transition cursor-pointer ${
                  chosenSeed?.id === seed.id ? 'border-current' : 'border-[#d1fae5] hover:border-[#a7f3d0]'
                }`}
                style={chosenSeed?.id === seed.id ? { borderColor: seed.color, backgroundColor: seed.color + '10' } : {}}
              >
                <span className="text-2xl block mb-1">{seed.emoji}</span>
                <p className="text-xs font-bold" style={{ color: seed.color }}>{seed.label}</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">{seed.desc}</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!chosenSeed}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
            style={{ backgroundColor: chosenSeed?.color || '#059669' }}
          >
            Plant my {chosenSeed?.label || 'seed'} seed <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── STEP 3: Water the plant ──────────────────────────────── */}
      {step === 3 && chosenSeed && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl" style={{ backgroundColor: chosenSeed.color + '20', color: chosenSeed.color }}>
              <Droplets size={16} />
            </span>
            <h3 className="text-base font-bold" style={{ color: chosenSeed.color }}>Water your {chosenSeed.label} plant</h3>
          </div>
          <p className="text-xs text-[#6b7280]">Each drop of water is a moment of care for yourself. Tap 5 times.</p>

          {/* Animated plant */}
          <div className="relative h-48 rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-end pb-4"
            style={{ borderColor: chosenSeed.color + '40', background: `linear-gradient(to bottom, #f0fdf4, #dcfce7)` }}>

            {/* Soil */}
            <div className="absolute bottom-0 left-0 right-0 h-8 rounded-b-xl" style={{ backgroundColor: '#78350f' }} />

            {/* Plant stem — grows upward */}
            <div
              className="absolute bottom-8 w-1 rounded-full transition-all duration-700 origin-bottom"
              style={{
                height: `${Math.max(8, growthPct * 1.1)}px`,
                backgroundColor: '#15803d',
                left: '50%', transform: 'translateX(-50%)'
              }}
            />

            {/* Leaves — appear at 40%+ */}
            {growthPct >= 40 && (
              <div
                className="absolute transition-all duration-500 animate-in fade-in"
                style={{ bottom: `${Math.max(40, 8 + growthPct)}px`, left: '50%' }}
              >
                <span className="text-2xl" style={{ transform: 'translateX(-60%)' }}>🌿</span>
              </div>
            )}

            {/* Flower — appears at 100% */}
            {growthPct >= 100 && (
              <div
                className="absolute animate-in zoom-in-50 duration-500"
                style={{ bottom: `${8 + growthPct * 1.1 + 8}px`, left: '50%', transform: 'translateX(-50%)' }}
              >
                <span className="text-3xl">{chosenSeed.emoji}</span>
              </div>
            )}

            {/* Water drops counter */}
            <div className="absolute top-3 right-3 flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div
                  key={i}
                  className="size-3 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= waterCount ? chosenSeed.color : '#d1fae5' }}
                />
              ))}
            </div>
          </div>

          {!completed && (
            <button
              type="button"
              onClick={handleWater}
              disabled={waterCount >= 5}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
              style={{ backgroundColor: chosenSeed.color, boxShadow: `0 4px 14px ${chosenSeed.color}40` }}
            >
              <Droplets size={18} />
              <span>Water ({waterCount}/5)</span>
            </button>
          )}

          {completed && (
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-95 duration-300">
              <CheckCircle2 size={24} style={{ color: chosenSeed.color }} />
              <p className="text-sm font-bold" style={{ color: chosenSeed.color }}>
                Your {chosenSeed.label} plant is blooming! 🎉
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Completion ──────────────────────────────────── */}
      {step === 4 && chosenSeed && (
        <div className="text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div
            className="size-20 mx-auto rounded-full flex items-center justify-center text-4xl shadow-lg"
            style={{ backgroundColor: chosenSeed.color + '20', border: `3px solid ${chosenSeed.color}` }}
          >
            {chosenSeed.emoji}
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: chosenSeed.color }}>
              Your {chosenSeed.label} is growing
            </h3>
            <p className="text-xs text-[#6b7280] mt-1 max-w-xs mx-auto leading-relaxed">
              You tended to something beautiful today. That act of care — for a plant, for yourself — is a real step toward healing.
            </p>
          </div>
          <div className="rounded-2xl p-4 text-sm italic font-medium" style={{ backgroundColor: chosenSeed.color + '10', color: chosenSeed.color }}>
            &ldquo;{chosenSeed.desc}&rdquo;
          </div>
          <Sparkles size={20} style={{ color: chosenSeed.color }} className="mx-auto" />
        </div>
      )}

      {/* Nav */}
      {step < 4 && (
        <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-xs text-[#9ca3af] hover:text-[#6b7280] cursor-pointer">
              Skip
            </button>
          )}
          {step === 2 && chosenSeed && null}
          {step === 3 && waterCount >= 5 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer shadow-md"
              style={{ backgroundColor: chosenSeed?.color }}
            >
              See your garden <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
