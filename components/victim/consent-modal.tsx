'use client'

import React, { useState } from 'react'
import { X, ShieldCheck, Lock, CheckCircle2, FileText, Check } from 'lucide-react'

interface ConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onConsentGiven: () => void
}

export function ConsentModal({ isOpen, onClose, onConsentGiven }: ConsentModalProps) {
  const [consentVoice, setConsentVoice] = useState(true)
  const [consentAnalysis, setConsentAnalysis] = useState(true)
  const [consentEscalation, setConsentEscalation] = useState(true)

  if (!isOpen) return null

  const handleConfirm = () => {
    onConsentGiven()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-[#173f39] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck size={18} className="text-[#a1e5d7]" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Informed Consent &amp; Privacy Shield</h3>
              <p className="text-[11px] text-[#a4d7cb]">Governed by Ethical AI &amp; PoA Act Privacy Provisions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#a4d7cb] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-[#41605a] leading-relaxed">
            To assess trauma, fear, and vulnerability in real time, the National Helpline Against Atrocities (14566) uses AI algorithms to analyze speech rhythms, acoustic pitch, and narrative keywords.
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#dbe8e3] bg-[#fbfdfc] cursor-pointer">
              <input
                type="checkbox"
                checked={consentVoice}
                onChange={(e) => setConsentVoice(e.target.checked)}
                className="mt-0.5 size-4 accent-[#1e8574] rounded"
              />
              <div>
                <p className="font-semibold text-[#1e4842]">Voice &amp; Acoustic Analysis Consent</p>
                <p className="text-[11px] text-[#6d8882] mt-0.5">
                  Authorize real-time extraction of acoustic features (speech rate, pitch jitter, energy) to measure distress.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#dbe8e3] bg-[#fbfdfc] cursor-pointer">
              <input
                type="checkbox"
                checked={consentAnalysis}
                onChange={(e) => setConsentAnalysis(e.target.checked)}
                className="mt-0.5 size-4 accent-[#1e8574] rounded"
              />
              <div>
                <p className="font-semibold text-[#1e4842]">NLP Trauma &amp; Threat Profiling</p>
                <p className="text-[11px] text-[#6d8882] mt-0.5">
                  Process statements to detect caste intimidation, social boycott, and depression markers for SVI scoring.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-2xl border border-[#dbe8e3] bg-[#fbfdfc] cursor-pointer">
              <input
                type="checkbox"
                checked={consentEscalation}
                onChange={(e) => setConsentEscalation(e.target.checked)}
                className="mt-0.5 size-4 accent-[#1e8574] rounded"
              />
              <div>
                <p className="font-semibold text-[#1e4842]">Emergency Referral Dispatch</p>
                <p className="text-[11px] text-[#6d8882] mt-0.5">
                  Permit automatic routing of critical risk alerts to NALSA Legal Aid, District Magisterial desks, and 14566 Counsellors.
                </p>
              </div>
            </label>
          </div>

          <div className="p-3 rounded-xl bg-[#eef7f4] border border-[#d1e8df] text-[11px] text-[#2c5f56] flex items-center gap-2">
            <Lock size={15} className="shrink-0 text-[#1e8574]" />
            <span>All biometric &amp; voice features are stored encrypted with zero third-party commercial sharing.</span>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-[#edf3f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#66827c] hover:text-[#20433e]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white text-xs font-semibold shadow-md transition"
            >
              <Check size={14} />
              <span>Accept &amp; Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
