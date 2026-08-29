'use client'

import React, { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Minus, Brain, Shield, Activity, BarChart3 } from 'lucide-react'
import { CaseService } from '@/lib/services/case-service'
import { t } from '@/lib/i18n'

interface BeforeAfterComparisonProps {
  caseId: string
  currentLanguage?: string
}

interface SurveyPair {
  pre: {
    stressLevel: number
    anxietyLevel: number | null
    safetyFeeling: number | null
    createdAt: string
  } | null
  post: {
    stressLevel: number
    anxietyLevel: number | null
    safetyFeeling: number | null
    createdAt: string
  } | null
}

function DeltaIndicator({ before, after, lowerIsBetter = true }: { before: number; after: number; lowerIsBetter?: boolean }) {
  const delta = after - before
  const improved = lowerIsBetter ? delta < 0 : delta > 0
  const unchanged = delta === 0

  if (unchanged) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6b7280] bg-gray-100 px-2 py-0.5 rounded-full">
        <Minus size={10} />
        No change
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      improved ? 'text-[#059669] bg-emerald-50' : 'text-[#dc2626] bg-red-50'
    }`}>
      {improved ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
      {delta > 0 ? '+' : ''}{delta}
    </span>
  )
}

function ScoreBar({ label, before, after, maxVal = 10, icon, lowerIsBetter = true }: {
  label: string
  before: number
  after: number
  maxVal?: number
  icon: React.ReactNode
  lowerIsBetter?: boolean
}) {
  const beforePct = (before / maxVal) * 100
  const afterPct = (after / maxVal) * 100
  const delta = after - before
  const improved = lowerIsBetter ? delta < 0 : delta > 0

  const getColor = (val: number) => {
    if (val <= 3) return 'bg-emerald-500'
    if (val <= 6) return 'bg-amber-500'
    if (val <= 8) return 'bg-orange-500'
    return 'bg-red-600'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-lg bg-[#f0f6f3] flex items-center justify-center text-[#1d8272]">
            {icon}
          </span>
          <span className="text-xs font-bold text-[#163a34]">{label}</span>
        </div>
        <DeltaIndicator before={before} after={after} lowerIsBetter={lowerIsBetter} />
      </div>

      {/* Before bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#6b8c84]">
          <span>Before</span>
          <span className="font-bold">{before}/{maxVal}</span>
        </div>
        <div className="h-3 bg-[#f0f6f3] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getColor(before)}`}
            style={{ width: `${beforePct}%` }}
          />
        </div>
      </div>

      {/* After bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#6b8c84]">
          <span>After</span>
          <span className="font-bold">{after}/{maxVal}</span>
        </div>
        <div className="h-3 bg-[#f0f6f3] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${improved ? 'bg-emerald-500' : improved === false && delta > 0 ? 'bg-red-500' : getColor(after)}`}
            style={{ width: `${afterPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function BeforeAfterComparison({ caseId, currentLanguage = 'en' }: BeforeAfterComparisonProps) {
  const [surveyPairs, setSurveyPairs] = useState<SurveyPair[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSurveys = async () => {
      setLoading(true)
      try {
        const surveys = await CaseService.fetchDistressSurveys(caseId)

        // Pair pre and post surveys by chronological order
        const preSurveys = surveys.filter(s => s.surveyType === 'pre_intervention')
        const postSurveys = surveys.filter(s => s.surveyType === 'post_intervention')

        const pairs: SurveyPair[] = []

        // Match pre surveys with the nearest post survey after them
        for (const pre of preSurveys) {
          const matchingPost = postSurveys.find(p =>
            new Date(p.createdAt) > new Date(pre.createdAt)
          )

          pairs.push({
            pre: {
              stressLevel: pre.stressLevel,
              anxietyLevel: pre.anxietyLevel,
              safetyFeeling: pre.safetyFeeling,
              createdAt: pre.createdAt
            },
            post: matchingPost ? {
              stressLevel: matchingPost.stressLevel,
              anxietyLevel: matchingPost.anxietyLevel,
              safetyFeeling: matchingPost.safetyFeeling,
              createdAt: matchingPost.createdAt
            } : null
          })
        }

        setSurveyPairs(pairs)
      } catch (err) {
        console.warn('Failed to load distress surveys:', err)
      } finally {
        setLoading(false)
      }
    }

    if (caseId) loadSurveys()
  }, [caseId])

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[#6b8881]">
          <div className="size-4 border-2 border-[#1d8272] border-t-transparent rounded-full animate-spin" />
          Loading survey data...
        </div>
      </div>
    )
  }

  if (surveyPairs.length === 0) {
    return (
      <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#f0f6f3] flex items-center justify-center">
            <BarChart3 size={18} className="text-[#1d8272]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#163a34]">
              {t('bac_no_data_title', currentLanguage)}
            </h3>
            <p className="text-[11px] text-[#6b8881] mt-0.5">
              {t('bac_no_data_desc', currentLanguage)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate overall improvement stats
  const completedPairs = surveyPairs.filter(p => p.post !== null)
  const avgStressDelta = completedPairs.length > 0
    ? completedPairs.reduce((sum, p) => sum + ((p.post?.stressLevel || 0) - (p.pre?.stressLevel || 0)), 0) / completedPairs.length
    : 0
  const avgAnxietyDelta = completedPairs.length > 0
    ? completedPairs.reduce((sum, p) => sum + ((p.post?.anxietyLevel || 0) - (p.pre?.anxietyLevel || 0)), 0) / completedPairs.length
    : 0
  const avgSafetyDelta = completedPairs.length > 0
    ? completedPairs.reduce((sum, p) => sum + ((p.post?.safetyFeeling || 0) - (p.pre?.safetyFeeling || 0)), 0) / completedPairs.length
    : 0

  return (
    <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#eff6ff] flex items-center justify-center">
            <BarChart3 size={18} className="text-[#2563eb]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#163a34]">
              {t('bac_title', currentLanguage)}
            </h3>
            <p className="text-[11px] text-[#6b8881]">
              {t('bac_subtitle', currentLanguage)}
            </p>
          </div>
        </div>
        <span className="rounded-xl bg-[#eff6ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">
          {completedPairs.length} {t('bac_sessions', currentLanguage)}
        </span>
      </div>

      {/* Summary Stats */}
      {completedPairs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-2xl bg-[#fef2f2] border border-[#fecaca]">
            <p className="text-[10px] font-bold text-[#991b1b] uppercase">{t('bac_stress_change', currentLanguage)}</p>
            <p className={`text-lg font-extrabold mt-1 ${avgStressDelta < 0 ? 'text-[#059669]' : avgStressDelta > 0 ? 'text-[#dc2626]' : 'text-[#6b7280]'}`}>
              {avgStressDelta > 0 ? '+' : ''}{avgStressDelta.toFixed(1)}
            </p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-[#fefce8] border border-[#fef08a]">
            <p className="text-[10px] font-bold text-[#854d0e] uppercase">{t('bac_anxiety_change', currentLanguage)}</p>
            <p className={`text-lg font-extrabold mt-1 ${avgAnxietyDelta < 0 ? 'text-[#059669]' : avgAnxietyDelta > 0 ? 'text-[#dc2626]' : 'text-[#6b7280]'}`}>
              {avgAnxietyDelta > 0 ? '+' : ''}{avgAnxietyDelta.toFixed(1)}
            </p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0]">
            <p className="text-[10px] font-bold text-[#166534] uppercase">{t('bac_safety_change', currentLanguage)}</p>
            <p className={`text-lg font-extrabold mt-1 ${avgSafetyDelta > 0 ? 'text-[#059669]' : avgSafetyDelta < 0 ? 'text-[#dc2626]' : 'text-[#6b7280]'}`}>
              {avgSafetyDelta > 0 ? '+' : ''}{avgSafetyDelta.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Detailed Pair Comparisons */}
      <div className="space-y-6">
        {surveyPairs.map((pair, idx) => (
          <div key={idx} className="rounded-2xl border border-[#e5f0ec] bg-[#fbfdfc] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#163a34]">
                {t('bac_session', currentLanguage)} #{idx + 1}
              </h4>
              {pair.pre && (
                <span className="text-[10px] text-[#6b8881]">
                  {new Date(pair.pre.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {pair.pre && pair.post ? (
              <div className="grid gap-5 sm:grid-cols-3">
                <ScoreBar
                  label={t('bac_stress', currentLanguage)}
                  before={pair.pre.stressLevel}
                  after={pair.post.stressLevel}
                  icon={<Activity size={12} />}
                  lowerIsBetter={true}
                />
                <ScoreBar
                  label={t('bac_anxiety', currentLanguage)}
                  before={pair.pre.anxietyLevel || 5}
                  after={pair.post.anxietyLevel || 5}
                  icon={<Brain size={12} />}
                  lowerIsBetter={true}
                />
                <ScoreBar
                  label={t('bac_safety', currentLanguage)}
                  before={pair.pre.safetyFeeling || 5}
                  after={pair.post.safetyFeeling || 5}
                  icon={<Shield size={12} />}
                  lowerIsBetter={false}
                />
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[#6b8881]">
                {t('bac_pending_post', currentLanguage)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
