'use client'

import React, { useState } from 'react'
import {
  FileText,
  Plus,
  Play,
  Pause,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Headphones,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Lock,
  ArrowRight
} from 'lucide-react'
import { UserStory, RiskLevel } from '@/types'

interface MyStoriesViewProps {
  stories: UserStory[]
  onShareAnotherStory: () => void
  onDeleteStory?: (id: string) => void
  onViewSupportPlan?: (riskLevel: RiskLevel) => void
}

const statusBadgeStyles: Record<string, string> = {
  'Support Plan Available': 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]',
  'Under Review': 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]',
  'Shared': 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]',
  'Urgent Review': 'bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3]'
}

const riskStyles: Record<RiskLevel, string> = {
  Critical: 'bg-[#fff0ef] text-[#c94b48] border border-[#fca5a5]',
  High: 'bg-[#fff5e5] text-[#b87817] border border-[#fde68a]',
  Moderate: 'bg-[#eef5ff] text-[#4f76bb] border border-[#bfdbfe]',
  Low: 'bg-[#edf8f2] text-[#4f9674] border border-[#a7f3d0]'
}

export function MyStoriesView({
  stories,
  onShareAnotherStory,
  onDeleteStory,
  onViewSupportPlan
}: MyStoriesViewProps) {
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(stories[0]?.id || null)
  const [playingStoryId, setPlayingStoryId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({})

  const toggleExpand = (id: string) => {
    setExpandedStoryId(prev => prev === id ? null : id)
  }

  const togglePlayAudio = (storyId: string, duration: number = 30) => {
    if (playingStoryId === storyId) {
      setPlayingStoryId(null)
    } else {
      setPlayingStoryId(storyId)
      // Simulate playback progression
      let currentSec = 0
      const interval = setInterval(() => {
        currentSec += 1
        setAudioProgress(prev => ({ ...prev, [storyId]: currentSec }))
        if (currentSec >= duration) {
          clearInterval(interval)
          setPlayingStoryId(null)
          setAudioProgress(prev => ({ ...prev, [storyId]: 0 }))
        }
      }, 1000)
    }
  }

  return (
    <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#e2ece7] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
            <Lock size={13} />
            <span>Private &amp; Confidential Dossier</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#163a34]">Your Stories</h1>
          <p className="mt-1.5 text-xs text-[#68857e]">
            This is your private space to revisit what you have shared. You can review your audio recordings, transcripts, and active support statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={onShareAnotherStory}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white px-5 py-3 text-xs font-bold shadow-md shadow-[#1d8272]/20 transition active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>+ Share Another Story</span>
        </button>
      </div>

      {/* Stories Timeline & Cards */}
      <div className="space-y-5">
        {stories.length > 0 ? (
          stories.map((story, index) => {
            const isExpanded = expandedStoryId === story.id
            const isPlaying = playingStoryId === story.id
            const currentProg = audioProgress[story.id] || 0
            const totalDur = story.audio_duration_seconds || 30

            return (
              <div
                key={story.id}
                className="rounded-3xl border border-[#d6e5df] bg-white p-6 sm:p-7 shadow-xs transition hover:border-[#b8dad0] hover:shadow-sm"
              >
                {/* Top Row: Meta Info & Status Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf4f0] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272] font-bold text-xs">
                      #{stories.length - index}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#183d37]">{story.title || 'Personal Experience Statement'}</h3>
                        {story.case_id && (
                          <span className="font-mono text-[10px] font-bold bg-[#edf7f3] text-[#1d8272] px-2 py-0.5 rounded-md border border-[#cfe6dc]">
                            {story.case_id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6d8a83] mt-0.5">
                        <Clock size={12} />
                        <span>{story.formatted_time}</span>
                        <span>•</span>
                        <span>{story.language || 'English'}</span>
                        {story.assigned_officer_name && (
                          <>
                            <span>•</span>
                            <span className="text-[#1d8272] font-medium">Nearest Officer: {story.assigned_officer_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-xl px-3 py-1 text-[11px] font-bold ${riskStyles[story.risk_level]}`}>
                      SVI {story.svi_score} · {story.risk_level} Risk
                    </span>
                    <span className={`rounded-xl px-3 py-1 text-[11px] font-bold ${statusBadgeStyles[story.status] || statusBadgeStyles['Shared']}`}>
                      {story.status}
                    </span>
                  </div>
                </div>

                {/* Story Content */}
                <div className="mt-5 space-y-4">
                  {/* Text preview / full */}
                  <div className="text-xs sm:text-sm leading-relaxed text-[#2a4d46] bg-[#fbfdfc] p-4 rounded-2xl border border-[#e4eee9]">
                    <p className={isExpanded ? '' : 'line-clamp-3'}>
                      {story.narrative_text}
                    </p>

                    {story.narrative_text.length > 180 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(story.id)}
                        className="mt-2.5 flex items-center gap-1 text-xs font-bold text-[#1d8272] hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            <span>Read full story</span>
                            <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Audio Player Card (If story has audio) */}
                  {(story.audio_duration_seconds || story.audio_url) && (
                    <div className="rounded-2xl border border-[#cfe6dd] bg-[#f0f9f5] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(story.id, totalDur)}
                          className="flex size-11 items-center justify-center rounded-2xl bg-[#1d8272] text-white shadow-md hover:bg-[#186f60] transition active:scale-95 shrink-0"
                          title={isPlaying ? 'Pause' : 'Play Audio Recording'}
                        >
                          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#18453e]">Voice Statement Recording</span>
                            <span className="text-[10px] font-mono text-[#1d8272] bg-white px-2 py-0.5 rounded-md border border-[#cbe4db]">
                              {isPlaying ? `00:${currentProg.toString().padStart(2, '0')}` : `00:${totalDur.toString().padStart(2, '0')}`}
                            </span>
                          </div>
                          {story.transcript && (
                            <p className="text-[11px] text-[#63877f] truncate mt-0.5 italic">
                              Transcript: &ldquo;{story.transcript}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Simulated Audio Waveform Bar */}
                      <div className="flex items-center gap-1 h-6 w-full sm:w-48 px-2 py-1 bg-white/80 rounded-xl border border-[#d2e8e0]">
                        {[8, 14, 20, 16, 22, 12, 18, 24, 15, 10, 19, 14, 21, 13, 17, 9].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all ${
                              isPlaying && i <= (currentProg / totalDur) * 16 ? 'bg-[#1d8272]' : 'bg-[#c5e4db]'
                            }`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Trauma Indicators / Support Plan Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[#73928a]">Identified Signals:</span>
                      {story.key_triggers && story.key_triggers.length > 0 ? (
                        story.key_triggers.map((trigger, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-[#eaf4f0] px-2 py-0.5 text-[10px] font-medium text-[#205147]"
                          >
                            {trigger}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-lg bg-[#eaf4f0] px-2 py-0.5 text-[10px] font-medium text-[#205147]">
                          Confidential intake
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onViewSupportPlan && (
                        <button
                          type="button"
                          onClick={() => onViewSupportPlan(story.risk_level)}
                          className="flex items-center gap-1.5 rounded-xl bg-[#e4f3ee] hover:bg-[#d5ece4] px-3 py-1.5 text-xs font-bold text-[#1a6e60] transition"
                        >
                          <span>View Support Plan</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-[#cfe0d8] bg-white p-12 text-center">
            <FileText size={36} className="mx-auto text-[#9db7b0]" />
            <h3 className="mt-3 text-base font-bold text-[#183e38]">No Stories Submitted Yet</h3>
            <p className="mt-1 text-xs text-[#6e8a83] max-w-sm mx-auto">
              Your safe space is ready whenever you want to share what happened in your own words.
            </p>
            <button
              type="button"
              onClick={onShareAnotherStory}
              className="mt-5 rounded-2xl bg-[#1d8272] text-white px-5 py-2.5 text-xs font-bold shadow-md hover:bg-[#186f60] transition"
            >
              Share Your First Story
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
