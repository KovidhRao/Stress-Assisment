'use client'

import React, { useState } from 'react'
import { X, Brain, ArrowRight, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react'
import { CaseService } from '@/lib/services/case-service'

interface DistressSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  surveyType: 'pre_intervention' | 'post_intervention'
  caseId: string
  userId: string
  onComplete?: (result: { stressLevel: number; anxietyLevel: number; safetyFeeling: number }) => void
}

const QUESTIONS = [
  {
    key: 'stress',
    title: 'Stress Level',
    description: 'How stressed do you feel right now?',
    icon: '😰',
    labels: ['1 - Very Low', '3 - Low', '5 - Moderate', '7 - High', '10 - Extreme']
  },
  {
    key: 'anxiety',
    title: 'Anxiety Level',
    description: 'How anxious or worried do you feel right now?',
    icon: '😟',
    labels: ['1 - Very Calm', '3 - Mild', '5 - Moderate', '7 - Severe', '10 - Panic']
  },
  {
    key: 'safety',
    title: 'Safety Feeling',
    description: 'How safe do you feel right now?',
    icon: '🛡️',
    labels: ['1 - Very Unsafe', '3 - Unsafe', '5 - Neutral', '7 - Safe', '10 - Very Safe']
  }
]

export function DistressSurveyModal({ isOpen, onClose, surveyType, caseId, userId, onComplete }: DistressSurveyModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({ stress: 5, anxiety: 5, safety: 5 })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const isPre = surveyType === 'pre_intervention'

  const handleSelect = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await CaseService.submitDistressSurvey({
        caseId,
        userId,
        surveyType,
        stressLevel: answers.stress,
        anxietyLevel: answers.anxiety,
        safetyFeeling: answers.safety,
        notes: isPre ? 'Pre-intervention baseline' : 'Post-intervention assessment'
      })
      setSubmitted(true)
      onComplete?.({
        stressLevel: answers.stress,
        anxietyLevel: answers.anxiety,
        safetyFeeling: answers.safety
      })
    } catch (err) {
      console.warn('Survey submit error:', err)
    } finally {
      setSaving(false)
    }
  }

  const currentQ = QUESTIONS[currentStep]
  const currentValue = answers[currentQ.key as keyof typeof answers]

  // Slider colors
  const getSliderColor = (value: number) => {
    if (value <= 3) return 'bg-emerald-500'
    if (value <= 6) return 'bg-amber-500'
    if (value <= 8) return 'bg-orange-500'
    return 'bg-red-600'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className={`p-5 ${isPre ? 'bg-[#173f39]' : 'bg-[#1c4a8a]'} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Brain size={18} className={isPre ? 'text-[#a1e5d7]' : 'text-[#93c5fd]'} />
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {isPre ? 'Pre-Intervention Check-In' : 'Post-Intervention Check-In'}
              </h3>
              <p className="text-[11px] text-white/60">
                {isPre ? 'How do you feel before starting the exercise?' : 'How do you feel after completing the exercise?'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className={`size-16 rounded-full ${isPre ? 'bg-[#ecfdf5]' : 'bg-[#eff6ff]'} flex items-center justify-center mx-auto`}>
                <CheckCircle2 size={32} className={isPre ? 'text-[#059669]' : 'text-[#2563eb]'} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#1f423d]">
                  {isPre ? 'Baseline Recorded!' : 'Assessment Complete!'}
                </h4>
                <p className="text-xs text-[#718b85] mt-1">
                  {isPre
                    ? 'Your current state has been recorded. The wellbeing exercise will now begin.'
                    : 'Thank you. Your post-exercise state has been captured to measure progress.'
                  }
                </p>
              </div>

              {!isPre && (
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-[#edf3f0]">
                  <div className="text-center">
                    <p className="text-[10px] text-[#718b85] uppercase font-bold">Stress</p>
                    <p className="text-lg font-bold text-[#1f423d]">{answers.stress}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[#718b85] uppercase font-bold">Anxiety</p>
                    <p className="text-lg font-bold text-[#1f423d]">{answers.anxiety}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[#718b85] uppercase font-bold">Safety</p>
                    <p className="text-lg font-bold text-[#1f423d]">{answers.safety}/10</p>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition"
              >
                {isPre ? 'Start Exercise' : 'Done'}
              </button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between text-xs text-[#718b85]">
                <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
                <span className="font-semibold text-[#1e8574]">{currentQ.title}</span>
              </div>

              <div className="w-full bg-[#eef4f1] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1e8574] h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="text-center space-y-3">
                <span className="text-4xl">{currentQ.icon}</span>
                <h4 className="text-base font-bold text-[#20433e]">{currentQ.description}</h4>
              </div>

              {/* Slider */}
              <div className="space-y-3 px-4">
                <div className="relative">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={currentValue}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.key]: parseInt(e.target.value) }))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#718b85] font-medium">
                  <span>1 - Low</span>
                  <span className="text-lg font-bold text-[#1f423d] bg-[#f0f6f3] px-3 py-1 rounded-xl border border-[#d6e3df]">
                    {currentValue}
                  </span>
                  <span>10 - High</span>
                </div>
              </div>

              {/* Continue Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => handleSelect(currentQ.key, currentValue)}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition shadow-md"
                >
                  {currentStep < QUESTIONS.length - 1 ? (
                    <>
                      <span>Next</span>
                      <ArrowRight size={14} />
                    </>
                  ) : saving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Submit {isPre ? 'Baseline' : 'Assessment'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
