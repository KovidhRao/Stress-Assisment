'use client'

/**
 * components/victim/interventions/physical-exercise-activity.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Physical Somatic Exercise & Tension Release Suite — Support Mode (Moderate)
 *
 * Provides 4 interactive physical somatic movement exercises designed for human
 * nervous system regulation:
 *  1. Progressive Muscle Relaxation (PMR) — Shoulders, fists, jaw (Tense 5s → Release 10s)
 *  2. Somatic Shakeout & Tension Discharge — 15s hand/arm physical shakeout
 *  3. Posture Alignment & Chest Opener — Guided physical stretch guide
 *  4. Somatic Grounding Body Scan — Head to toe tension release
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react'
import { Activity, Play, Pause, RotateCcw, CheckCircle2, Sparkles, ChevronRight, Dumbbell, Flame, HeartPulse } from 'lucide-react'

interface PhysicalExerciseActivityProps {
  onComplete?: () => void
}

interface Exercise {
  id: string
  title: string
  subtitle: string
  icon: string
  durationSecs: number
  category: 'Somatic Release' | 'Muscle Relaxation' | 'Posture & Stretch' | 'Body Scan'
  steps: {
    instruction: string
    action: 'tense' | 'release' | 'shake' | 'stretch' | 'hold'
    durationSecs: number
    bodyPart: string
  }[]
  clinicalNote: string
}

const PHYSICAL_EXERCISES: Exercise[] = [
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation (PMR)',
    subtitle: 'Systematically tense and release key muscle groups to discharge physical stress.',
    icon: '💪',
    durationSecs: 45,
    category: 'Muscle Relaxation',
    clinicalNote: 'PMR activates the parasympathetic nervous system by signaling safety to motor neurons following acute tension.',
    steps: [
      { instruction: 'Squeeze your fists tightly and pull shoulders up to your ears.', action: 'tense', durationSecs: 5, bodyPart: 'Shoulders & Fists' },
      { instruction: 'Let go completely! Drop shoulders down and open hands wide.', action: 'release', durationSecs: 10, bodyPart: 'Shoulders & Fists' },
      { instruction: 'Clench your jaw gently and press your tongue to the roof of your mouth.', action: 'tense', durationSecs: 5, bodyPart: 'Jaw & Face' },
      { instruction: 'Release jaw! Let your mouth drop open slightly and soften forehead.', action: 'release', durationSecs: 10, bodyPart: 'Jaw & Face' },
      { instruction: 'Press your feet flat on the ground and curl your toes downward.', action: 'tense', durationSecs: 5, bodyPart: 'Feet & Legs' },
      { instruction: 'Uncurl toes and let legs feel completely heavy and relaxed on the floor.', action: 'release', durationSecs: 10, bodyPart: 'Feet & Legs' }
    ]
  },
  {
    id: 'shakeout',
    title: 'Somatic Shakeout & Adrenaline Release',
    subtitle: 'Vigorous 15-second physical shake to release excess cortisol and fight-or-flight energy.',
    icon: '⚡',
    durationSecs: 30,
    category: 'Somatic Release',
    clinicalNote: 'Animals naturally shake after trauma or threat to reset autonomic tone. Shaking releases trapped motor adrenaline.',
    steps: [
      { instruction: 'Stand or sit up straight. Gently shake your right hand and wrist in the air.', action: 'shake', durationSecs: 7, bodyPart: 'Right Arm' },
      { instruction: 'Now shake your left hand and wrist out vigorously.', action: 'shake', durationSecs: 7, bodyPart: 'Left Arm' },
      { instruction: 'Shake both arms and bounce your heels gently on the floor. Let all tension drop.', action: 'shake', durationSecs: 10, bodyPart: 'Whole Body' },
      { instruction: 'Pause completely still. Feel the warm tingling sensation of blood flow returning.', action: 'hold', durationSecs: 6, bodyPart: 'Whole Body' }
    ]
  },
  {
    id: 'posture_stretch',
    title: 'Chest Opener & Neck Somatic Stretch',
    subtitle: 'Counteract the physical "turtle posture" caused by anxiety and stress.',
    icon: '🧘',
    durationSecs: 40,
    category: 'Posture & Stretch',
    clinicalNote: 'Anxiety causes defensive chest-collapsing. Opening the chest lowers heart rate and improves diaphragmatic expansion.',
    steps: [
      { instruction: 'Interlace your fingers behind your lower back and gently roll shoulders back.', action: 'stretch', durationSecs: 10, bodyPart: 'Chest & Shoulders' },
      { instruction: 'Slowly tilt your right ear toward your right shoulder. Hold gently.', action: 'stretch', durationSecs: 10, bodyPart: 'Left Neck' },
      { instruction: 'Slowly tilt your left ear toward your left shoulder. Hold gently.', action: 'stretch', durationSecs: 10, bodyPart: 'Right Neck' },
      { instruction: 'Reach both arms straight overhead toward the sky and take a deep breath in.', action: 'hold', durationSecs: 10, bodyPart: 'Spine & Arms' }
    ]
  }
]

export function PhysicalExerciseActivity({ onComplete }: PhysicalExerciseActivityProps) {
  const [selectedExId, setSelectedExId] = useState<string>('pmr')
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [stepTimer, setStepTimer] = useState<number>(0)
  const [completedExs, setCompletedExs] = useState<string[]>([])

  const currentEx = PHYSICAL_EXERCISES.find(e => e.id === selectedExId) || PHYSICAL_EXERCISES[0]
  const currentStep = currentEx.steps[activeStepIdx] || currentEx.steps[0]

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize step timer when step changes
  useEffect(() => {
    setStepTimer(currentStep.durationSecs)
  }, [activeStepIdx, selectedExId])

  // Step timer logic
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setStepTimer(prev => {
        if (prev <= 1) {
          // Advance to next step
          if (activeStepIdx < currentEx.steps.length - 1) {
            setActiveStepIdx(s => s + 1)
            return currentEx.steps[activeStepIdx + 1].durationSecs
          } else {
            // Exercise complete
            setIsPlaying(false)
            if (!completedExs.includes(currentEx.id)) {
              setCompletedExs(c => [...c, currentEx.id])
            }
            onComplete?.()
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, activeStepIdx, selectedExId, currentEx])

  const handleSelectExercise = (id: string) => {
    setSelectedExId(id)
    setActiveStepIdx(0)
    setIsPlaying(false)
    const ex = PHYSICAL_EXERCISES.find(e => e.id === id)
    if (ex) setStepTimer(ex.steps[0].durationSecs)
  }

  const handleReset = () => {
    setActiveStepIdx(0)
    setIsPlaying(false)
    setStepTimer(currentEx.steps[0].durationSecs)
  }

  const isExFinished = completedExs.includes(currentEx.id) && !isPlaying && activeStepIdx === currentEx.steps.length - 1 && stepTimer === 0

  return (
    <div className="rounded-3xl border border-[#bae6fd] bg-gradient-to-br from-[#f0f9ff] via-[#f8fafc] to-white p-6 sm:p-7 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e0f2fe] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0284c7] uppercase tracking-wider">
            <HeartPulse size={15} />
            <span>Somatic Movement & Physical Tension Release</span>
          </div>
          <h3 className="text-xl font-bold text-[#0c4a6e] mt-1">Physical Exercise & Body Somatics</h3>
          <p className="text-xs text-[#527770] mt-0.5 max-w-xl">
            Physical stress accumulates in motor muscles. Practice these 3 human somatic exercises to discharge physical tension.
          </p>
        </div>

        {/* Completed count badge */}
        <div className="flex items-center gap-2 rounded-2xl bg-[#e0f2fe] border border-[#bae6fd] px-3.5 py-2 text-xs font-bold text-[#0369a1] shrink-0">
          <Dumbbell size={16} />
          <span>{completedExs.length} / {PHYSICAL_EXERCISES.length} Exercises Done</span>
        </div>
      </div>

      {/* Exercise Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PHYSICAL_EXERCISES.map(ex => {
          const isSelected = ex.id === selectedExId
          const isDone = completedExs.includes(ex.id)
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelectExercise(ex.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-[#0284c7] bg-white shadow-md shadow-[#0284c7]/10'
                  : 'border-[#e0f2fe] bg-white/60 hover:bg-white hover:border-[#bae6fd]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{ex.icon}</span>
                {isDone && (
                  <span className="flex items-center gap-1 rounded-full bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 text-[10px] font-extrabold text-[#15803d]">
                    <CheckCircle2 size={11} /> Done
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-[#0c4a6e] mt-2.5">{ex.title}</p>
              <p className="text-[10px] text-[#64748b] mt-0.5 line-clamp-1">{ex.category}</p>
            </button>
          )
        })}
      </div>

      {/* Main Guided Exercise Execution Card */}
      <div className="rounded-2xl border-2 border-[#bae6fd] bg-white p-6 shadow-sm space-y-5">
        
        {/* Title & Clinical Rationale */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f9ff] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentEx.icon}</span>
              <h4 className="text-lg font-bold text-[#0c4a6e]">{currentEx.title}</h4>
            </div>
            <p className="text-xs text-[#475569] mt-1">{currentEx.subtitle}</p>
          </div>
          <span className="rounded-xl bg-[#f0f9ff] border border-[#bae6fd] px-3 py-1.5 text-[11px] font-semibold text-[#0369a1] shrink-0">
            {currentEx.category}
          </span>
        </div>

        {/* Step Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#64748b] font-semibold">
            <span>Step {activeStepIdx + 1} of {currentEx.steps.length}: <strong className="text-[#0c4a6e]">{currentStep.bodyPart}</strong></span>
            <span className="text-[#0284c7] font-bold uppercase">{currentStep.action}</span>
          </div>
          <div className="flex gap-1.5">
            {currentEx.steps.map((s, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  idx < activeStepIdx
                    ? 'bg-[#0284c7]'
                    : idx === activeStepIdx
                    ? 'bg-[#38bdf8] animate-pulse'
                    : 'bg-[#e2e8f0]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Interactive Somatic Action Display */}
        <div className={`rounded-2xl p-6 text-center border-2 transition-all duration-500 ${
          currentStep.action === 'tense'
            ? 'bg-[#fff7ed] border-[#fdba74] text-[#c2410c]'
            : currentStep.action === 'release'
            ? 'bg-[#f0fdf4] border-[#86efac] text-[#15803d]'
            : currentStep.action === 'shake'
            ? 'bg-[#fefce8] border-[#fde047] text-[#a16207]'
            : 'bg-[#f0f9ff] border-[#93c5fd] text-[#1d4ed8]'
        }`}>
          {/* Animated Action Icon / State */}
          <div className="inline-flex items-center justify-center size-20 rounded-full bg-white shadow-md mb-3 text-3xl animate-in zoom-in-95">
            {currentStep.action === 'tense' ? '✊' : currentStep.action === 'release' ? '👐' : currentStep.action === 'shake' ? '⚡' : '🧘'}
          </div>

          <div className="space-y-1">
            <span className="inline-block rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-white/80 shadow-2xs">
              Action: {currentStep.action} ({currentStep.bodyPart})
            </span>
            <p className="text-base font-bold sm:text-lg leading-snug max-w-lg mx-auto pt-1">
              &ldquo;{currentStep.instruction}&rdquo;
            </p>
          </div>

          {/* Countdown Timer Circle */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full border shadow-2xs">
            <Activity size={16} className={isPlaying ? 'animate-spin text-[#0284c7]' : 'text-slate-400'} />
            <span className="text-2xl font-extrabold font-mono text-[#0c4a6e]">{stepTimer}s</span>
          </div>
        </div>

        {/* Exercise Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer ${
                isPlaying ? 'bg-[#ea580c] hover:bg-[#c2410c]' : 'bg-[#0284c7] hover:bg-[#0369a1]'
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause Exercise' : isExFinished ? 'Restart Exercise' : 'Start Guided Exercise'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>

          {activeStepIdx < currentEx.steps.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveStepIdx(s => s + 1)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-[#bae6fd] bg-[#f0f9ff] text-xs font-bold text-[#0284c7] hover:bg-[#e0f2fe] cursor-pointer"
            >
              <span>Skip to Next Step</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Clinical Note Footer */}
        <div className="rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3.5 text-[11px] text-[#64748b] leading-relaxed flex items-start gap-2.5">
          <Sparkles size={15} className="text-[#0284c7] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#334155]">Somatic Physiology Note:</strong> {currentEx.clinicalNote}
          </div>
        </div>

      </div>
    </div>
  )
}
