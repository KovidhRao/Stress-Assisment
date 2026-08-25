'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertOctagon, PhoneCall, ShieldAlert, CheckCircle2, Radio, MapPin, ArrowRight } from 'lucide-react'

interface SOSModalProps {
  isOpen: boolean
  onClose: () => void
  complainantName?: string
}

export function SOSModal({ isOpen, onClose, complainantName = 'Complainant' }: SOSModalProps) {
  const [dispatchStage, setDispatchStage] = useState<1 | 2 | 3>(1)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (isOpen && dispatchStage === 1) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setDispatchStage(2)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, dispatchStage])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#fecaca] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Urgent Header */}
        <div className="p-5 bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse">
              <AlertOctagon size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">EMERGENCY SOS DISPATCH</h3>
              <p className="text-[11px] text-[#fecaca]">National Helpline Against Atrocities (14566)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stage 1: Countdown & Cancel */}
          {dispatchStage === 1 && (
            <div className="text-center space-y-4">
              <p className="text-xs font-semibold text-[#991b1b] uppercase tracking-wider">
                Emergency Rapid Response Triggering
              </p>
              <div className="size-24 rounded-full border-4 border-[#fca5a5] border-t-[#dc2626] flex items-center justify-center mx-auto animate-spin">
                <span className="text-3xl font-bold text-[#991b1b] -rotate-45">{countdown}</span>
              </div>
              <p className="text-xs text-[#6b7280] max-w-xs mx-auto">
                Connecting your verified device location to the District Magistrate &amp; Police Control Room.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl border border-[#d1d5db] text-xs font-semibold text-[#4b5563] hover:bg-[#f3f4f6]"
                >
                  Cancel SOS
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchStage(2)}
                  className="px-5 py-2 rounded-xl bg-[#dc2626] text-white text-xs font-bold hover:bg-[#b91c1c] shadow-md"
                >
                  Dispatch Immediately
                </button>
              </div>
            </div>
          )}

          {/* Stage 2 & 3: Dispatched confirmation & Hotline call link */}
          {(dispatchStage === 2 || dispatchStage === 3) && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#fef2f2] border border-[#fecaca] flex items-start gap-3">
                <Radio size={20} className="text-[#dc2626] shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-[#7f1d1d]">
                  <p className="font-bold text-sm">Emergency Alert Broadcasted!</p>
                  <p className="mt-1 leading-relaxed">
                    Priority Tier 1 Alert sent to National Helpline Command Centre (14566) and District SP Atrocities Nodal Desk.
                  </p>
                  <p className="mt-2 font-mono text-[11px] bg-white/60 p-1.5 rounded-lg border border-[#fecaca] w-fit">
                    Incident Tracking ID: SOS-2026-{Math.floor(Math.random() * 9000 + 1000)}
                  </p>
                </div>
              </div>

              {/* Instant Call Bridge */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#374151] uppercase tracking-wider">Direct Helpline Bridges</p>
                <a
                  href="tel:14566"
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#1d8272] text-white hover:bg-[#186f60] transition shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <PhoneCall size={18} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Call 14566 (NHAA Toll-Free 24x7)</p>
                      <p className="text-[11px] text-[#a4d7cb]">Direct connect with psychological triage counsellor</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition" />
                </a>

                <a
                  href="tel:112"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#dc2626] text-white hover:bg-[#b91c1c] transition shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <ShieldAlert size={16} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-xs">Call 112 (National Emergency Police)</p>
                      <p className="text-[10px] text-[#fecaca]">For immediate physical threat or mob violence</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-white/80 group-hover:translate-x-1 transition" />
                </a>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#f3f4f6] text-[#4b5563] text-xs font-semibold hover:bg-[#e5e7eb]"
                >
                  Close &amp; Return to Safe Space
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
