'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  HeartHandshake,
  Wind,
  Compass,
  Calendar,
  PhoneCall,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Check,
  Play,
  RotateCcw,
  Volume2,
  AlertOctagon,
  Award,
  CircleDot
} from 'lucide-react'
import { RiskLevel, AppointmentRecord } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'
import { AVAILABLE_APPOINTMENT_SLOTS } from '@/lib/mock-data'

interface WellbeingJourneyViewProps {
  currentRiskLevel: RiskLevel
  onScheduleAppointment: (appointment: AppointmentRecord) => void
  scheduledAppointments: AppointmentRecord[]
  onTriggerSOS: () => void
  onOpenAudioTools: () => void
}

interface BubbleItem {
  id: number
  word: string
  x: number
  y: number
  size: number
  color: string
  popped: boolean
}

const INITIAL_BUBBLES: BubbleItem[] = [
  { id: 1, word: 'Breathe', x: 15, y: 35, size: 74, color: '#1d8272', popped: false },
  { id: 2, word: 'Peace', x: 38, y: 20, size: 82, color: '#2563eb', popped: false },
  { id: 3, word: 'Courage', x: 65, y: 30, size: 78, color: '#7c3aed', popped: false },
  { id: 4, word: 'Safety', x: 82, y: 55, size: 85, color: '#059669', popped: false },
  { id: 5, word: 'Calm', x: 28, y: 65, size: 76, color: '#0891b2', popped: false },
  { id: 6, word: 'Hope', x: 52, y: 60, size: 80, color: '#ea580c', popped: false },
  { id: 7, word: 'Clarity', x: 74, y: 15, size: 70, color: '#4f46e5', popped: false }
]

