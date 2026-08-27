'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  RotateCcw,
  Activity,
  Heart,
  X,
  FileText,
  Copy,
  Check,
  Building,
  MapPin,
  AlertTriangle
} from 'lucide-react'
import { CaseRecord, OfficerProfile, UserProfile, UserStory, VoiceAnalysisMetrics } from '@/types'
import { computeSVI, findNearestOfficer } from '@/lib/svi-engine'
import { DEFAULT_OFFICERS } from '@/lib/mock-data'
import { t } from '@/lib/i18n'

interface StoryInputCardProps {
  currentUser: UserProfile
  officersList?: OfficerProfile[]
  currentLanguage?: string
  onStorySubmitted: (story: UserStory, metrics?: VoiceAnalysisMetrics, generatedCase?: CaseRecord) => void
  onOpenVoiceModal?: () => void
}

export function StoryInputCard({
  currentUser,
  officersList = DEFAULT_OFFICERS,
  currentLanguage = 'en',
  onStorySubmitted
}: StoryInputCardProps) {
  const [narrativeText, setNarrativeText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedAudio, setRecordedAudio] = useState<{
    duration: number
    transcript: string
    url?: string | null
  } | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioPlaybackSeconds, setAudioPlaybackSeconds] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Last submitted case info for user confirmation banner
  const [lastSubmittedCase, setLastSubmittedCase] = useState<{
    caseId: string
    sessionId: string
    officerName: string
    stationName: string
    sviScore: number
    riskLevel: string
    copied: boolean
  } | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Clean up timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Start simulated / live audio recording
  const handleStartRecording = () => {
    setRecordedAudio(null)
    setIsRecording(true)
    setRecordingSeconds(0)

    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1)
    }, 1000)

    drawAnimatedWave()
  }

  const drawAnimatedWave = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const bars = 28
      const barWidth = canvas.width / bars - 3

      for (let i = 0; i < bars; i++) {
        const height = (Math.sin(Date.now() / 180 + i * 0.7) * 0.45 + 0.55) * (canvas.height * 0.78) * (Math.random() * 0.35 + 0.65)
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#1d8272')
        gradient.addColorStop(1, '#6ee7b7')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(i * (barWidth + 3), canvas.height - height, barWidth, height, 4)
        ctx.fill()
      }
    }
    render()
  }

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsRecording(false)

    const finalDuration = Math.max(recordingSeconds, 6)
    const simulatedTranscripts = [
      "I have been feeling very anxious and unsafe recently since the incident at my village. They constantly pass slurs and threatened our family with social boycott.",
      "The local leaders threatened our family again yesterday and warned us against approaching the authorities. We fear they might come to our house tonight.",
      "We are facing severe caste discrimination and denial of drinking water access from public handpump. I need someone to help guide us through the legal and protection process."
    ]
    const chosenTranscript = simulatedTranscripts[Math.floor(Math.random() * simulatedTranscripts.length)]

    setRecordedAudio({
      duration: finalDuration,
      transcript: chosenTranscript
    })

    if (!narrativeText.trim()) {
      setNarrativeText(chosenTranscript)
    }
  }

  const handleCancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setIsRecording(false)
    setRecordingSeconds(0)
    setRecordedAudio(null)
  }

  const handleDeleteAudio = () => {
    setRecordedAudio(null)
    setIsPlayingAudio(false)
    setAudioPlaybackSeconds(0)
  }

  const togglePlayAudio = () => {
    if (isPlayingAudio) {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
      setIsPlayingAudio(false)
    } else {
      setIsPlayingAudio(true)
      const maxDur = recordedAudio?.duration || 10
      playbackIntervalRef.current = setInterval(() => {
        setAudioPlaybackSeconds(prev => {
          if (prev >= maxDur - 1) {
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
            setIsPlayingAudio(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = narrativeText.trim() || recordedAudio?.transcript || ''
    if (!content && !recordedAudio) return

    setIsSubmitting(true)

    setTimeout(() => {
      // 1. Acoustic / Voice metrics if audio was recorded
      const metrics: VoiceAnalysisMetrics | undefined = recordedAudio ? {
        duration_seconds: recordedAudio.duration,
        transcript: recordedAudio.transcript,
        language: currentLanguage || 'en',
        speech_rate_wpm: 88,
        average_pitch_hz: 218,
        pitch_variation_hz: 42,
        energy_level: 38,
        pause_duration_ratio: 0.36,
        acoustic_distress_score: 76,
        mfcc_indicators: ['vocal_hesitation', 'distress_harmonics', 'respiratory_irregularity']
      } : undefined

      // 2. Dynamic SVI NLP Computation
      const assessment = computeSVI(content, metrics)

      // 3. Proximity Officer Matching based on Victim's Location
      const victimLocation = {
        state: currentUser.state || 'Maharashtra',
        district: currentUser.district || 'Pune',
        village_town_city: currentUser.village_town_city || 'Shivajinagar',
        pincode: currentUser.pincode || '411001'
      }

      const { officer: nearestOfficer, routingReason } = findNearestOfficer(
        officersList,
        victimLocation
      )

      // 4. Generate Unique Trackable Case ID & Session ID
      const generatedCaseId = `NHAA-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const generatedSessionId = `SESS-${Date.now().toString().slice(-6)}`

      const newStory: UserStory = {
        id: `STORY-${Date.now().toString().slice(-4)}`,
        session_id: generatedSessionId,
        case_id: generatedCaseId,
        title: content.slice(0, 52) + (content.length > 52 ? '...' : ''),
        narrative_text: content,
        audio_url: recordedAudio ? 'simulated_audio.webm' : null,
        audio_duration_seconds: recordedAudio ? recordedAudio.duration : undefined,
        transcript: recordedAudio ? recordedAudio.transcript : undefined,
        language: currentLanguage,
        created_at: new Date().toISOString(),
        formatted_time: 'Just now',
        status: assessment.risk_level === 'Critical' || assessment.risk_level === 'High' ? 'Support Plan Available' : 'Under Review',
        risk_level: assessment.risk_level,
        svi_score: assessment.svi_score,
        key_triggers: assessment.key_trauma_triggers,
        assigned_officer_name: nearestOfficer.full_name,
        assigned_officer_id: nearestOfficer.id,
        nearest_station: nearestOfficer.station_name || `${nearestOfficer.assigned_district} Special Cell`
      }

      const newCaseRecord: CaseRecord = {
        id: generatedCaseId,
        session_id: generatedSessionId,
        user_id: currentUser.id,
        victim_name: currentUser.full_name || 'Citizen User',
        initials: currentUser.avatar_initials || 'CU',
        is_anonymous: !!currentUser.anonymous,
        contact_number: currentUser.phone || '+91 97551 12345',
        incident_category: 'Social Boycott & Ostracization',
        incident_location: victimLocation,
        channel: metrics ? 'mobile_app' : 'integrated_portal',
        language: currentLanguage,
        reported_at: 'Just now',
        narrative_text: content,
        voice_analysis: metrics,
        stress_assessment: {
          ...assessment,
          case_id: generatedCaseId
        },
        status: assessment.risk_level === 'Critical' || assessment.risk_level === 'High' ? 'New Intake' : 'Under Triage',
        assigned_officer: nearestOfficer.full_name,
        assigned_officer_id: nearestOfficer.id,
        assigned_counsellor: 'Dr. Ramesh Chandra',
        assigned_counsellor_id: 'OFF-01',
        proximity_routing: {
          nearest_station: nearestOfficer.station_name || `${nearestOfficer.assigned_district} Unit`,
          district: nearestOfficer.assigned_district,
          state: nearestOfficer.assigned_state,
          routing_reason: routingReason,
          assigned_at: new Date().toISOString()
        },
        priority_tier: assessment.risk_level === 'Critical' ? 1 : assessment.risk_level === 'High' ? 2 : 3,
        notes: [
          {
            id: `N-${Date.now()}`,
            author: 'AI SVI & Proximity Engine',
            role: 'Automated Redressal Triage',
            timestamp: 'Just now',
            text: `High SVI (${assessment.svi_score}) classified. Case routed to nearest officer ${nearestOfficer.full_name} (${nearestOfficer.assigned_district}) via ${routingReason}.`
          }
        ],
        dispatched_actions: []
      }

      onStorySubmitted(newStory, metrics, newCaseRecord)

      setIsSubmitting(false)
      setLastSubmittedCase({
        caseId: generatedCaseId,
        sessionId: generatedSessionId,
        officerName: nearestOfficer.full_name,
        stationName: nearestOfficer.station_name || nearestOfficer.assigned_district,
        sviScore: assessment.svi_score,
        riskLevel: assessment.risk_level,
        copied: false
      })
      setNarrativeText('')
      setRecordedAudio(null)
    }, 800)
  }

  const copyCaseId = () => {
    if (!lastSubmittedCase) return
    navigator.clipboard.writeText(lastSubmittedCase.caseId)
    setLastSubmittedCase(prev => prev ? { ...prev, copied: true } : null)
    setTimeout(() => {
      setLastSubmittedCase(prev => prev ? { ...prev, copied: false } : null)
    }, 2500)
  }

  return (
    <div className="rounded-3xl border border-[#d3e5df] bg-gradient-to-b from-white to-[#fbfdfc] p-6 sm:p-7 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
              <Sparkles size={16} />
            </span>
            <h2 className="text-xl font-bold text-[#163a34]">{t('share_story_title', currentLanguage)}</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#68857e]">
            {t('share_story_subtitle', currentLanguage)}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#edf7f3] border border-[#cfe6dc] px-3 py-1 text-[11px] font-semibold text-[#1d8272]">
          <ShieldCheck size={13} />
          <span>{t('share_story_private', currentLanguage)}</span>
        </div>
      </div>

      {/* Generated Case & Session ID Confirmation Alert */}
      {lastSubmittedCase && (
        <div className="mt-5 rounded-2xl bg-[#ecfdf5] border-2 border-[#10b981]/40 p-4 sm:p-5 text-[#065f46] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#a7f3d0] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#10b981] text-white">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#047857]">
                  {t('story_submitted_success', currentLanguage)}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base sm:text-lg font-mono font-extrabold text-[#064e3b]">
                    {lastSubmittedCase.caseId}
                  </span>
                  <button
                    type="button"
                    onClick={copyCaseId}
                    className="flex items-center gap-1 rounded-lg bg-white border border-[#a7f3d0] px-2.5 py-1 text-[11px] font-bold text-[#065f46] shadow-sm hover:bg-[#f0fdf4]"
                  >
                    {lastSubmittedCase.copied ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
                    <span>{lastSubmittedCase.copied ? t('copied', currentLanguage) : t('copy_case_id', currentLanguage)}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-xl px-3 py-1 text-xs font-extrabold ${
                lastSubmittedCase.riskLevel === 'Critical' || lastSubmittedCase.riskLevel === 'High'
                  ? 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                  : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
              }`}>
                SVI {lastSubmittedCase.sviScore} &bull; {lastSubmittedCase.riskLevel}
              </span>
            </div>
          </div>

          {/* Nearest Officer Proximity Routing Info */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#065f46]">
            <div className="flex items-center gap-1.5 font-medium">
              <MapPin size={15} className="text-[#10b981]" />
              <span>{t('case_assigned_officer', currentLanguage)}</span>
              <strong className="text-[#064e3b] font-bold">{lastSubmittedCase.officerName}</strong>
              <span className="text-[11px] text-[#047857]">({lastSubmittedCase.stationName})</span>
            </div>
            <button
              onClick={() => setLastSubmittedCase(null)}
              className="text-[11px] text-[#059669] hover:underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input / Voice Box */}
      <div className="mt-5 space-y-4">
        {/* Narrative Text Area */}
        <div className="relative">
          <textarea
            value={narrativeText}
            onChange={e => setNarrativeText(e.target.value)}
            placeholder={t('story_placeholder', currentLanguage)}
            rows={4}
            className="w-full rounded-2xl border border-[#d3e5df] bg-[#f9fbfa] p-4 text-xs sm:text-sm leading-relaxed text-[#163a34] placeholder-[#8ea8a1] outline-none transition focus:border-[#1d8272] focus:bg-white focus:ring-2 focus:ring-[#1d8272]/20"
          />
        </div>

        {/* Audio Recording Section */}
        {isRecording && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex size-3 rounded-full bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-[#166534]">
                Recording audio... ({recordingSeconds}s)
              </span>
            </div>

            <canvas ref={canvasRef} width={180} height={32} className="w-44 h-8 rounded" />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 rounded-xl bg-[#dc2626] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#b91c1c]"
              >
                <Square size={13} fill="white" />
                <span>{t('stop_recording', currentLanguage)}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelRecording}
                className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recorded Audio Preview */}
        {recordedAudio && !isRecording && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="flex size-9 items-center justify-center rounded-xl bg-[#1d8272] text-white shadow-sm transition hover:bg-[#166558]"
              >
                {isPlayingAudio ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>
              <div>
                <p className="text-xs font-bold text-[#1e293b]">{t('audio_ready', currentLanguage)}</p>
                <p className="text-[11px] text-[#64748b]">
                  {recordedAudio.duration}s recorded &bull; Speech distress analysis ready
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteAudio}
                className="flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fff1f2] px-2.5 py-1 text-[11px] font-semibold text-[#e11d48] hover:bg-[#ffe4e6]"
              >
                <Trash2 size={12} />
                <span>Discard</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {!isRecording && (
            <button
              type="button"
              onClick={handleStartRecording}
              className="flex items-center gap-2 rounded-xl border border-[#cfe3dc] bg-white px-4 py-2 text-xs font-semibold text-[#1d8272] transition hover:bg-[#edf7f3]"
            >
              <Mic size={15} />
              <span>{t('start_recording', currentLanguage)}</span>
            </button>
          )}

          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!narrativeText.trim() && !recordedAudio)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1d8272] to-[#166558] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1d8272]/15 transition hover:from-[#176d5f] hover:to-[#125247] disabled:opacity-40"
            >
              {isSubmitting ? (
                <span>{t('submitting', currentLanguage)}</span>
              ) : (
                <>
                  <span>{t('submit_story_btn', currentLanguage)}</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
