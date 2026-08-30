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
  CircleDot,
  Brain,
  MapPin,
  Lock,
  Stethoscope
} from 'lucide-react'
import { RiskLevel, AppointmentRecord, CaseRecord, UserProfile, InterventionSession } from '@/types'
import { safetyGateFromRiskLevel } from '@/lib/safety-gate'
import { recommendIntervention, INTERVENTION_META } from '@/lib/recommendation-engine'
import { AdaptiveInterventionModal } from '@/components/victim/adaptive-intervention-modal'
import { TeleCallModal } from '@/components/victim/tele-call-modal'
import { AVAILABLE_APPOINTMENT_SLOTS } from '@/lib/mock-data'
import { WellbeingService } from '@/lib/services/wellbeing-service'
import { AppointmentService } from '@/lib/services/appointment-service'
import { t } from '@/lib/i18n'
import { BeforeAfterComparison } from '@/components/victim/before-after-comparison'
import { MindfulMemoryGame } from '@/components/victim/interventions/mindful-memory-game'
import { PhysicalExerciseActivity } from '@/components/victim/interventions/physical-exercise-activity'

interface WellbeingJourneyViewProps {
  currentRiskLevel: RiskLevel
  activeCase?: CaseRecord | null
  currentUser?: UserProfile
  currentLanguage?: string
  onScheduleAppointment: (appointment: AppointmentRecord) => void
  scheduledAppointments: AppointmentRecord[]
  onTriggerSOS: () => void
  onOpenAudioTools: () => void
  /** Day 4: opens WellbeingToolsModal pinned to the 5-4-3-2-1 grounding tab */
  onOpenGroundingTool?: () => void
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
  activeCase,
  currentUser,
  currentLanguage = 'en',
  onScheduleAppointment,
  scheduledAppointments,
  onTriggerSOS,
  onOpenAudioTools,
  onOpenGroundingTool
}: WellbeingJourneyViewProps) {
  // Dynamic journey computed from active case state
  const journey = WellbeingService.getJourneyForCase(activeCase)

  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  // Appointment scheduling modal/drawer state
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState('slot-1')
  const [meetingMode, setMeetingMode] = useState<'Secure Video Call' | 'Telephonic Audio' | 'In-Person Safe Clinic'>('Secure Video Call')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)

  // ── Day 4: Adaptive Intervention Modal ─────────────────────────────────────
  const [adaptiveModalOpen, setAdaptiveModalOpen] = useState(false)
  const [completedSessions, setCompletedSessions] = useState<InterventionSession[]>([])

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

  const handleConfirmAppointment = async () => {
    setBookingLoading(true)
    const chosenSlot = AVAILABLE_APPOINTMENT_SLOTS.find(s => s.id === selectedSlotId) || AVAILABLE_APPOINTMENT_SLOTS[0]
    const doctorName = journey.assignedPsychiatrist || 'Dr. Ramesh Chandra'

    const newAppointment: Omit<AppointmentRecord, 'id'> = {
      case_id: activeCase?.id,
      victim_user_id: currentUser?.id,
      psychiatrist_id: activeCase?.assigned_counsellor_id,
      doctor_name: doctorName,
      doctor_title: 'Senior Clinical Psychiatrist',
      doctor_specialization: 'Trauma & Psychological Triage · NIMHANS',
      slot_time: chosenSlot.time,
      date: `${chosenSlot.date} (${chosenSlot.period})`,
      status: 'Confirmed',
      meeting_mode: meetingMode,
      notes: `Scheduled via NHAA Safe Space for Case ${activeCase?.id || 'Active'}`
    }

    const res = await AppointmentService.bookAppointment(newAppointment)
    setBookingLoading(false)

    if (res.data) {
      onScheduleAppointment(res.data)
      setBookingSuccess(true)
      setTimeout(() => {
        setAppointmentModalOpen(false)
        setBookingSuccess(false)
      }, 1800)
    }
  }

  // ── Day 4: Safety Gate flags ─────────────────────────────────────────
  // UI components MUST read these flags — never re-check risk_level locally.
  const gateResult = safetyGateFromRiskLevel(currentRiskLevel)
  const isWellbeing    = gateResult.gate === 'WELLBEING'      // Low
  const isSupport      = gateResult.gate === 'SUPPORT'        // Moderate
  const isHumanReview  = gateResult.gate === 'HUMAN_REVIEW'   // High
  const isSafetyPathway = gateResult.gate === 'SAFETY_PATHWAY' // Critical
  // ──────────────────────────────────────────────────────────────────────

  // ── Day 4: Recommendation Engine ────────────────────────────────────────────
  // Compute recommended intervention path from gate + case assessment.
  // Falls back to gate-only if no active case (demo mode).
  const recommendation = (() => {
    if (activeCase?.stress_assessment) {
      return recommendIntervention(gateResult.gate, activeCase.stress_assessment)
    }
    // Fallback for demo / no case context
    return recommendIntervention(gateResult.gate, {
      id: 'DEMO',
      case_id: '',
      svi_score: currentRiskLevel === 'Low' ? 12 : currentRiskLevel === 'Moderate' ? 38 : 62,
      risk_level: currentRiskLevel,
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
      assessed_at: new Date().toISOString()
    })
  })()
  const recMeta = INTERVENTION_META[recommendation.path]
  // ────────────────────────────────────────────────────────────────────────────

  // Legacy aliases used in the active-case bar coloring below
  const isModerate = isSupport
  const isHigh     = isHumanReview || isSafetyPathway

  return (
    <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
      {/* Active Case Context Bar */}
      {activeCase && (
        <div className="rounded-2xl border border-[#cfe3dc] bg-white/90 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
              <Sparkles size={15} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#163a34]">Active Case:</span>
                <span className="font-mono text-xs font-bold text-[#1d8272] bg-[#edf7f3] px-2 py-0.5 rounded border border-[#cfe6dc]">
                  {activeCase.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isHigh ? 'bg-[#fee2e2] text-[#b91c1c]' : isModerate ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#dcfce7] text-[#15803d]'
                }`}>
                  SVI {journey.sviScore}/100 &bull; {currentRiskLevel} Risk
                </span>
              </div>
              <p className="text-[11px] text-[#63877f] mt-0.5">
                {journey.keyFocus}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {journey.assignedPsychiatrist && (
              <span className="text-[#0369a1] font-semibold flex items-center gap-1">
                <Brain size={13} />
                <span>{journey.assignedPsychiatrist}</span>
              </span>
            )}
            {journey.assignedOfficer && (
              <span className="text-[#dc2626] font-semibold flex items-center gap-1">
                <MapPin size={13} />
                <span>{journey.assignedOfficer}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW 1: WELLBEING (Low risk) */}
      {/* ========================================================================= */}
      {isWellbeing && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#e2ece7] pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
              <Sparkles size={14} />
              <span>{t('badge_normal', currentLanguage)}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">{t('healing_journey_card_title', currentLanguage)}</h1>
            <p className="mt-1.5 text-xs text-[#68857e]">
              {t('healing_journey_card_desc', currentLanguage)}
            </p>

            {/* Day 4: Recommendation Chip + CTA */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold border"
                style={{ backgroundColor: recMeta.bgColor, borderColor: recMeta.borderColor, color: recMeta.color }}
              >
                <span>{recMeta.icon}</span>
                <span>Recommended: <strong>{recommendation.label}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setAdaptiveModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer"
                style={{ backgroundColor: recMeta.color, boxShadow: `0 4px 12px ${recMeta.color}30` }}
              >
                <span>{recMeta.icon}</span>
                <span>Start {recommendation.label}</span>
              </button>
              {completedSessions.length > 0 && (
                <span className="text-[10px] text-[#059669] font-bold">
                  ✓ {completedSessions.length} session{completedSessions.length !== 1 ? 's' : ''} completed today
                </span>
              )}
            </div>
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
                    <h3 className="font-bold text-base text-[#183f39]">{t('wb_box_breathing_title', currentLanguage)}</h3>
                  </div>
                  <span className="rounded-xl bg-[#eaf6f2] px-2.5 py-1 text-[11px] font-bold text-[#1d8272]">
                    {t('wb_box_breathing_rhythm', currentLanguage)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#6b8881]">
                  {t('wb_box_breathing_desc', currentLanguage)}
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
                        {breathingActive ? t(`wb_breath_${breathPhase.toLowerCase()}`, currentLanguage) : t('wb_breath_ready', currentLanguage)}
                      </p>
                      <p className="text-3xl font-extrabold text-[#16443c] mt-0.5">
                        {breathingActive ? `${breathSeconds}s` : '4s'}
                      </p>
                      {breathingActive && (
                        <p className="text-[10px] text-[#6d8a83] mt-1 font-medium">
                          {t('wb_cycle', currentLanguage)} {cyclesCompleted + 1}
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
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer ${
                    breathingActive
                      ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                      : 'bg-[#1d8272] text-white hover:bg-[#186f60]'
                  }`}
                >
                  <Play size={14} />
                  <span>{breathingActive ? t('wb_pause_breathing', currentLanguage) : t('wb_start_breathing', currentLanguage)}</span>
                </button>
              </div>
            </div>

            {/* Zen Bubble Popping Relaxation Game */}
            <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#e8f1fd] text-[#2563eb]">
                      <Sparkles size={17} />
                    </span>
                    <h3 className="font-bold text-base text-[#183f39]">{t('wb_zen_bubbles_title', currentLanguage)}</h3>
                  </div>
                  <span className="rounded-xl bg-[#eff6ff] px-2.5 py-1 text-[11px] font-bold text-[#2563eb]">
                    {t('wb_zen_bubbles_subtitle', currentLanguage)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#6b8881]">
                  {t('wb_zen_bubbles_desc', currentLanguage)}
                </p>

                {/* Bubble Game Canvas */}
                <div className="relative my-4 h-48 rounded-2xl bg-gradient-to-tr from-[#f0f9f6] via-[#f7fbf9] to-[#edf6ff] border border-[#d8ece4] overflow-hidden">
                  {bubbles.map(bubble => (
                    <button
                      key={bubble.id}
                      type="button"
                      onClick={() => handlePopBubble(bubble.id)}
                      disabled={bubble.popped}
                      style={{
                        left: `${bubble.x}%`,
                        top: `${bubble.y}%`,
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        backgroundColor: `${bubble.color}22`,
                        borderColor: bubble.color
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-bold text-xs cursor-pointer shadow-sm hover:scale-110 active:scale-95 ${
                        bubble.popped ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
                      }`}
                    >
                      <span style={{ color: bubble.color }}>{bubble.word}</span>
                    </button>
                  ))}

                  {stressReleasedCount === bubbles.length && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs p-4 text-center animate-in fade-in">
                      <Award size={32} className="text-[#10b981]" />
                      <p className="text-xs font-bold text-[#16443c] mt-1">{t('wb_mind_cleared', currentLanguage)}</p>
                      <p className="text-[11px] text-[#6d8a83]">{t('wb_popped_all', currentLanguage)}</p>
                      <button
                        type="button"
                        onClick={handleResetBubbles}
                        className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#1d8272] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#186f60] cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>{t('wb_play_again', currentLanguage)}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6e8f87] pt-2">
                <span>{t('wb_bubbles_popped', currentLanguage)} <strong>{stressReleasedCount}</strong> / {bubbles.length}</span>
                <button
                  type="button"
                  onClick={handleResetBubbles}
                  className="flex items-center gap-1 text-[#1d8272] hover:underline font-bold cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{t('wb_reset_bubbles', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mindful Memory Flip Game — Wellbeing Mode Interactive Game */}
          <MindfulMemoryGame />
        </div>
      )}

      {/* Before/After Distress Comparison (shown in Wellbeing flow after exercises) */}
      {isWellbeing && activeCase && (
        <BeforeAfterComparison
          caseId={activeCase.id}
          currentLanguage={currentLanguage}
        />
      )}

      {/* ========================================================================= */}
      {/* FLOW 2: SUPPORT (Moderate risk) — grounding exercise + psychiatrist */}
      {/* ========================================================================= */}
      {isSupport && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#e2ece7] pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0284c7] uppercase tracking-wider">
              <Brain size={14} />
              <span>{t('wb_mod_header_badge', currentLanguage)}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">{t('wb_mod_header_title', currentLanguage)}</h1>
            <p className="mt-1.5 text-xs text-[#68857e]">
              {t('wb_mod_header_desc', currentLanguage)}
            </p>

            {/* Day 4: Grounding Exercise CTA — prominent entry point for the modal */}
            {onOpenGroundingTool && (
              <button
                type="button"
                onClick={onOpenGroundingTool}
                className="mt-4 flex items-center gap-2 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#0284c7]/20 transition active:scale-95 cursor-pointer"
              >
                <Compass size={15} />
                <span>Start Grounding Exercise (5-4-3-2-1)</span>
              </button>
            )}

            {/* Day 4: Adaptive Intervention CTA for SUPPORT gate */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold border"
                style={{ backgroundColor: recMeta.bgColor, borderColor: recMeta.borderColor, color: recMeta.color }}
              >
                <span>{recMeta.icon}</span>
                <span>Recommended: <strong>{recommendation.label}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setAdaptiveModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer"
                style={{ backgroundColor: recMeta.color }}
              >
                <span>{recMeta.icon}</span>
                <span>Start {recommendation.label}</span>
              </button>
              {completedSessions.length > 0 && (
                <span className="text-[10px] text-[#0284c7] font-bold">
                  ✓ {completedSessions.length} session{completedSessions.length !== 1 ? 's' : ''} completed today
                </span>
              )}
            </div>
          </div>

          {/* Somatic Movement & Physical Tension Release Suite — Support Mode */}
          <PhysicalExerciseActivity />

          {/* Assigned Psychiatrist Profile & Booking Card */}
          <div className="rounded-3xl border-2 border-[#bae6fd] bg-gradient-to-r from-[#f0f9ff] via-[#f8fbff] to-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0284c7] text-white text-xl font-bold shadow-md shadow-[#0284c7]/20 shrink-0">
                  {((journey.assignedPsychiatrist || 'RC').split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#0c4a6e]">{journey.assignedPsychiatrist || 'Dr. Ramesh Chandra'}</h3>
                    <span className="rounded-full bg-[#e0f2fe] border border-[#bae6fd] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0369a1]">
                      {t('wb_verified_specialist', currentLanguage)}
                    </span>
                  </div>
                  <p className="text-xs text-[#0369a1] font-semibold mt-0.5">
                    Senior Clinical Psychiatrist &bull; Trauma Triage Desk (NIMHANS)
                  </p>
                  <p className="text-xs text-[#527770] mt-2 max-w-xl leading-relaxed">
                    Specialized in acute stress debriefing, caste atrocity trauma care, cognitive somatic grounding, and safe rehabilitation.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCall(journey.assignedPsychiatrist || 'Dr. Ramesh Chandra', 'Lead Clinical Psychiatrist', '+91 98101 23456')}
                  className="flex items-center gap-2 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#0284c7]/20 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={15} />
                  <span>{t('wb_connect_call', currentLanguage)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-[#bae6fd] bg-white hover:bg-[#f0f9ff] text-[#0284c7] px-5 py-3 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Calendar size={15} />
                  <span>{t('wb_book_session', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scheduled Appointments List */}
          {scheduledAppointments.length > 0 && (
            <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[#163a34] mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-[#0284c7]" />
                <span>{t('wb_confirmed_consultations', currentLanguage)}</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {scheduledAppointments.map(apt => (
                  <div key={apt.id} className="p-4 rounded-2xl border border-[#bae6fd] bg-[#f8fbff] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#0c4a6e]">{apt.doctor_name}</p>
                      <p className="text-[11px] text-[#527770]">{apt.date} &bull; {apt.slot_time}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold bg-[#e0f2fe] text-[#0369a1] px-2 py-0.5 rounded">
                        {apt.meeting_mode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCall(apt.doctor_name, apt.doctor_title, '+91 98101 23456')}
                      className="rounded-xl bg-[#0284c7] text-white p-2.5 hover:bg-[#0369a1] transition cursor-pointer"
                    >
                      <PhoneCall size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Milestones Roadmap */}
          <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs">
            <h3 className="text-sm font-bold text-[#163a34] mb-4">{t('wb_dynamic_roadmap', currentLanguage)}</h3>
            <div className="space-y-4">
              {journey.steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#fbfdfc] border border-[#e5f0ec]">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272] font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#163a34]">{step.title}</h4>
                      <span className="text-[10px] font-bold bg-[#eef7f4] text-[#1d8272] px-2 py-0.5 rounded">
                        {step.timeframe}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b8c84] mt-0.5">{step.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Before/After Distress Comparison (shown in Support/Moderate flow) */}
      {isSupport && activeCase && (
        <BeforeAfterComparison
          caseId={activeCase.id}
          currentLanguage={currentLanguage}
        />
      )}

      {/* ========================================================================= */}
      {/* FLOW 3: HUMAN REVIEW (High risk) — psychiatrist + officer, game blocked */}
      {/* ========================================================================= */}
      {isHumanReview && (
        <div className="space-y-8">
          {/* Priority Human Review Banner */}
          <div className="rounded-3xl border-2 border-[#fbbf24] bg-[#fffbeb] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-white shadow-md shadow-[#f59e0b]/20 shrink-0">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#92400e]">
                      Priority Human Review
                    </h2>
                    <span className="rounded-full bg-[#fef3c7] border border-[#fbbf24] px-2.5 py-0.5 text-[10px] font-extrabold text-[#92400e]">
                      {t('wb_tier1_escalation', currentLanguage)}
                    </span>
                  </div>
                  <p className="text-xs text-[#92400e] mt-1 max-w-2xl leading-relaxed">
                    Your case has been flagged for priority human review. A psychiatrist and officer have been notified. The wellbeing game is paused pending clinical clearance.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onTriggerSOS}
                  className="flex items-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-3.5 text-xs font-extrabold shadow-lg shadow-[#dc2626]/30 transition active:scale-95 cursor-pointer"
                >
                  <AlertOctagon size={16} />
                  <span>{t('wb_call_14566', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Assigned Psychiatrist Profile & Booking Card */}
          <div className="rounded-3xl border-2 border-[#bae6fd] bg-gradient-to-r from-[#f0f9ff] via-[#f8fbff] to-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0284c7] text-white text-xl font-bold shadow-md shadow-[#0284c7]/20 shrink-0">
                  {((journey.assignedPsychiatrist || 'RC').split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#0c4a6e]">{journey.assignedPsychiatrist || 'Dr. Ramesh Chandra'}</h3>
                    <span className="rounded-full bg-[#e0f2fe] border border-[#bae6fd] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0369a1]">
                      {t('wb_verified_specialist', currentLanguage)}
                    </span>
                  </div>
                  <p className="text-xs text-[#0369a1] font-semibold mt-0.5">
                    Senior Clinical Psychiatrist &bull; Trauma Triage Desk (NIMHANS)
                  </p>
                  <p className="text-xs text-[#527770] mt-2 max-w-xl leading-relaxed">
                    Specialized in acute stress debriefing, caste atrocity trauma care, cognitive somatic grounding, and safe rehabilitation.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCall(journey.assignedPsychiatrist || 'Dr. Ramesh Chandra', 'Lead Clinical Psychiatrist', '+91 98101 23456')}
                  className="flex items-center gap-2 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#0284c7]/20 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={15} />
                  <span>{t('wb_connect_call', currentLanguage)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-[#bae6fd] bg-white hover:bg-[#f0f9ff] text-[#0284c7] px-5 py-3 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Calendar size={15} />
                  <span>{t('wb_book_session', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Assigned Nearest Officer Dossier Card */}
          <div className="rounded-3xl border border-[#fed7aa] bg-gradient-to-r from-[#fffbf5] to-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[#ea580c] text-white text-xl font-bold shadow-md shadow-[#ea580c]/20 shrink-0">
                  {((journey.assignedOfficer || 'VS').split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#9a3412]">{journey.assignedOfficer || 'Insp. Vikram Pratap Singh'}</h3>
                    <span className="rounded-full bg-[#ffedd5] border border-[#fed7aa] px-2.5 py-0.5 text-[10px] font-extrabold text-[#c2410c]">
                      {t('wb_station_incharge', currentLanguage)}
                    </span>
                  </div>
                  <p className="text-xs text-[#c2410c] font-semibold mt-0.5">
                    {journey.stationName || 'District Special Atrocities Redressal Cell'}
                  </p>
                  <p className="text-xs text-[#6b8c84] mt-2 max-w-xl leading-relaxed">
                    Directly assigned for rapid physical escort, witness protection verification, and statutory zero-FIR filing under PoA Act.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCall(journey.assignedOfficer || 'Insp. Vikram Pratap Singh', 'Nodal Police Escort', '+91 94220 98765')}
                  className="flex items-center gap-2 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#ea580c]/20 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={15} />
                  <span>{t('wb_call_officer_now', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* High Priority Roadmap */}
          <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs">
            <h3 className="text-sm font-bold text-[#163a34] mb-4">{t('wb_emergency_roadmap', currentLanguage)}</h3>
            <div className="space-y-4">
              {journey.steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#fffbfb] border border-[#fecdd3]">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-[#fee2e2] text-[#dc2626] font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#163a34]">{step.title}</h4>
                      <span className="text-[10px] font-bold bg-[#fee2e2] text-[#dc2626] px-2 py-0.5 rounded">
                        {step.timeframe}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b8c84] mt-0.5">{step.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOW 4: SAFETY PATHWAY (Critical) — game hard-blocked, SOS assertive */}
      {/* ========================================================================= */}
      {isSafetyPathway && (
        <div className="space-y-8">
          {/* Safety Pathway Alert — game is fully removed from this branch */}
          <div className="rounded-3xl border-2 border-[#fca5a5] bg-[#fff5f5] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-md shadow-[#dc2626]/20 shrink-0">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#991b1b]">
                      Safety Pathway — Immediate Escalation
                    </h2>
                    <span className="rounded-full bg-[#fecaca] px-2.5 py-0.5 text-[10px] font-extrabold text-[#991b1b]">
                      {t('wb_tier1_escalation', currentLanguage)}
                    </span>
                  </div>
                  <p className="text-xs text-[#991b1b] mt-1 max-w-2xl leading-relaxed">
                    Your case has been escalated for immediate review. An on-call psychiatrist and nodal officer have been notified. Please use the emergency helpline or SOS button below right now.
                  </p>
                </div>
              </div>

              {/* SOS — auto-expanded, assertive */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onTriggerSOS}
                  className="flex items-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-6 py-4 text-sm font-extrabold shadow-xl shadow-[#dc2626]/40 transition active:scale-95 cursor-pointer animate-pulse"
                >
                  <AlertOctagon size={18} />
                  <span>SOS — {t('wb_call_14566', currentLanguage)}</span>
                </button>
                <p className="text-[10px] text-[#b91c1c] font-semibold">Toll-free 24×7 emergency helpline</p>
              </div>
            </div>
          </div>

          {/* Assigned Nearest Officer */}
          <div className="rounded-3xl border border-[#fca5a5] bg-gradient-to-r from-[#fffbf5] to-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[#dc2626] text-white text-xl font-bold shadow-md shadow-[#dc2626]/20 shrink-0">
                  {((journey.assignedOfficer || 'VS').split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#9a3412]">{journey.assignedOfficer || 'Insp. Vikram Pratap Singh'}</h3>
                    <span className="rounded-full bg-[#fecaca] border border-[#fca5a5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#991b1b]">
                      Emergency Contact
                    </span>
                  </div>
                  <p className="text-xs text-[#dc2626] font-semibold mt-0.5">
                    {journey.stationName || 'District Special Atrocities Redressal Cell'}
                  </p>
                  <p className="text-xs text-[#6b8c84] mt-2 max-w-xl leading-relaxed">
                    Dispatched for immediate physical escort, emergency FIR filing under PoA Act, and safe-house coordination.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenCall(journey.assignedOfficer || 'Insp. Vikram Pratap Singh', 'Emergency Escort Officer', '+91 94220 98765')}
                  className="flex items-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#dc2626]/20 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={15} />
                  <span>{t('wb_call_officer_now', currentLanguage)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Roadmap */}
          <div className="rounded-3xl border border-[#fca5a5] bg-white p-6 sm:p-7 shadow-xs">
            <h3 className="text-sm font-bold text-[#991b1b] mb-4 flex items-center gap-2">
              <Lock size={14} />
              {t('wb_emergency_roadmap', currentLanguage)}
            </h3>
            <div className="space-y-4">
              {journey.steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#fff5f5] border border-[#fecaca]">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-[#fecaca] text-[#dc2626] font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#7f1d1d]">{step.title}</h4>
                      <span className="text-[10px] font-bold bg-[#fecaca] text-[#dc2626] px-2 py-0.5 rounded">
                        {step.timeframe}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b8c84] mt-0.5">{step.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Explicit game-block notice */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fef2f2] border border-[#fca5a5] px-4 py-3 text-xs text-[#991b1b] font-semibold">
              <Lock size={13} className="shrink-0" />
              <span>Wellbeing tools are paused during a Safety Pathway — your care team will re-enable them after your first session.</span>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {appointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[#cfe3dc] bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#edf4f0] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#163a34]">{t('wb_book_modal_title', currentLanguage)}</h3>
                <p className="text-xs text-[#63877f] mt-0.5">
                  With {journey.assignedPsychiatrist || 'Dr. Ramesh Chandra'} (100% Confidential)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppointmentModalOpen(false)}
                className="size-8 rounded-full bg-[#f0f6f3] text-[#64877f] hover:bg-[#e4ede8] flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
                <div className="size-14 mx-auto rounded-full bg-[#ecfdf5] border-2 border-[#10b981] flex items-center justify-center text-[#10b981]">
                  <Check size={28} />
                </div>
                <h4 className="text-base font-bold text-[#065f46]">{t('wb_apt_confirmed', currentLanguage)}</h4>
                <p className="text-xs text-[#047857]">
                  Your session has been logged in the database and synced with Dr. Ramesh Chandra&apos;s schedule.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meeting Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#163a34] mb-2">{t('wb_select_mode', currentLanguage)}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Secure Video Call', 'Telephonic Audio', 'In-Person Safe Clinic'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setMeetingMode(mode)}
                        className={`p-3 rounded-2xl border text-center text-xs font-bold transition cursor-pointer ${
                          meetingMode === mode
                            ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0369a1]'
                            : 'border-[#cfe2db] bg-white text-[#527770] hover:bg-[#f7fbf9]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <label className="block text-xs font-bold text-[#163a34] mb-2">{t('wb_choose_slot', currentLanguage)}</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AVAILABLE_APPOINTMENT_SLOTS.map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                          selectedSlotId === slot.id
                            ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0369a1]'
                            : 'border-[#cfe2db] bg-white text-[#527770] hover:bg-[#f7fbf9]'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{slot.date} ({slot.period})</p>
                          <p className="text-[11px] opacity-80">{slot.time}</p>
                        </div>
                        {selectedSlotId === slot.id && <Check size={16} className="text-[#0284c7]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#edf4f0] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAppointmentModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-[#cfe2db] text-xs font-semibold text-[#527770] hover:bg-[#f7fbf9] cursor-pointer"
                  >
                    {t('wb_cancel', currentLanguage)}
                  </button>
                  <button
                    type="button"
                    disabled={bookingLoading}
                    onClick={handleConfirmAppointment}
                    className="px-6 py-2.5 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md shadow-[#0284c7]/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {bookingLoading ? 'Confirming...' : t('wb_confirm_apt', currentLanguage)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TeleCall Modal */}
      {teleModalOpen && (
        <TeleCallModal
          isOpen={teleModalOpen}
          recipientName={teleRecipient.name}
          recipientRole={teleRecipient.role}
          recipientPhone={teleRecipient.phone}
          onClose={() => setTeleModalOpen(false)}
        />
      )}

      {/* Adaptive Intervention Modal */}
      <AdaptiveInterventionModal
        isOpen={adaptiveModalOpen}
        onClose={() => setAdaptiveModalOpen(false)}
        recommendation={recommendation}
        caseId={activeCase?.id}
        userId={currentUser?.id}
        onSessionComplete={(session) => {
          setCompletedSessions(prev => [session, ...prev])
        }}
        onTriggerSOS={onTriggerSOS}
      />
    </div>
  )
}
