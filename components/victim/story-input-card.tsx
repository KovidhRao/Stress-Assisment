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
  FileText
} from 'lucide-react'
import { UserStory, VoiceAnalysisMetrics } from '@/types'

interface StoryInputCardProps {
  onStorySubmitted: (story: UserStory, metrics?: VoiceAnalysisMetrics) => void
  onOpenVoiceModal?: () => void
}

export function StoryInputCard({ onStorySubmitted }: StoryInputCardProps) {
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
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      "I have been feeling very anxious and unsafe recently since the incident at my hostel. They constantly pass remarks and I cannot focus or sleep.",
      "The local leaders threatened our family again yesterday and warned us against approaching the authorities. We fear they might come to our house.",
      "We are facing severe isolation and denial of community access. I need someone to help guide us through the legal and safety process."
    ]
    const chosenTranscript = simulatedTranscripts[Math.floor(Math.random() * simulatedTranscripts.length)]

    setRecordedAudio({
      duration: finalDuration,
      transcript: chosenTranscript
    })

    // If text area is empty, populate with transcript
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
      // Determine simulated risk level and SVI score from text patterns
      const lower = content.toLowerCase()
      let riskLevel: 'Low' | 'Moderate' | 'High' = 'Moderate'
      let svi = 58
      const triggers: string[] = []

      if (lower.includes('kill') || lower.includes('threat') || lower.includes('attack') || lower.includes('unsafe') || lower.includes('danger') || lower.includes('fear') || lower.includes('panic') || lower.includes('severe')) {
        riskLevel = 'High'
        svi = Math.floor(Math.random() * 15 + 75)
        triggers.push('immediate safety concern', 'acute distress signal')
      } else if (lower.includes('calm') || lower.includes('peace') || lower.includes('fine') || lower.includes('good') || lower.includes('better') || lower.includes('stable')) {
        riskLevel = 'Low'
        svi = Math.floor(Math.random() * 15 + 20)
        triggers.push('emotional stability', 'routine check-in')
      } else {
        riskLevel = 'Moderate'
        svi = Math.floor(Math.random() * 15 + 48)
        triggers.push('counselling recommendation', 'stress signals')
      }

      const newStory: UserStory = {
        id: `STORY-${Date.now().toString().slice(-4)}`,
        title: content.slice(0, 48) + (content.length > 48 ? '...' : ''),
        narrative_text: content,
        audio_url: recordedAudio ? 'simulated_audio.webm' : null,
        audio_duration_seconds: recordedAudio ? recordedAudio.duration : undefined,
        transcript: recordedAudio ? recordedAudio.transcript : undefined,
        language: 'English / Hindi',
        created_at: new Date().toISOString(),
        formatted_time: 'Just now',
        status: riskLevel === 'High' ? 'Support Plan Available' : riskLevel === 'Moderate' ? 'Under Review' : 'Shared',
        risk_level: riskLevel,
        svi_score: svi,
        key_triggers: triggers
      }

      const metrics: VoiceAnalysisMetrics | undefined = recordedAudio ? {
        duration_seconds: recordedAudio.duration,
        transcript: recordedAudio.transcript,
        language: 'English',
        speech_rate_wpm: 92,
        average_pitch_hz: 218,
        pitch_variation_hz: 38,
        energy_level: 40,
        pause_duration_ratio: 0.32,
        acoustic_distress_score: svi,
        mfcc_indicators: ['vocal_hesitation', 'distress_harmonics']
      } : undefined

      onStorySubmitted(newStory, metrics)

      setIsSubmitting(false)
      setSubmitSuccess(true)
      setNarrativeText('')
      setRecordedAudio(null)

      setTimeout(() => {
        setSubmitSuccess(false)
      }, 4500)
    }, 800)
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
            <h2 className="text-xl font-bold text-[#163a34]">Share Your Story</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#68857e]">
            You can share what happened in your own words. Type your experience or record your voice. You can take your time.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#edf7f3] border border-[#cfe6dc] px-3 py-1 text-[11px] font-semibold text-[#1d8272]">
          <ShieldCheck size={13} />
          <span>100% Private &amp; Protected</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] p-4 text-[#065f46] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#10b981] text-white">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs font-bold">Your story has been added safely.</p>
              <p className="text-[11px] text-[#047857] mt-0.5">
                Saved to your private story space. Your vulnerability snapshot and support journey have been updated.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="text-[#059669] hover:text-[#065f46] p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Live Voice Recording UI Box */}
      {isRecording && (
        <div className="mt-5 rounded-2xl border-2 border-[#1d8272]/30 bg-[#f0f9f6] p-5 animate-in fade-in zoom-in-98 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#ef4444] animate-ping" />
              <span className="text-xs font-bold text-[#185a4f]">Recording Voice Statement...</span>
            </div>
            <span className="font-mono text-sm font-bold text-[#185a4f] bg-white/80 px-2.5 py-0.5 rounded-lg border border-[#cce6dc]">
              00:{recordingSeconds.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Sound Waveform Visualization */}
          <div className="mt-4 rounded-xl bg-[#173f39] p-3 shadow-inner">
            <canvas ref={canvasRef} width={420} height={56} className="w-full h-14 block" />
          </div>

          <div className="mt-4 flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#668780] hover:text-[#dc2626] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2 text-xs font-bold shadow-md transition active:scale-95 animate-pulse"
            >
              <Square size={14} />
              <span>Stop &amp; Review Audio</span>
            </button>
          </div>
        </div>
      )}

      {/* Post-Recording Audio Card */}
      {!isRecording && recordedAudio && (
        <div className="mt-4 rounded-2xl border border-[#b8ded4] bg-[#eef8f4] p-4.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="flex size-11 items-center justify-center rounded-2xl bg-[#1d8272] text-white shadow-md hover:bg-[#186f60] transition active:scale-95"
                title={isPlayingAudio ? 'Pause' : 'Play Voice Recording'}
              >
                {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-[#184840]">Voice Recording Captured</p>
                  <span className="rounded-md bg-[#d8efe8] px-1.5 py-0.5 text-[10px] font-mono text-[#185a4f]">
                    {isPlayingAudio ? `00:${audioPlaybackSeconds.toString().padStart(2, '0')}` : `00:${recordedAudio.duration.toString().padStart(2, '0')}`}
                  </span>
                </div>
                <p className="text-[11px] text-[#63877f] mt-0.5 line-clamp-1 italic">
                  &ldquo;{recordedAudio.transcript}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteAudio}
                className="p-2 text-[#7f9992] hover:text-[#dc2626] hover:bg-white rounded-xl transition"
                title="Discard Audio"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Text Area & Action Bar */}
      <div className="mt-4">
        <div className="relative rounded-2xl border border-[#d2e4de] bg-[#fbfdfc] p-3 sm:p-4 transition-all duration-200 focus-within:border-[#1d8272] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1d8272]/15">
          <textarea
            value={narrativeText}
            onChange={(e) => setNarrativeText(e.target.value)}
            rows={4}
            placeholder="Tell us what's on your mind or what happened... Type freely, you are completely safe here."
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#1b3d37] placeholder:text-[#9db6af] outline-none"
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
                className="rounded-lg bg-[#eef6f3] px-2.5 py-1 text-[#22574e] hover:bg-[#dfeee8] transition"
              >
                {starter.slice(0, 32)}...
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Microphone Recording Button */}
            {!isRecording && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl border border-[#cbe3db] bg-white hover:bg-[#eef8f4] px-4 py-2.5 text-xs font-bold text-[#1d8272] shadow-xs transition active:scale-95"
              >
                <Mic size={16} />
                <span>{recordedAudio ? 'Record Voice Again' : 'Record Voice Statement'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <span className="text-[11px] text-[#7d9992]">
              {narrativeText.length} characters
            </span>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || (!narrativeText.trim() && !recordedAudio)}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] disabled:bg-[#a9ccc4] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-[#1d8272]/20 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Safely Saving...' : 'Submit Story'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