export function WellbeingJourneyView({
  currentRiskLevel,
  onScheduleAppointment,
  scheduledAppointments,
  onTriggerSOS,
  onOpenAudioTools
}: WellbeingJourneyViewProps) {
  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  // Appointment scheduling modal/drawer state
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState('slot-1')
  const [meetingMode, setMeetingMode] = useState<'Secure Video Call' | 'Telephonic Audio' | 'In-Person Safe Clinic'>('Secure Video Call')
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Box Breathing Interactive State
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale')
  const [breathSeconds, setBreathSeconds] = useState(4)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)

  // Zen Bubble Popping Relaxation Game State
  const [bubbles, setBubbles] = useState<BubbleItem[]>(INITIAL_BUBBLES)
  const [stressReleasedCount, setStressReleasedCount] = useState(0)

  // Audio Context for Zen Bubble chimes
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Box breathing timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (breathingActive) {
      timer = setInterval(() => {
        setBreathSeconds(prev => {
          if (prev <= 1) {
            setBreathPhase(current => {
              if (current === 'Inhale') return 'Hold'
              if (current === 'Hold') return 'Exhale'
              if (current === 'Exhale') return 'Rest'
              setCyclesCompleted(c => c + 1)
              return 'Inhale'
            })
            return 4
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [breathingActive])

  // Play peaceful chime on bubble pop
  const playChime = (freq = 528) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 1.2)
    } catch {}
  }

  const handlePopBubble = (id: number) => {
    const freqs = [432, 528, 639, 741, 852, 963, 480]
    playChime(freqs[id % freqs.length])

    setBubbles(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b))
    setStressReleasedCount(prev => prev + 1)
  }

  const handleResetBubbles = () => {
    setBubbles(INITIAL_BUBBLES.map(b => ({ ...b, popped: false })))
  }

  const handleOpenCall = (name: string, role: string, phone: string) => {
    setTeleRecipient({ name, role, phone })
    setTeleModalOpen(true)
  }

  const handleConfirmAppointment = () => {
    const chosenSlot = AVAILABLE_APPOINTMENT_SLOTS.find(s => s.id === selectedSlotId) || AVAILABLE_APPOINTMENT_SLOTS[0]
    const newAppointment: AppointmentRecord = {
      id: `APT-${Date.now().toString().slice(-4)}`,
      doctor_name: 'Dr. Ramesh Chandra',
      doctor_title: 'Senior Clinical Psychiatrist',
      doctor_specialization: 'Trauma & Psychological Triage · NIMHANS',
      slot_time: chosenSlot.time,
      date: `${chosenSlot.date} (${chosenSlot.period})`,
      status: 'Confirmed',
      meeting_mode: meetingMode,
      notes: 'Scheduled via NHAA Safe Space Wellbeing Journey'
    }

    onScheduleAppointment(newAppointment)
    setBookingSuccess(true)
    setTimeout(() => {
      setAppointmentModalOpen(false)
      setBookingSuccess(false)
    }, 2000)
  }

  const isNormal = currentRiskLevel === 'Low'
  const isModerate = currentRiskLevel === 'Moderate'
  const isHigh = currentRiskLevel === 'High' || currentRiskLevel === 'Critical'

  return (
    <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* FLOW 1: NORMAL CONDITION FLOW */}
      {/* ========================================================================= */}
      {isNormal && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#e2ece7] pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Normal &amp; Stable Emotional Baseline</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">Your Wellbeing Journey</h1>
            <p className="mt-1.5 text-xs text-[#68857e]">
              You&apos;re doing well. Let&apos;s continue building healthy habits and emotional resilience together.
            </p>
          </div>

          {/* Calming Activities Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Box Breathing Guided Widget */}
            <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
                      <Wind size={17} />
                    </span>
                    <h3 className="font-bold text-base text-[#183f39]">2-Minute Box Breathing</h3>
                  </div>
                  <span className="rounded-xl bg-[#eaf6f2] px-2.5 py-1 text-[11px] font-bold text-[#1d8272]">
                    4-4-4 Rhythm
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#6b8881]">
                  Inhale, hold, exhale, and rest in equal 4-second intervals to maintain autonomic nervous balance.
                </p>

                {/* Animated Pulsing Breathing Ring */}
                <div className="my-8 flex items-center justify-center">
                  <div className="relative size-44 flex items-center justify-center">
                    <div
                      className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                        !breathingActive
                          ? 'scale-80 bg-[#e4f4ef] opacity-50'
                          : breathPhase === 'Inhale'
                          ? 'scale-100 bg-[#bcece0] opacity-90 shadow-[0_0_30px_rgba(29,130,114,0.3)]'
                          : breathPhase === 'Hold'
                          ? 'scale-100 bg-[#9ce5d4] opacity-100'
                          : breathPhase === 'Exhale'
                          ? 'scale-65 bg-[#eaf7f3] opacity-70'
                          : 'scale-65 bg-[#e4f4ef] opacity-50'
                      }`}
                    />
                    <div className="relative z-10 text-center">
                      <p className="text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                        {breathingActive ? breathPhase : 'Ready'}
                      </p>
                      <p className="text-3xl font-extrabold text-[#16443c] mt-0.5">
                        {breathingActive ? `${breathSeconds}s` : '4s'}
                      </p>
                      {breathingActive && (
                        <p className="text-[10px] text-[#6d8a83] mt-1 font-medium">
                          Cycle {cyclesCompleted + 1}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBreathingActive(!breathingActive)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md transition active:scale-95 ${
                    breathingActive
                      ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                      : 'bg-[#1d8272] text-white hover:bg-[#186f60]'
                  }`}
                >
                  <Play size={14} />
                  <span>{breathingActive ? 'Pause Exercise' : 'Start Box Breathing'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBreathingActive(false)
                    setBreathPhase('Inhale')
                    setBreathSeconds(4)
                    setCyclesCompleted(0)
                  }}
                  className="p-2.5 rounded-xl border border-[#d6e5df] text-[#6b8781] hover:bg-[#f0f6f3]"
                  title="Reset"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Zen Bubble Popping Relaxation Game */}
            <div className="rounded-3xl border border-[#d3e5df] bg-gradient-to-b from-[#f7fbf9] to-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
                      <Sparkles size={17} />
                    </span>
                    <h3 className="font-bold text-base text-[#183f39]">Zen Bubble Pop Game</h3>
                  </div>
                  <span className="rounded-xl bg-[#eaf6f2] px-2.5 py-1 text-[11px] font-bold text-[#1d8272]">
                    {stressReleasedCount} Stress Points Released
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#6b8881]">
                  Click or tap the floating mindful bubbles to pop intrusive tension and hear a soothing harmonic chime.
                </p>

                {/* Bubble Canvas Area */}
                <div className="relative h-60 w-full rounded-2xl bg-gradient-to-br from-[#12312b] to-[#1a4a40] mt-4 overflow-hidden border border-[#235850] shadow-inner flex items-center justify-center">
                  {bubbles.map((bubble) => (
                    !bubble.popped ? (
                      <button
                        key={bubble.id}
                        onClick={() => handlePopBubble(bubble.id)}
                        className="absolute rounded-full text-white font-bold text-xs flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer animate-pulse"
                        style={{
                          left: `${bubble.x}%`,
                          top: `${bubble.y}%`,
                          width: `${bubble.size}px`,
                          height: `${bubble.size}px`,
                          backgroundColor: `${bubble.color}cc`,
                          backdropFilter: 'blur(4px)',
                          border: '2px solid rgba(255,255,255,0.4)'
                        }}
                      >
                        {bubble.word}
                      </button>
                    ) : null
                  ))}

                  {bubbles.every(b => b.popped) && (
                    <div className="text-center p-4 bg-black/40 backdrop-blur-md rounded-2xl text-white animate-in zoom-in-95 duration-200">
                      <Award size={32} className="mx-auto text-[#a4ebd9]" />
                      <p className="text-sm font-bold mt-2">All Mindful Bubbles Cleared!</p>
                      <p className="text-xs text-[#a4ebd9] mt-0.5">Your mind is grounded and peaceful.</p>
                      <button
                        onClick={handleResetBubbles}
                        className="mt-3 rounded-xl bg-[#1d8272] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#186f60]"
                      >
                        Spawn New Bubbles
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#edf4f0] mt-4">
                <span className="text-[11px] text-[#73928a]">Click bubbles to release sound chimes</span>
                <button
                  type="button"
                  onClick={handleResetBubbles}
                  className="flex items-center gap-1 text-xs font-bold text-[#1d8272] hover:underline"
                >
                  <RotateCcw size={13} />
                  <span>Reset Bubbles</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW 2: MODERATE CONDITION FLOW */}
      {/* ========================================================================= */}
      {isModerate && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#e2ece7] pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#b87817] uppercase tracking-wider">
              <UserCheck size={14} />
              <span>Personalized Professional Support Active</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">Your Personalized Support Journey</h1>
            <p className="mt-1.5 text-xs text-[#68857e]">
              A licensed clinical psychologist has been assigned to guide your emotional processing and recovery.
            </p>
          </div>

          {/* Assigned Psychiatrist Professional Card */}
          <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-[#1d8272] to-[#14574c] text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0 border-2 border-white">
                  RC
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-[#163a34]">Dr. Ramesh Chandra</h2>
                    <span className="rounded-full bg-[#e4f4ef] border border-[#bfe2d7] px-2.5 py-0.5 text-[10px] font-bold text-[#1d8272]">
                      Assigned Psychiatrist
                    </span>
                  </div>
                  <p className="text-xs text-[#527770] font-medium mt-1">
                    MD Psychiatry · NIMHANS Trained · Trauma &amp; Crisis Response Specialist
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#1d8272] font-semibold">
                    <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span>Available Today for Tele-Consultation &amp; Support Plan Review</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenCall('Dr. Ramesh Chandra', 'Senior Clinical Psychiatrist', '+91 98101 23456')}
                  className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white px-5 py-3 text-xs font-bold shadow-md transition active:scale-95"
                >
                  <PhoneCall size={15} />
                  <span>Call Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(true)}
                  className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border border-[#cce4dc] bg-[#f2f8f5] hover:bg-[#e4f2ec] text-[#1a5b50] px-5 py-3 text-xs font-bold transition active:scale-95"
                >
                  <Calendar size={15} />
                  <span>Schedule Appointment</span>
                </button>
              </div>
            </div>

            {/* Scheduled Appointments Display */}
            {scheduledAppointments.length > 0 && (
              <div className="mt-6 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] p-4 text-[#065f46] animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-[#10b981]" />
                    <div>
                      <p className="text-xs font-bold">Your appointment has been scheduled successfully.</p>
                      <p className="text-[11px] text-[#047857] mt-0.5">
                        Session with {scheduledAppointments[0].doctor_name} on {scheduledAppointments[0].date} at {scheduledAppointments[0].slot_time} ({scheduledAppointments[0].meeting_mode}).
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-[#1d8272] border border-[#a7f3d0]">
                    Confirmed
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3-Step Moderate Clinical Care Plan */}
          <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 sm:p-7 shadow-xs">
            <h3 className="text-base font-bold text-[#183f39]">Recommended 3-Stage Support Plan</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-2xl bg-[#f7faf8] border border-[#e2ede8]">
                <span className="text-[10px] font-bold text-[#1d8272] uppercase">Phase 1</span>
                <h4 className="font-bold text-xs text-[#193e38] mt-1">Cognitive Grounding</h4>
                <p className="text-[11px] text-[#6d8a83] mt-1">
                  Daily box breathing and soundscape calming to lower acute panic.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f7faf8] border border-[#e2ede8]">
                <span className="text-[10px] font-bold text-[#1d8272] uppercase">Phase 2</span>
                <h4 className="font-bold text-xs text-[#193e38] mt-1">Tele-Consultation</h4>
                <p className="text-[11px] text-[#6d8a83] mt-1">
                  1-on-1 session with Dr. Ramesh Chandra to review trauma triggers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f7faf8] border border-[#e2ede8]">
                <span className="text-[10px] font-bold text-[#1d8272] uppercase">Phase 3</span>
                <h4 className="font-bold text-xs text-[#193e38] mt-1">Weekly Follow-Up</h4>
                <p className="text-[11px] text-[#6d8a83] mt-1">
                  Structured resilience check-in and institutional protection notice.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW 3: HIGH-RISK CONDITION FLOW */}
      {/* ========================================================================= */}
      {isHigh && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#e2ece7] pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#dc2626] uppercase tracking-wider">
              <AlertOctagon size={14} />
              <span>Immediate Support Network Activated</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">Immediate Support Network</h1>
            <p className="mt-1.5 text-xs text-[#68857e]">
              You are not alone. Your support network has been notified and is available to help protect and guide you immediately.
            </p>
          </div>

          {/* Dual Support Cards Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Card 1: Psychiatrist Support */}
            <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#edf4f0] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-[#1d8272] text-white flex items-center justify-center text-base font-bold shadow-sm">
                      RC
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#183e38]">Dr. Ramesh Chandra</h3>
                      <p className="text-[11px] text-[#5f7e77]">Lead Psychological Triage</p>
                    </div>
                  </div>
                  <span className="rounded-xl bg-[#e4f4ef] px-2.5 py-1 text-[10px] font-bold text-[#1d8272]">
                    Assigned
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-[#527770]">
                  <p className="flex items-center gap-2 font-medium">
                    <Check size={14} className="text-[#10b981]" />
                    <span>Specialized trauma de-escalation protocol</span>
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <Check size={14} className="text-[#10b981]" />
                    <span>Priority Tele-Consultation slot reserved</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCall('Dr. Ramesh Chandra', 'Senior Clinical Psychiatrist', '+91 98101 23456')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white py-2.5 text-xs font-bold shadow-sm transition"
                >
                  <PhoneCall size={14} />
                  <span>Call Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-[#cbe4db] bg-[#f0f8f5] hover:bg-[#e2f1ec] text-[#1a5b50] py-2.5 text-xs font-bold transition"
                >
                  <Calendar size={14} />
                  <span>Book Slot</span>
                </button>
              </div>
            </div>

            {/* Card 2: Emergency / Police Safety Support */}
            <div className="rounded-3xl border border-[#fca5a5] bg-[#fffbfb] p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#fee2e2] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center text-base font-bold shadow-sm">
                      VS
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#991b1b]">Insp. Vikram Pratap Singh</h3>
                      <p className="text-[11px] text-[#b91c1c]">Law Enforcement Liaison · Nodal Officer</p>
                    </div>
                  </div>
                  <span className="rounded-xl bg-[#fee2e2] px-2.5 py-1 text-[10px] font-bold text-[#dc2626] border border-[#fca5a5]">
                    Active Protection
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-[#7f1d1d]">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck size={14} className="text-[#dc2626]" />
                    <span>Special PoA Protection Cell notified</span>
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck size={14} className="text-[#dc2626]" />
                    <span>24x7 Escort &amp; PCR Van coordination ready</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCall('Insp. Vikram Pratap Singh', 'Law Enforcement Liaison', '+91 94220 98765')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white py-2.5 text-xs font-bold shadow-sm transition"
                >
                  <PhoneCall size={14} />
                  <span>Call Officer</span>
                </button>
                <button
                  type="button"
                  onClick={onTriggerSOS}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-[#fca5a5] bg-white hover:bg-[#fee2e2] text-[#991b1b] py-2.5 text-xs font-bold transition"
                >
                  <AlertOctagon size={14} />
                  <span>Trigger SOS</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5-Step Journey Status Timeline */}
          <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-[#183f39]">Active Protection Journey Progress</h3>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { step: 1, title: 'Story Shared', status: 'Completed', color: 'bg-[#10b981]' },
                { step: 2, title: 'Assessment Completed', status: 'Completed', color: 'bg-[#10b981]' },
                { step: 3, title: 'Psychiatrist Assigned', status: 'Active', color: 'bg-[#1d8272]' },
                { step: 4, title: 'Safety Support Activated', status: 'Active', color: 'bg-[#dc2626]' },
                { step: 5, title: 'Ongoing Support', status: 'In Progress', color: 'bg-[#f59e0b]' }
              ].map((item) => (
                <div key={item.step} className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e5efe9] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#718f88]">Step {item.step}</span>
                      <span className={`size-2.5 rounded-full ${item.color}`} />
                    </div>
                    <p className="font-bold text-xs text-[#1c443e] mt-1.5">{item.title}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#1d8272] mt-3">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {appointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#d6e5df] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-[#edf4f0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#183e38]">Schedule Tele-Consultation</h3>
                <p className="text-xs text-[#6e8e86]">Select an available slot with Dr. Ramesh Chandra</p>
              </div>
              <button onClick={() => setAppointmentModalOpen(false)} className="text-[#718f88] hover:text-[#183e38]">
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="size-14 rounded-full bg-[#10b981] text-white flex items-center justify-center mx-auto shadow-md">
                  <Check size={28} />
                </div>
                <h4 className="font-bold text-sm text-[#183e38]">Your appointment has been scheduled successfully.</h4>
                <p className="text-xs text-[#6e8e86]">
                  A reminder will be sent 30 minutes prior to the session.
                </p>
              </div>
            ) : (
              <>
                {/* Mode Selector */}
                <div>
                  <label className="text-xs font-bold text-[#2a4e47]">Consultation Mode:</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-xs">
                    {(['Secure Video Call', 'Telephonic Audio', 'In-Person Safe Clinic'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMeetingMode(m)}
                        className={`p-2 rounded-xl text-[11px] font-semibold border transition ${
                          meetingMode === m
                            ? 'bg-[#1d8272] text-white border-[#1d8272]'
                            : 'bg-[#fbfcfb] border-[#d8e6e1] text-[#55766f] hover:bg-[#eef6f3]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <label className="text-xs font-bold text-[#2a4e47]">Available Time Slots:</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_APPOINTMENT_SLOTS.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-2xl text-left border transition ${
                          selectedSlotId === slot.id
                            ? 'bg-[#e4f4ef] border-[#1d8272] text-[#18453e] font-bold shadow-xs'
                            : 'bg-white border-[#d8e6e1] text-[#597a73] hover:border-[#b4d8cc]'
                        }`}
                      >
                        <p className="text-xs font-bold">{slot.date} – {slot.time}</p>
                        <p className="text-[10px] text-[#718f88] mt-0.5">{slot.period} Slot</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirm Button */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#edf4f0]">
                  <button
                    type="button"
                    onClick={() => setAppointmentModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#6e8e86]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAppointment}
                    className="px-5 py-2.5 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white text-xs font-bold shadow-md transition"
                  >
                    Confirm Appointment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tele-Call Modal */}
      <TeleCallModal
        isOpen={teleModalOpen}
        onClose={() => setTeleModalOpen(false)}
        recipientName={teleRecipient.name}
        recipientRole={teleRecipient.role}
        recipientPhone={teleRecipient.phone}
      />
    </div>
  )
}
