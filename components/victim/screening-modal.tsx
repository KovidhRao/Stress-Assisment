'use client'

import React, { useState } from 'react'
import { X, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Brain } from 'lucide-react'

interface ScreeningModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (score: number, answers: number[]) => void
}

const QUESTIONS = [
  {
    id: 1,
    title: 'Anxiety & Vigilance',
    text: 'Over the last 2 weeks or since the incident, how often have you felt constantly nervous, fearful, or on edge regarding your safety?'
  },
  {
    id: 2,
    title: 'Intrusive Flashbacks & Tremors',
    text: 'How often have you experienced distressing memories, nightmares, shaking, or heart palpitations when thinking about what happened?'
  },
  {
    id: 3,
    title: 'Hopelessness & Isolation',
    text: 'Have you felt down, socially excluded, or that no one can help you navigate this situation?'
  },
  {
    id: 4,
    title: 'Fear of Retaliation / Coercion',
    text: 'Are you experiencing persistent fear of retaliation, threats, or denial of basic resources from perpetrators/authorities?'
  }
]

const OPTIONS = [
  { score: 0, label: 'Not at all' },
  { score: 1, label: 'Several days' },
  { score: 2, label: 'More than half the days' },
  { score: 3, label: 'Nearly every day / Constantly' }
]

export function ScreeningModal({ isOpen, onClose, onComplete }: ScreeningModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0])

  if (!isOpen) return null

  const handleSelectOption = (score: number) => {
    const nextAnswers = [...answers]
    nextAnswers[currentStep] = score
    setAnswers(nextAnswers)

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      const totalScore = nextAnswers.reduce((a, b) => a + b, 0)
      onComplete(totalScore, nextAnswers)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-5 bg-[#173f39] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Brain size={18} className="text-[#a1e5d7]" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Quick Clinical Distress Check</h3>
              <p className="text-[11px] text-[#a4d7cb]">Standardized 4-Factor Trauma Screen (PCL-5 / PHQ-4)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#a4d7cb] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Question Body */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between text-xs text-[#718b85]">
            <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
            <span className="font-semibold text-[#1e8574]">{QUESTIONS[currentStep].title}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#eef4f1] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#1e8574] h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>

          <div className="min-h-[70px]">
            <h4 className="text-sm font-semibold text-[#20433e] leading-relaxed">
              {QUESTIONS[currentStep].text}
            </h4>
          </div>

          {/* Option list */}
          <div className="space-y-2.5">
            {OPTIONS.map((opt) => (
              <button
                key={opt.score}
                type="button"
                onClick={() => handleSelectOption(opt.score)}
                className="w-full p-3.5 rounded-2xl border border-[#dcebe6] bg-[#fbfdfc] hover:bg-[#eaf4f1] hover:border-[#1e8574] text-left transition flex items-center justify-between group"
              >
                <span className="text-xs font-medium text-[#254742] group-hover:text-[#184c43]">
                  {opt.label}
                </span>
                <span className="text-[11px] font-bold text-[#86a29b] group-hover:text-[#1e8574]">
                  +{opt.score} pts
                </span>
              </button>
            ))}
          </div>

          {currentStep > 0 && (
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="text-xs font-semibold text-[#66827c] hover:text-[#20433e]"
              >
                ← Back to previous question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
