'use client'

import React, { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck, Lock, User, Clock, AlertCircle } from 'lucide-react'

interface TeleCallModalProps {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  recipientRole: string
  recipientAvatarColor?: string
  recipientPhone?: string
}

export function TeleCallModal({
  isOpen,
  onClose,
  recipientName,
  recipientRole,
  recipientAvatarColor = '#1d8272',
  recipientPhone = '14566'
}: TeleCallModalProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting')
  const [seconds, setSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)

  useEffect(() => {
    let connectTimer: NodeJS.Timeout | null = null
    let callInterval: NodeJS.Timeout | null = null

    if (isOpen) {
      setCallStatus('connecting')
      setSeconds(0)
      setIsMuted(false)

      connectTimer = setTimeout(() => {
        setCallStatus('connected')
        callInterval = setInterval(() => {
          setSeconds(prev => prev + 1)
        }, 1000)
      }, 2000)
    }

    return () => {
      if (connectTimer) clearTimeout(connectTimer)
      if (callInterval) clearInterval(callInterval)
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatCallTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = () => {
    setCallStatus('ended')
    setTimeout(() => {
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#122824] text-white w-full max-w-sm rounded-3xl border border-[#235850] shadow-2xl overflow-hidden flex flex-col items-center p-6 sm:p-7 relative">
        {/* PoA Confidentiality Badge */}
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] text-[#a4ebd9] font-medium mb-6">
          <Lock size={12} />
          <span>Encrypted NHAA Secure Line · 14566</span>
        </div>

        {/* Recipient Avatar */}
        <div className="relative my-2">
          <div
            className="size-24 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white/20"
            style={{ backgroundColor: recipientAvatarColor }}
          >
            {recipientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {callStatus === 'connected' && (
            <span className="absolute bottom-1 right-1 size-5 rounded-full bg-[#10b981] border-2 border-[#122824] animate-pulse" />
          )}
        </div>

        {/* Info */}
        <h3 className="mt-3 text-lg font-bold text-center tracking-tight text-white">{recipientName}</h3>
        <p className="text-xs text-[#8ee0ce] text-center font-medium mt-0.5">{recipientRole}</p>
        <p className="text-[11px] text-white/50 font-mono mt-1">{recipientPhone}</p>

        {/* Status / Timer */}
        <div className="mt-5 py-1.5 px-4 rounded-xl bg-black/30 border border-white/10">
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-2 text-xs text-[#fde047] animate-pulse">
              <Clock size={13} />
              <span>Connecting encrypted voice line...</span>
            </div>
          )}
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#4ade80] font-bold">
              <span className="size-2 rounded-full bg-[#4ade80] animate-ping" />
              <span>{formatCallTime(seconds)}</span>
            </div>
          )}
          {callStatus === 'ended' && (
            <div className="text-xs text-white/60">
              <span>Call Ended</span>
            </div>
          )}
        </div>

        {/* In-Call Audio Waves (Simulated) */}
        {callStatus === 'connected' && (
          <div className="flex items-center gap-1.5 h-8 my-4">
            {[12, 24, 18, 30, 20, 28, 14, 22, 32, 16, 26, 12].map((height, i) => (
              <div
                key={i}
                className="w-1 bg-[#2dd4bf] rounded-full animate-pulse"
                style={{
                  height: `${height}px`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        )}

        {/* Call Controls */}
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`size-12 rounded-full flex items-center justify-center transition ${
              isMuted ? 'bg-[#ef4444] text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            className="size-14 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center shadow-lg transition active:scale-95"
            title="End Call"
          >
            <PhoneOff size={22} />
          </button>

          <button
            type="button"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`size-12 rounded-full flex items-center justify-center transition ${
              !isSpeakerOn ? 'bg-[#f59e0b] text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        <p className="mt-5 text-[10px] text-white/40 text-center">
          Triage audio is protected under SC/ST PoA Act victim privacy rights.
        </p>
      </div>
    </div>
  )
}
