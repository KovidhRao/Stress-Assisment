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
  Copy,
  Check,
  MapPin,
  Brain,
  ArrowRight
} from 'lucide-react'
import { CaseRecord, OfficerProfile, PsychiatristProfile, UserProfile, UserStory, VoiceAnalysisMetrics } from '@/types'
import { CaseService } from '@/lib/services/case-service'
import { DEFAULT_OFFICERS } from '@/lib/mock-data'
import { t } from '@/lib/i18n'

interface StoryInputCardProps {
  currentUser?: UserProfile
  officersList?: OfficerProfile[]
  psychiatristsList?: PsychiatristProfile[]
  currentLanguage?: string
  onStorySubmitted: (story: UserStory, metrics?: VoiceAnalysisMetrics, generatedCase?: CaseRecord) => void
  onOpenVoiceModal?: () => void
}

export function StoryInputCard({
  currentUser = {
    id: 'usr-default',
    full_name: 'Citizen User',
    role: 'victim',
    created_at: new Date().toISOString()
  },
  officersList = DEFAULT_OFFICERS,
  psychiatristsList = [],
  currentLanguage = 'en',
  onStorySubmitted,
  onOpenVoiceModal
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
    officerName?: string
    psychiatristName?: string
    stationName?: string
    sviScore: number
    riskLevel: string
    situation?: string
    detectedLanguage?: string
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

  // Submit Story -> Create New Session & Case in Database
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = narrativeText.trim() || recordedAudio?.transcript || ''
    if (!content && !recordedAudio) return

    setIsSubmitting(true)

    // Voice Analysis Metrics if audio was recorded
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

    try {
      const { caseRecord, story } = await CaseService.createCaseFromStory({
        user: currentUser,
        storyText: content,
        audioUrl: recordedAudio ? 'simulated_audio.webm' : null,
        audioDuration: recordedAudio?.duration,
        transcript: recordedAudio?.transcript,
        language: currentLanguage,
        voiceMetrics: metrics,
        allOfficers: officersList,
        allPsychiatrists: psychiatristsList
      })

      onStorySubmitted(story, metrics, caseRecord)

      setLastSubmittedCase({
        caseId: caseRecord.id,
        sessionId: caseRecord.session_id || '',
        officerName: caseRecord.assigned_officer,
        psychiatristName: caseRecord.assigned_counsellor,
        stationName: typeof caseRecord.proximity_routing === 'object'
          ? (caseRecord.proximity_routing as any)?.nearest_station
          : (caseRecord.incident_location?.district || 'Special Cell'),
        sviScore: caseRecord.stress_assessment.svi_score,
        riskLevel: caseRecord.stress_assessment.risk_level,
        copied: false
      })

      setNarrativeText('')
      setRecordedAudio(null)
    } catch (err) {
      console.error('Failed to submit story to database:', err)
    } finally {
      setIsSubmitting(false)
    }
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
                    className="flex items-center gap-1 rounded-lg bg-white border border-[#a7f3d0] px-2.5 py-1 text-[11px] font-bold text-[#065f46] shadow-sm hover:bg-[#f0fdf4] cursor-pointer"
                  >
                    {lastSubmittedCase.copied ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
                    <span>{lastSubmittedCase.copied ? t('copied', currentLanguage) : t('copy_case_id', currentLanguage)}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {lastSubmittedCase.situation && (
                <span className="rounded-xl px-2.5 py-1 text-[11px] font-bold bg-[#10b981]/15 text-[#065f46] border border-[#a7f3d0]">
                  {lastSubmittedCase.situation}
                </span>
              )}
              <span className={`rounded-xl px-3 py-1 text-xs font-extrabold ${
                lastSubmittedCase.riskLevel === 'Critical' || lastSubmittedCase.riskLevel === 'High'
                  ? 'bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]'
                  : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
              }`}>
                SVI {lastSubmittedCase.sviScore} &bull; {lastSubmittedCase.riskLevel}
              </span>
            </div>
          </div>

          {/* Dynamic Professional Routing Info */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#065f46]">
            <div className="flex flex-wrap items-center gap-3 font-medium">
              {lastSubmittedCase.officerName && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#10b981]" />
                  <span>Nearest Officer:</span>
                  <strong className="text-[#064e3b] font-bold">{lastSubmittedCase.officerName}</strong>
                </div>
              )}
              {lastSubmittedCase.psychiatristName && (
                <div className="flex items-center gap-1.5">
                  <Brain size={14} className="text-[#0284c7]" />
                  <span>Assigned Psychiatrist:</span>
                  <strong className="text-[#064e3b] font-bold">{lastSubmittedCase.psychiatristName}</strong>
                </div>
              )}
            </div>
            <button
              onClick={() => setLastSubmittedCase(null)}
              className="text-[11px] text-[#059669] hover:underline font-semibold cursor-pointer"
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

          {/* Quick Prompts */}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#ebf3ef] pt-3 text-[11px]">
            <span className="text-[#7d9992] font-medium">Quick starters:</span>
            {[
              'I have been feeling anxious and unsafe recently...',
              'They passed discriminatory remarks at...',
              'I need urgent legal and emotional guidance...'
            ].map((starter, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNarrativeText(prev => prev ? `${prev} ${starter}` : starter)}
                className="rounded-lg bg-[#eef6f3] px-2.5 py-1 text-[#22574e] hover:bg-[#dfeee8] transition cursor-pointer"
              >
                {starter.slice(0, 32)}...
              </button>
            ))}
          </div>
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
                className="flex items-center gap-1.5 rounded-xl bg-[#dc2626] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#b91c1c] cursor-pointer"
              >
                <Square size={13} fill="white" />
                <span>{t('stop_recording', currentLanguage)}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelRecording}
                className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] cursor-pointer"
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
                className="flex size-9 items-center justify-center rounded-xl bg-[#1d8272] text-white shadow-sm transition hover:bg-[#166558] cursor-pointer"
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
                className="flex items-center gap-1 rounded-lg border border-[#fecaca] bg-[#fff1f2] px-2.5 py-1 text-[11px] font-semibold text-[#e11d48] hover:bg-[#ffe4e6] cursor-pointer"
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
              className="flex items-center gap-2 rounded-xl border border-[#cfe3dc] bg-white px-4 py-2 text-xs font-semibold text-[#1d8272] transition hover:bg-[#edf7f3] cursor-pointer"
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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1d8272] to-[#166558] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1d8272]/15 transition hover:from-[#176d5f] hover:to-[#125247] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
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
