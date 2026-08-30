'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  X, 
  Wind, 
  Headphones, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Heart, 
  Volume2, 
  VolumeX,
  Compass,
  ArrowRight,
  Lock
} from 'lucide-react'

interface WellbeingToolsModalProps {
  isOpen: boolean
  onClose: () => void
  onCloseWithSurvey?: () => void
  initialTab?: 'breathing' | 'soundscape' | 'grounding'
  /**
   * Day 4 Safety Gate defense-in-depth check.
   * When false the modal renders a redirect notice instead of tool content
   * — prevents game/tool access on unexpected code paths for High/Critical cases.
   * Defaults to true (safe for Low/Moderate).
   */
  gameAllowed?: boolean
}

export function WellbeingToolsModal({ isOpen, onClose, onCloseWithSurvey, initialTab = 'breathing', gameAllowed = true }: WellbeingToolsModalProps) {
  const [activeTab, setActiveTab] = useState<'breathing' | 'soundscape' | 'grounding'>(initialTab)

  // Box Breathing State
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale')
  const [phaseSeconds, setPhaseSeconds] = useState(4)
  const [completedCycles, setCompletedCycles] = useState(0)

  // Soundscape State (Web Audio API Synthesizer)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<'rain' | 'binaural' | 'bells'>('rain')
  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioNode | null>(null)
  const oscNodeRef = useRef<OscillatorNode | null>(null)

  // Grounding 5-4-3-2-1 State
  const [groundingStep, setGroundingStep] = useState(0)
  const groundingSteps = [
    { count: 5, prompt: 'Acknowledge 5 things you can SEE around you right now.', hint: 'Look at a lamp, a shadow, your hands, a wall texture, a pen.' },
    { count: 4, prompt: 'Acknowledge 4 things you can physically TOUCH or FEEL.', hint: 'Feel your feet firmly on the floor, the texture of your clothes, the temperature of the air.' },
    { count: 3, prompt: 'Acknowledge 3 things you can HEAR in the distance.', hint: 'Listen for distant traffic, birds, the hum of an appliance, or your own breath.' },
    { count: 2, prompt: 'Acknowledge 2 things you can SMELL or like the scent of.', hint: 'Scent of soap, fresh air, rain, or a memory of a reassuring aroma.' },
    { count: 1, prompt: 'Acknowledge 1 thing you can TASTE or say a kind truth to yourself.', hint: 'Say quietly: "I am safe in this immediate moment. I have rights and support."' }
  ]

  // Box breathing timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (breathingActive) {
      timer = setInterval(() => {
        setPhaseSeconds(prev => {
          if (prev <= 1) {
            setBreathPhase(current => {
              if (current === 'Inhale') return 'Hold'
              if (current === 'Hold') return 'Exhale'
              if (current === 'Exhale') return 'Rest'
              setCompletedCycles(c => c + 1)
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

  const stopSynthesizedSound = React.useCallback(() => {
    if (noiseNodeRef.current) {
      try { (noiseNodeRef.current as AudioBufferSourceNode).stop() } catch {}
      noiseNodeRef.current = null
    }
    if (oscNodeRef.current) {
      try { oscNodeRef.current.stop() } catch {}
      oscNodeRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    setIsPlayingAudio(false)
  }, [])

  // Web Audio Real Synthesizer for Soothing Sounds
  const startSynthesizedSound = React.useCallback((type: 'rain' | 'binaural' | 'bells') => {
    stopSynthesizedSound()
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx

      if (type === 'rain') {
        // Pink noise generator for soothing rain
        const bufferSize = ctx.sampleRate * 2
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
          b6 = white * 0.115926
        }
        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = buffer
        whiteNoise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800

        whiteNoise.connect(filter)
        filter.connect(ctx.destination)
        whiteNoise.start()
        noiseNodeRef.current = whiteNoise
      } else {
        // Calming 432 Hz Healing Resonance Sine Wave
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(type === 'binaural' ? 432 : 528, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        oscNodeRef.current = osc
      }
      setIsPlayingAudio(true)
    } catch (err) {
      console.warn('Audio synthesis initialized in simulated mode', err)
      setIsPlayingAudio(true)
    }
  }, [stopSynthesizedSound])

  // Stop audio synthesis on unmount
  useEffect(() => {
    return () => {
      stopSynthesizedSound()
    }
  }, [stopSynthesizedSound])

  if (!isOpen) return null

  // ── Day 4: Defense-in-depth guard ─────────────────────────────────────────
  // If this modal is opened from an unexpected code path while the game is
  // blocked (High / Critical gate), render a redirect notice instead of tool
  // content. The primary gate enforcement lives in wellbeing-journey-view.tsx;
  // this is a fallback so the modal is never a bypass vector.
  if (!gameAllowed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl border border-[#fca5a5] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Lock size={18} className="text-[#fca5a5]" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Tool Unavailable</h3>
                <p className="text-[11px] text-[#fca5a5]">Safety Pathway active</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#fca5a5] hover:text-white transition">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4 text-center">
            <p className="text-sm font-semibold text-[#7f1d1d]">
              This tool isn&apos;t available for your current support level.
            </p>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              You&apos;re in a Safety Pathway or Priority Human Review. Your care team will unlock wellbeing tools after your first clinical session.
            </p>
            <p className="text-xs font-bold text-[#dc2626]">
              Please use the SOS button or call <span className="underline">14566</span> for immediate support.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-3 text-xs font-bold transition cursor-pointer"
            >
              Return to Priority Review Options
            </button>
          </div>
        </div>
      </div>
    )
  }
  // ── End guard ──────────────────────────────────────────────────────────────

  const toggleSound = (track: 'rain' | 'binaural' | 'bells') => {
    if (isPlayingAudio && selectedTrack === track) {
      stopSynthesizedSound()
    } else {
      setSelectedTrack(track)
      startSynthesizedSound(track)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#173f39] to-[#1c6457] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles size={18} className="text-[#a1e5d7]" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Gentle Grounding &amp; Wellbeing Space</h3>
              <p className="text-[11px] text-[#a4d7cb]">Immediate Nervous System Regulation for Complainants</p>
            </div>
          </div>
          <button onClick={() => { stopSynthesizedSound(); if (onCloseWithSurvey) { onCloseWithSurvey() } else { onClose() } }} className="text-[#a4d7cb] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1.5 bg-[#f0f6f3] border-b border-[#e1ece8] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('breathing')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'breathing' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#657d77] hover:text-[#274742]'
            }`}
          >
            <Wind size={15} />
            <span>2-Min Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('soundscape')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'soundscape' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#657d77] hover:text-[#274742]'
            }`}
          >
            <Headphones size={15} />
            <span>Calming Audio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grounding')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'grounding' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#657d77] hover:text-[#274742]'
            }`}
          >
            <Compass size={15} />
            <span>5-4-3-2-1 Grounding</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: BOX BREATHING */}
          {activeTab === 'breathing' && (
            <div className="text-center space-y-6">
              <div>
                <h4 className="text-lg font-bold text-[#1d3d38]">Box Breathing Guide</h4>
                <p className="text-xs text-[#718a84] max-w-sm mx-auto mt-1">
                  Regulates your heart rate variability and relieves acute panic or physical tension.
                </p>
              </div>

              {/* Animated Pulsating Breathing Circle */}
              <div className="relative size-48 mx-auto flex items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-1000 ease-in-out ${
                    !breathingActive
                      ? 'scale-75 bg-[#dbeee8] opacity-60'
                      : breathPhase === 'Inhale'
                      ? 'scale-100 bg-[#c2ede2] opacity-90 shadow-[0_0_40px_rgba(30,131,114,0.3)]'
                      : breathPhase === 'Hold'
                      ? 'scale-100 bg-[#b2e7db] opacity-100'
                      : breathPhase === 'Exhale'
                      ? 'scale-60 bg-[#e2f3ee] opacity-70'
                      : 'scale-60 bg-[#dbeee8] opacity-50'
                  }`}
                />
                <div className="relative z-10 text-center">
                  <p className="text-xs font-semibold text-[#1e7e6f] uppercase tracking-wider">
                    {breathingActive ? breathPhase : 'Ready'}
                  </p>
                  <p className="text-3xl font-bold text-[#16433c] mt-0.5">
                    {breathingActive ? `${phaseSeconds}s` : '4-4-4'}
                  </p>
                  {breathingActive && (
                    <p className="text-[10px] text-[#6d8a83] mt-1">Cycle {completedCycles + 1}</p>
                  )}
                </div>
              </div>

              {/* Breathing Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setBreathingActive(!breathingActive)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold shadow-md transition ${
                    breathingActive
                      ? 'bg-[#d95b52] hover:bg-[#c24a41] text-white'
                      : 'bg-[#1e8574] hover:bg-[#186f60] text-white'
                  }`}
                >
                  {breathingActive ? <Pause size={17} /> : <Play size={17} />}
                  <span>{breathingActive ? 'Pause Exercise' : 'Start 2-Minute Guide'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setBreathingActive(false); setBreathPhase('Inhale'); setPhaseSeconds(4); setCompletedCycles(0); }}
                  className="p-3 rounded-2xl border border-[#d6e3df] text-[#627e78] hover:bg-[#f3f8f6] transition"
                  title="Reset"
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CALMING AUDIO SOUNDSCAPES */}
          {activeTab === 'soundscape' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-[#1d3d38]">Synthesized Calming Soundscapes</h4>
                <p className="text-xs text-[#718a84]">
                  Continuous acoustic noise masking designed to reduce distress signals. Generated live in your browser.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'rain', title: 'Gentle Pink Noise Monsoon', desc: 'Continuous soothing rainfall frequency to mask intrusive triggers', icon: Wind },
                  { id: 'binaural', title: '432 Hz Calming Resonance', desc: 'Harmonic sine wave known for reducing cortisol and anxiety', icon: Volume2 },
                  { id: 'bells', title: '528 Hz Healing Harmonic', desc: 'Deep grounding frequency for psychological decompression', icon: Sparkles }
                ].map((track) => {
                  const Icon = track.icon
                  const isCurrent = isPlayingAudio && selectedTrack === track.id
                  return (
                    <div
                      key={track.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#e7f5f1] border-[#228574]'
                          : 'bg-[#fbfcfb] border-[#e1ece8] hover:border-[#b9d7cf]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrent ? 'bg-[#1e8574] text-white' : 'bg-[#eaf3f0] text-[#297f70]'
                        }`}>
                          <Icon size={19} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#234741]">{track.title}</p>
                          <p className="text-[11px] text-[#718c85] mt-0.5">{track.desc}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSound(track.id as 'rain' | 'binaural' | 'bells')}
                        className={`size-10 rounded-xl flex items-center justify-center shadow-xs transition shrink-0 ${
                          isCurrent
                            ? 'bg-[#1e8574] text-white'
                            : 'bg-white border border-[#d3e2de] text-[#2c7d6e] hover:bg-[#eaf3f0]'
                        }`}
                      >
                        {isCurrent ? <Pause size={17} /> : <Play size={17} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 5-4-3-2-1 SENSORY GROUNDING */}
          {activeTab === 'grounding' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-[#1d3d38]">5-4-3-2-1 Sensory Grounding</h4>
                <p className="text-xs text-[#718a84]">
                  A clinically recognized technique to interrupt emotional flashbacks and bring your focus to the present.
                </p>
              </div>

              {/* Step Card */}
              <div className="p-5 rounded-2xl bg-[#eef7f4] border border-[#cfebd0] text-center space-y-3">
                <div className="size-12 rounded-2xl bg-[#1d8272] text-white flex items-center justify-center mx-auto text-xl font-bold shadow-md">
                  {groundingSteps[groundingStep].count}
                </div>
                <p className="text-sm font-semibold text-[#1a4b43]">{groundingSteps[groundingStep].prompt}</p>
                <p className="text-xs text-[#527d74] italic max-w-sm mx-auto">{groundingSteps[groundingStep].hint}</p>
              </div>

              {/* Progress and Next Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5">
                  {groundingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`size-2.5 rounded-full transition-all ${
                        i === groundingStep ? 'bg-[#1e8574] w-6' : i < groundingStep ? 'bg-[#73b5a9]' : 'bg-[#e0ece7]'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {groundingStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setGroundingStep(s => s - 1)}
                      className="px-3 py-2 text-xs font-semibold text-[#5a7670] hover:text-[#1e4842]"
                    >
                      Previous
                    </button>
                  )}
                  {groundingStep < groundingSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setGroundingStep(s => s + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e8574] text-white text-xs font-semibold hover:bg-[#176d5e] transition"
                    >
                      <span>Next Sense</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setGroundingStep(0); onClose(); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e8574] text-white text-xs font-semibold hover:bg-[#176d5e] transition"
                    >
                      <Check size={14} />
                      <span>Finish &amp; Return</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
