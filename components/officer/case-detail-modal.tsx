'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Brain, 
  Mic, 
  FileText, 
  MapPin, 
  Phone, 
  Calendar, 
  Send, 
  CheckCircle2, 
  UserCheck, 
  Scale, 
  Stethoscope, 
  Building, 
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Activity,
  History,
  TrendingUp,
  Layers,
  BarChart3,
  HelpCircle,
  Clock,
  Zap,
  Info,
  BadgeAlert,
  Heart
} from 'lucide-react'
import { CaseRecord, RiskLevel, ContributingFactor } from '@/types'
import { CaseService } from '@/lib/services/case-service'

interface CaseDetailModalProps {
  caseRecord: CaseRecord | null
  isOpen: boolean
  onClose: () => void
  onUpdateCase: (updated: CaseRecord) => void
  currentUserRole?: string
}

// ─── Radar Chart Sub-Component ───────────────────────────────────────────────
interface RadarDimension {
  label: string
  value: number // 0-100
  color: string
}

function SviRadarChart({ dimensions }: { dimensions: RadarDimension[] }) {
  const cx = 160
  const cy = 145
  const maxR = 95
  const count = dimensions.length

  // Calculate polygon points
  const getCoordinates = (value: number, index: number) => {
    const angle = (index * (360 / count) - 90) * (Math.PI / 180)
    const r = (Math.max(8, Math.min(100, value)) / 100) * maxR
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    return { x, y }
  }

  // Background concentric grid rings (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  const radarPoints = dimensions.map((d, i) => {
    const pt = getCoordinates(d.value, i)
    return `${pt.x},${pt.y}`
  }).join(' ')

  return (
    <div className="flex flex-col items-center bg-[#173f39] text-white p-5 rounded-3xl border border-[#235850] shadow-inner">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#9ee7d8]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#a2dcd0]">6D Trauma &amp; Risk Radar</span>
        </div>
        <span className="text-[10px] bg-white/15 px-2.5 py-0.5 rounded-full font-mono text-[#9ee7d8]">Real-time Vector</span>
      </div>

      <svg width={320} height={290} className="overflow-visible select-none my-1">
        {/* Background Grid Rings */}
        {gridLevels.map((lvl, idx) => {
          const ringPoints = dimensions.map((_, i) => {
            const angle = (i * (360 / count) - 90) * (Math.PI / 180)
            const r = lvl * maxR
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
          }).join(' ')

          return (
            <polygon
              key={idx}
              points={ringPoints}
              fill={idx === 4 ? 'rgba(23, 63, 57, 0.4)' : 'none'}
              stroke="rgba(158, 231, 216, 0.15)"
              strokeWidth="1"
            />
          )
        })}

        {/* Spoke Axis Lines */}
        {dimensions.map((_, i) => {
          const outerPt = getCoordinates(100, i)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outerPt.x}
              y2={outerPt.y}
              stroke="rgba(158, 231, 216, 0.2)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )
        })}

        {/* Radar Value Filled Polygon */}
        <polygon
          points={radarPoints}
          fill="rgba(34, 133, 116, 0.55)"
          stroke="#5eead4"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Vertex Dots & Labels */}
        {dimensions.map((d, i) => {
          const pt = getCoordinates(d.value, i)
          const angle = (i * (360 / count) - 90) * (Math.PI / 180)
          const labelR = maxR + 24
          const lx = cx + labelR * Math.cos(angle)
          const ly = cy + labelR * Math.sin(angle)

          return (
            <g key={i}>
              {/* Vertex glow point */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill={d.color || '#9ee7d8'}
                stroke="#173f39"
                strokeWidth="1.5"
              />

              {/* Axis Label */}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight="600"
                fill="#d8f3ec"
                className="select-none"
              >
                {d.label}
              </text>
              <text
                x={lx}
                y={ly + 11}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="bold"
                fill={d.color || '#9ee7d8'}
                className="select-none font-mono"
              >
                {d.value}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Explainable AI "Why this risk?" Sub-Component ───────────────────────────
function ExplainableAiSection({ 
  caseRecord 
}: { 
  caseRecord: CaseRecord 
}) {
  const { stress_assessment, voice_analysis, narrative_text } = caseRecord
  const svi = stress_assessment.svi_score
  const level = stress_assessment.risk_level

  // Synthesize rich contributing factors if missing
  const factors: ContributingFactor[] = useMemo(() => {
    if (stress_assessment.contributing_factors && stress_assessment.contributing_factors.length > 0) {
      return stress_assessment.contributing_factors
    }

    const calculated: ContributingFactor[] = []
    if (stress_assessment.trauma_score > 0) {
      calculated.push({ indicator: 'acute_trauma', contribution: Math.round(stress_assessment.trauma_score * 0.28) })
    }
    if (stress_assessment.fear_score > 0) {
      calculated.push({ indicator: 'fear_intimidation', contribution: Math.round(stress_assessment.fear_score * 0.24) })
    }
    if (stress_assessment.intimidation_flag) {
      calculated.push({ indicator: 'threat_violence', contribution: 26 })
    }
    if (stress_assessment.social_isolation_flag) {
      calculated.push({ indicator: 'social_ostracism', contribution: 20 })
    }
    if (stress_assessment.speech_stress_detected || voice_analysis) {
      calculated.push({ indicator: 'voice_acoustics', contribution: Math.round((voice_analysis?.acoustic_distress_score || 60) * 0.22) })
    }
    if (stress_assessment.depression_indicator) {
      calculated.push({ indicator: 'vulnerability', contribution: 18 })
    }
    return calculated.sort((a, b) => b.contribution - a.contribution)
  }, [stress_assessment, voice_analysis])

  // Narrative trigger highlights
  const triggers = stress_assessment.key_trauma_triggers || []

  return (
    <div className="space-y-4 rounded-3xl bg-gradient-to-br from-[#f8faf9] to-[#edf6f3] border border-[#d2e7e0] p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#1d8272] text-white flex items-center justify-center shadow-xs">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1a413b]">Explainable AI — Why This Risk Score?</h3>
            <p className="text-[11px] text-[#557870]">Transparent model reasoning &amp; decision tree justification</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white text-[#1d8272] border border-[#cfe3dc] shadow-xs">
          Score: {svi}/100 ({level})
        </span>
      </div>

      {/* Model Decision Pathway */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#e1ece8] space-y-2.5 text-xs">
        <p className="font-bold text-[#1f423d] flex items-center gap-1.5">
          <Info size={13} className="text-[#1d8272]" />
          <span>Decision Logic &amp; Risk Classification Path</span>
        </p>
        <p className="text-[#40625c] leading-relaxed text-[11px]">
          The SVI engine evaluated the complainant&apos;s narrative, acoustic voice biomarkers, and situational context. 
          {level === 'Critical' && (
            <span className="font-semibold text-[#dc2626]">
              {' '}Threshold exceeded ≥ 75 or critical threat escalation rules triggered. Imminent danger or acute violence indicators detected.
            </span>
          )}
          {level === 'High' && (
            <span className="font-semibold text-[#b87817]">
              {' '}Score falls in 50–74 range. High distress, severe intimidation or resource exclusion detected requiring priority officer dispatch.
            </span>
          )}
          {level === 'Moderate' && (
            <span className="font-semibold text-[#1e40af]">
              {' '}Score falls in 25–49 range. Substantial emotional distress requiring scheduled psychological consultation and legal counselling.
            </span>
          )}
          {level === 'Low' && (
            <span className="font-semibold text-[#065f46]">
              {' '}Baseline stress detected under standard welfare monitoring protocols.
            </span>
          )}
        </p>

        {stress_assessment.safety_escalation_applied && (
          <div className="p-2.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] font-semibold text-[11px] flex items-center gap-2">
            <BadgeAlert size={14} className="shrink-0" />
            <span>PoA Safety Rule Triggered: Active Threat (&gt;66%) + Immediate Danger verified.</span>
          </div>
        )}
      </div>

      {/* Factor Contribution Ranking */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider">Top Indicator Contributions to SVI</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {factors.map((f, idx) => {
            const percentage = Math.min(100, Math.round((f.contribution / (svi || 1)) * 100))
            return (
              <div key={idx} className="p-3 rounded-2xl bg-white border border-[#e2eee9] flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold capitalize text-[#1f423d]">{f.indicator.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-[#1d8272]">+{f.contribution} pts</span>
                </div>
                <div className="w-full bg-[#eef5f2] h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-[#1d8272] to-[#4ade80]" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#718f88] mt-1.5">Impact: {percentage}% of total risk score</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Matched Keywords & Direct NLP Evidence */}
      {triggers.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-[#e0ede8] space-y-2 text-xs">
          <p className="font-bold text-[#20433e]">Extracted NLP Linguistic Evidence:</p>
          <div className="flex flex-wrap gap-1.5">
            {triggers.map((trig, i) => (
              <span key={i} className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[#eaf6f2] text-[#166558] border border-[#cbe8de]">
                &quot;{trig}&quot;
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Case Activity Timeline Sub-Component ───────────────────────────────────
function ActivityTimelineTabContent({ caseRecord }: { caseRecord: CaseRecord }) {
  const [activities, setActivities] = useState<Array<{
    id: string; case_id: string; title: string; description: string; type: string; timestamp: string; created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const loadActivities = useCallback(async () => {
    if (!caseRecord) return
    setLoading(true)
    try {
      const data = await CaseService.fetchActivities(caseRecord.id)
      if (data.length > 0) {
        setActivities(data)
      } else {
        // Generate synthetic audit trail from case state for mock / fallback cases
        const now = Date.now()
        const synth: Array<{ id: string; case_id: string; title: string; description: string; type: string; timestamp: string; created_at: string }> = [
          {
            id: 'SA-INIT', case_id: caseRecord.id,
            title: `Story #${caseRecord.id} Submitted & AI-Assessed`,
            description: `Risk Level: ${caseRecord.stress_assessment.risk_level} (SVI ${caseRecord.stress_assessment.svi_score}). Narrative processed by NHAA Multilingual NLP Engine.`,
            type: 'intake',
            timestamp: 'Initial',
            created_at: new Date(now - 3600000 * 2).toISOString()
          },
          {
            id: 'SA-TRIAGE', case_id: caseRecord.id,
            title: `Automated Triage — ${caseRecord.stress_assessment.risk_level} Risk Classification`,
            description: `SVI ${caseRecord.stress_assessment.svi_score}/100. Trauma: ${caseRecord.stress_assessment.trauma_score}%, Fear: ${caseRecord.stress_assessment.fear_score}%, Anxiety: ${caseRecord.stress_assessment.anxiety_score}%. Proximity routing applied.`,
            type: 'triage',
            timestamp: 'Initial',
            created_at: new Date(now - 3600000 * 1.8).toISOString()
          }
        ]
        if (caseRecord.assigned_officer) {
          synth.push({
            id: 'SA-ASSIGN', case_id: caseRecord.id,
            title: `Officer Assigned: ${caseRecord.assigned_officer}`,
            description: `Case routed via proximity engine. Assigned for ${caseRecord.stress_assessment.risk_level} priority handling.${caseRecord.assigned_counsellor ? ` Counsellor: ${caseRecord.assigned_counsellor}.` : ''}`,
            type: 'dispatch',
            timestamp: 'Initial',
            created_at: new Date(now - 3600000 * 1.5).toISOString()
          })
        }
        if (caseRecord.dispatched_actions.length > 0) {
          caseRecord.dispatched_actions.forEach((da, i) => {
            synth.push({
              id: `SA-DA-${i}`, case_id: caseRecord.id,
              title: `Action Dispatched: ${da.action_type}`,
              description: `Official redressal dispatched with Ref ${da.reference_id || 'N/A'}. Status: ${da.status}.`,
              type: 'dispatch',
              timestamp: da.dispatched_at || 'Dispatched',
              created_at: new Date(now - 3600000).toISOString()
            })
          })
        }
        setActivities(synth)
      }
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [caseRecord])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const handleAddCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return

    const ok = await CaseService.addActivity({
      caseId: caseRecord.id,
      title: customTitle.trim(),
      description: customDesc.trim() || 'Recorded by Authorized Officer',
      type: 'status_change'
    })

    if (ok) {
      setCustomTitle('')
      setCustomDesc('')
      setShowAddForm(false)
      loadActivities()
    }
  }

  const typeIcons: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
    intake: { icon: <FileText size={14} />, bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]' },
    triage: { icon: <Brain size={14} />, bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]' },
    dispatch: { icon: <ShieldCheck size={14} />, bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]' },
    note: { icon: <MessageSquare size={14} />, bg: 'bg-[#f5f3ff]', text: 'text-[#6d28d9]' },
    review: { icon: <CheckCircle2 size={14} />, bg: 'bg-[#ecfdf5]', text: 'text-[#047857]' },
    escalation: { icon: <AlertTriangle size={14} />, bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]' },
    followup: { icon: <Calendar size={14} />, bg: 'bg-[#fdf4ff]', text: 'text-[#a21caf]' },
    survey: { icon: <Activity size={14} />, bg: 'bg-[#ecfeff]', text: 'text-[#0e7490]' },
    status_change: { icon: <Zap size={14} />, bg: 'bg-[#f8fafc]', text: 'text-[#334155]' }
  }

  // Compute activity stats
  const statsByType = activities.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider">Case Activity &amp; Audit Log</p>
          <p className="text-[11px] text-[#718b85] mt-0.5">Immutable chronological trail of all intake, assessment, and officer actions</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition"
        >
          <PlusCircleIcon />
          <span>{showAddForm ? 'Cancel' : 'Log Milestone'}</span>
        </button>
      </div>

      {/* Activity Stats Bar */}
      {activities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-[#718b85] uppercase">Events:</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#f0f8f5] text-[#1d8272] border border-[#cfe3dc]">{activities.length} total</span>
          {Object.entries(statsByType).map(([type, count]) => {
            const cfg = typeIcons[type]
            if (!cfg) return null
            return (
              <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border border-current/10`}>
                {type.replace('_', ' ')}: {count}
              </span>
            )
          })}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddCustomActivity} className="p-4 rounded-2xl bg-[#f0f8f5] border border-[#cfe3dc] space-y-3 text-xs">
          <div>
            <label className="font-bold text-[#20433e] block mb-1">Milestone / Action Title</label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="e.g., Complainant contacted via phone, Safe Shelter arranged"
              className="w-full p-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
              required
            />
          </div>
          <div>
            <label className="font-bold text-[#20433e] block mb-1">Audit Details / Description</label>
            <textarea
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
              placeholder="Provide official observations or legal dispatch details..."
              className="w-full p-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white min-h-[60px]"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition">
              Record Milestone
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-[#718b85] italic text-center py-6">Loading activity timeline...</p>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <History size={32} className="mx-auto mb-2 text-[#a2beb7]" />
          <p className="text-xs text-[#718b85]">Initial case intake recorded. No subsequent actions logged yet.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#d8e8e2]">
          {activities.map((act) => {
            const config = typeIcons[act.type] || typeIcons.status_change

            return (
              <div key={act.id} className="relative group text-xs">
                {/* Node icon */}
                <div className={`absolute -left-6 top-1 size-6 rounded-full ${config.bg} ${config.text} border-2 border-white shadow-xs flex items-center justify-center`}>
                  {config.icon}
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-[#e2eee9] shadow-xs space-y-1 ml-2 transition hover:border-[#1d8272]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1f423d]">{act.title}</span>
                    <span className="text-[10px] text-[#718b85] font-mono">
                      {act.created_at ? new Date(act.created_at).toLocaleString() : act.timestamp}
                    </span>
                  </div>
                  <p className="text-[#41605a] leading-relaxed text-[11px]">{act.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PlusCircleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

// ─── Follow-Up Tab Sub-Component ─────────────────────────────────────────────
function FollowUpTabContent({ caseRecord }: { caseRecord: CaseRecord }) {
  const [followUps, setFollowUps] = useState<Array<{
    id: string; caseId: string; assignedTo: string; followUpType: string;
    scheduledAt: string; completedAt: string | null; status: string; notes: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({
    assignedTo: '',
    followUpType: 'check_in',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  })

  useEffect(() => {
    if (!caseRecord) return
    setLoading(true)
    CaseService.fetchFollowUps(caseRecord.id).then(fups => {
      setFollowUps(fups)
      setLoading(false)
    })
  }, [caseRecord])

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFollowUp.scheduledDate || !newFollowUp.assignedTo) return

    const scheduledAt = new Date(`${newFollowUp.scheduledDate}T${newFollowUp.scheduledTime || '10:00'}:00`).toISOString()

    const result = await CaseService.createFollowUp({
      caseId: caseRecord.id,
      assignedTo: newFollowUp.assignedTo,
      assignedRole: 'officer',
      followUpType: newFollowUp.followUpType,
      scheduledAt,
      notes: newFollowUp.notes || undefined
    })

    if (result) {
      setFollowUps(prev => [...prev, {
        id: result.id,
        caseId: caseRecord.id,
        assignedTo: newFollowUp.assignedTo,
        followUpType: newFollowUp.followUpType,
        scheduledAt,
        completedAt: null,
        status: 'pending',
        notes: newFollowUp.notes || null
      }])
      await CaseService.setFollowUpRequired(caseRecord.id, true)
      setShowForm(false)
      setNewFollowUp({ assignedTo: '', followUpType: 'check_in', scheduledDate: '', scheduledTime: '', notes: '' })
    }
  }

  const handleStatusChange = async (fupId: string, newStatus: string) => {
    const ok = await CaseService.updateFollowUpStatus(fupId, newStatus, caseRecord.id)
    if (ok) {
      setFollowUps(prev => prev.map(f => f.id === fupId ? { ...f, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : f.completedAt } : f))
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]',
    in_progress: 'bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]',
    completed: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
    cancelled: 'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]'
  }

  const typeLabels: Record<string, string> = {
    check_in: 'Welfare Check-In',
    medical: 'Medical Follow-Up',
    legal: 'Legal Aid Follow-Up',
    welfare: 'Welfare Visit'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider">Follow-Up Schedule</p>
          <p className="text-[11px] text-[#718b85] mt-0.5">Track check-ins and welfare visits for this case</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition"
        >
          <Calendar size={13} />
          <span>{showForm ? 'Cancel' : 'Schedule Follow-Up'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateFollowUp} className="p-4 rounded-2xl bg-[#f0f8f5] border border-[#cfe3dc] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#20433e] block mb-1">Assign To</label>
              <input
                type="text"
                value={newFollowUp.assignedTo}
                onChange={e => setNewFollowUp(p => ({ ...p, assignedTo: e.target.value }))}
                placeholder="Officer or counsellor name"
                className="w-full p-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#20433e] block mb-1">Type</label>
              <select
                value={newFollowUp.followUpType}
                onChange={e => setNewFollowUp(p => ({ ...p, followUpType: e.target.value }))}
                className="w-full p-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
              >
                <option value="check_in">Welfare Check-In</option>
                <option value="medical">Medical Follow-Up</option>
                <option value="legal">Legal Aid Follow-Up</option>
                <option value="welfare">Welfare Visit</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#20433e] block mb-1">Date</label>
              <input
                type="date"
                value={newFollowUp.scheduledDate}
                onChange={e => setNewFollowUp(p => ({ ...p, scheduledDate: e.target.value }))}
                className="w-full p-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#20433e] block mb-1">Time</label>
              <input
                type="time"
                value={newFollowUp.scheduledTime}
                onChange={e => setNewFollowUp(p => ({ ...p, scheduledTime: e.target.value }))}
                className="w-full p-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#20433e] block mb-1">Notes</label>
            <textarea
              value={newFollowUp.notes}
              onChange={e => setNewFollowUp(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes for this follow-up..."
              className="w-full p-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white min-h-[50px]"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition">
              Create Follow-Up
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-[#718b85] italic text-center py-6">Loading follow-ups...</p>
      ) : followUps.length === 0 ? (
        <div className="text-center py-8">
          <Calendar size={32} className="mx-auto mb-2 text-[#a2beb7]" />
          <p className="text-xs text-[#718b85]">No follow-ups scheduled yet.</p>
          <p className="text-[11px] text-[#a2beb7] mt-1">Click &quot;Schedule Follow-Up&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {followUps.map(fup => (
            <div key={fup.id} className="p-3.5 rounded-2xl bg-white border border-[#e4ede9] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1f423d]">{typeLabels[fup.followUpType] || fup.followUpType}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[fup.status] || statusColors.pending}`}>
                    {fup.status.charAt(0).toUpperCase() + fup.status.slice(1)}
                  </span>
                </div>
                <span className="text-[11px] text-[#718b85]">Assigned to: {fup.assignedTo}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[#557b72]">
                  <Calendar size={12} />
                  <span>Scheduled: {new Date(fup.scheduledAt).toLocaleString()}</span>
                  {fup.completedAt && (
                    <span className="text-[#059669]">| Completed: {new Date(fup.completedAt).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {fup.status === 'pending' && (
                    <button onClick={() => handleStatusChange(fup.id, 'in_progress')} className="px-2 py-1 rounded-lg bg-[#eff6ff] text-[#1d4ed8] text-[10px] font-bold hover:bg-[#dbeafe] transition">Start</button>
                  )}
                  {(fup.status === 'pending' || fup.status === 'in_progress') && (
                    <button onClick={() => handleStatusChange(fup.id, 'completed')} className="px-2 py-1 rounded-lg bg-[#ecfdf5] text-[#065f46] text-[10px] font-bold hover:bg-[#d1fae5] transition">Complete</button>
                  )}
                  {fup.status !== 'completed' && fup.status !== 'cancelled' && (
                    <button onClick={() => handleStatusChange(fup.id, 'cancelled')} className="px-2 py-1 rounded-lg bg-[#f3f4f6] text-[#6b7280] text-[10px] font-bold hover:bg-[#e5e7eb] transition">Cancel</button>
                  )}
                </div>
              </div>
              {fup.notes && (
                <p className="text-[11px] text-[#557b72] italic bg-[#f8fbfa] p-2 rounded-xl border border-[#e4eee9]">{fup.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Threat / Fear / Trauma / Vulnerability Overview (Radar + Bars) ────────
function TraumaThreatOverview({ caseRecord }: { caseRecord: CaseRecord }) {
  const { stress_assessment } = caseRecord
  const ind = stress_assessment.indicators

  // Compute the 4 key indicator values (0-100)
  const threatPct = Math.round((ind?.threat ?? (stress_assessment.intimidation_flag ? 0.85 : 0.35)) * 100)
  const fearPct = stress_assessment.fear_score || 35
  const traumaPct = stress_assessment.trauma_score || 40
  const vulnerabilityPct = Math.round((ind?.vulnerability ?? (stress_assessment.depression_indicator ? 0.8 : 0.35)) * 100)

  const dimensions = [
    { label: 'Threat', value: threatPct, color: '#ef4444' },
    { label: 'Fear', value: fearPct, color: '#f97316' },
    { label: 'Trauma', value: traumaPct, color: '#0ea5e9' },
    { label: 'Vulnerability', value: vulnerabilityPct, color: '#8b5cf6' },
  ]

  const maxSeverity = Math.max(threatPct, fearPct, traumaPct, vulnerabilityPct)
  const severityLabel = maxSeverity >= 75 ? 'Critical' : maxSeverity >= 50 ? 'High' : maxSeverity >= 25 ? 'Moderate' : 'Low'

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#fef2f2] via-white to-[#f5f3ff] border border-[#e5e0e8] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1f2937]">Trauma & Threat Profile</h3>
            <p className="text-[11px] text-[#6b7280]">Core violence, fear, trauma & vulnerability assessment</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
          severityLabel === 'Critical' ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]' :
          severityLabel === 'High' ? 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]' :
          severityLabel === 'Moderate' ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]' :
          'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
        }`}>{severityLabel} Severity</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
        {/* Mini 4-Dimension Radar */}
        <div className="flex flex-col items-center">
          <svg width="180" height="180" viewBox="0 0 180 180" className="select-none">
            {/* Background grid rings */}
            {[0.25, 0.5, 0.75, 1].map((lvl, li) => {
              const pts = dimensions.map((_, i) => {
                const angle = (i * 90 - 90) * (Math.PI / 180)
                const r = lvl * 72
                return `${90 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`
              }).join(' ')
              return (
                <polygon key={li} points={pts} fill="none" stroke="#fca5a5" strokeWidth="0.5" opacity={0.3} />
              )
            })}
            {/* Spoke axis lines */}
            {dimensions.map((_, i) => {
              const angle = (i * 90 - 90) * (Math.PI / 180)
              return (
                <line key={i} x1="90" y1="90"
                  x2={90 + 72 * Math.cos(angle)} y2={90 + 72 * Math.sin(angle)}
                  stroke="#fecaca" strokeWidth="0.5" strokeDasharray="2,2" />
              )
            })}
            {/* Filled radar polygon */}
            <polygon
              points={dimensions.map((d, i) => {
                const angle = (i * 90 - 90) * (Math.PI / 180)
                const r = Math.max(4, Math.min(100, d.value)) / 100 * 72
                return `${90 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`
              }).join(' ')}
              fill="rgba(220, 38, 38, 0.15)" stroke="#ef4444" strokeWidth="2"
            />
            {/* Vertex dots + labels */}
            {dimensions.map((d, i) => {
              const angle = (i * 90 - 90) * (Math.PI / 180)
              const r = Math.max(4, Math.min(100, d.value)) / 100 * 72
              const vx = 90 + r * Math.cos(angle)
              const vy = 90 + r * Math.sin(angle)
              const lx = 90 + 82 * Math.cos(angle)
              const ly = 90 + 82 * Math.sin(angle)
              return (
                <g key={i}>
                  <circle cx={vx} cy={vy} r="4" fill={d.color} stroke="white" strokeWidth="1.5" />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                    fontSize="9" fontWeight="700" fill="#374151" className="select-none">
                    {d.label}
                  </text>
                  <text x={lx} y={ly + 11} textAnchor="middle" dominantBaseline="central"
                    fontSize="9" fontWeight="bold" fill={d.color} className="select-none font-mono">
                    {d.value}%
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Focused Bar Charts */}
        <div className="space-y-3">
          {dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="w-[90px] text-xs font-bold text-[#374151] shrink-0">{d.label}</span>
              <div className="flex-1 bg-gray-100 h-4 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${d.value}%`, backgroundColor: d.color }}
                />
              </div>
              <span className="text-xs font-mono font-bold w-10 text-right" style={{ color: d.color }}>
                {d.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Visual 10-Indicator Matrix Sub-Component ────────────────────────────────
function VisualIndicatorMatrix({ 
  caseRecord 
}: { 
  caseRecord: CaseRecord 
}) {
  const { stress_assessment, voice_analysis } = caseRecord
  const ind = stress_assessment.indicators || {
    stress: 0.45,
    fear: (stress_assessment.fear_score || 35) / 100,
    anxiety: (stress_assessment.anxiety_score || 30) / 100,
    distress: 0.55,
    trauma: (stress_assessment.trauma_score || 40) / 100,
    threat: stress_assessment.intimidation_flag ? 0.85 : 0.35,
    violence: stress_assessment.intimidation_flag ? 0.75 : 0.25,
    immediate_danger: stress_assessment.safety_escalation_applied ? 0.9 : 0.3,
    isolation: stress_assessment.social_isolation_flag ? 0.85 : 0.3,
    vulnerability: stress_assessment.depression_indicator ? 0.8 : 0.35
  }

  const indicatorsList = [
    { key: 'threat', label: 'Threat to Life / Family', val: Math.round((ind.threat || 0) * 100), color: 'from-[#ef4444] to-[#f87171]', badge: 'Critical Risk' },
    { key: 'immediate_danger', label: 'Active Danger / Imminent Harm', val: Math.round((ind.immediate_danger || 0) * 100), color: 'from-[#dc2626] to-[#ef4444]', badge: 'Urgent Intervention' },
    { key: 'violence', label: 'Physical Violence & Assault', val: Math.round((ind.violence || 0) * 100), color: 'from-[#b91c1c] to-[#f87171]', badge: 'PoA Act Section 3' },
    { key: 'fear', label: 'Fear & Intimidation State', val: Math.round((ind.fear || (stress_assessment.fear_score / 100)) * 100), color: 'from-[#f97316] to-[#fb923c]', badge: 'Psychological Trauma' },
    { key: 'trauma', label: 'Acute Trauma & Shock Response', val: Math.round((ind.trauma || (stress_assessment.trauma_score / 100)) * 100), color: 'from-[#0284c7] to-[#38bdf8]', badge: 'Clinical Triage' },
    { key: 'anxiety', label: 'Anxiety, Panic & Tremor', val: Math.round((ind.anxiety || (stress_assessment.anxiety_score / 100)) * 100), color: 'from-[#eab308] to-[#fde047]', badge: 'Somatic Symptom' },
    { key: 'isolation', label: 'Social Boycott & Resource Ban', val: Math.round((ind.isolation || 0) * 100), color: 'from-[#8b5cf6] to-[#c084fc]', badge: 'PoA Section 3(1)(za)' },
    { key: 'distress', label: 'Emotional & Mental Distress', val: Math.round((ind.distress || 0) * 100), color: 'from-[#0d9488] to-[#2dd4bf]', badge: 'Counseling Need' },
    { key: 'vulnerability', label: 'Depression / Hopelessness Index', val: Math.round((ind.vulnerability || 0) * 100), color: 'from-[#6366f1] to-[#818cf8]', badge: 'High Vulnerability' },
    { key: 'acoustic', label: 'Acoustic Voice Strain & Jitter', val: voice_analysis?.acoustic_distress_score || (stress_assessment.speech_stress_detected ? 75 : 25), color: 'from-[#10b981] to-[#34d399]', badge: 'Biomarker Analysis' }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider">Granular NLP Distress &amp; Threat Matrix</p>
          <p className="text-[11px] text-[#718b85] mt-0.5">Evaluation across 10 specialized SC/ST grievance &amp; psychological indicators</p>
        </div>
        <span className="text-xs font-bold text-[#1d8272] bg-[#f0f8f5] px-3 py-1 rounded-xl border border-[#cfe3dc]">
          All Indicators Synchronized
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {indicatorsList.map((item) => (
          <div key={item.key} className="p-3.5 rounded-2xl bg-white border border-[#e2eee9] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1f423d]">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[#5a7c74] bg-[#f2f7f5] px-2 py-0.5 rounded-md">
                  {item.badge}
                </span>
                <span className="font-mono font-bold text-xs text-[#1d8272]">{item.val}%</span>
              </div>
            </div>
            <div className="w-full bg-[#eef5f2] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                style={{ width: `${item.val}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Key Trauma Indicator Bars Sub-Component ───────────────────────────────
function KeyIndicatorBars({ caseRecord }: { caseRecord: CaseRecord }) {
  const { stress_assessment } = caseRecord

  const indicators = [
    {
      label: 'Threat to Life / Family',
      sublabel: stress_assessment.intimidation_flag ? 'Active intimidation detected' : 'No active threat',
      value: Math.round((stress_assessment.indicators?.threat ?? (stress_assessment.intimidation_flag ? 0.85 : 0.35)) * 100),
      color: 'from-[#dc2626] to-[#f87171]',
      trackBg: 'bg-red-50',
      textColor: 'text-[#991b1b]',
      icon: <AlertTriangle size={15} className="text-[#dc2626]" />,
      severity: 'Critical'
    },
    {
      label: 'Fear & Intimidation',
      sublabel: stress_assessment.fear_score >= 50 ? 'Severe fear response' : 'Elevated anxiety',
      value: stress_assessment.fear_score || 35,
      color: 'from-[#ea580c] to-[#fb923c]',
      trackBg: 'bg-orange-50',
      textColor: 'text-[#9a3412]',
      icon: <Zap size={15} className="text-[#ea580c]" />,
      severity: stress_assessment.fear_score >= 50 ? 'High' : 'Moderate'
    },
    {
      label: 'Acute Trauma & Shock',
      sublabel: stress_assessment.trauma_score >= 50 ? 'Clinical trauma threshold exceeded' : 'Subclinical trauma markers',
      value: stress_assessment.trauma_score || 40,
      color: 'from-[#0369a1] to-[#38bdf8]',
      trackBg: 'bg-sky-50',
      textColor: 'text-[#0c4a6e]',
      icon: <Brain size={15} className="text-[#0369a1]" />,
      severity: stress_assessment.trauma_score >= 50 ? 'High' : 'Moderate'
    },
    {
      label: 'Depression & Vulnerability',
      sublabel: stress_assessment.depression_indicator ? 'Severe helplessness index' : 'Baseline vulnerability',
      value: Math.round(((stress_assessment.indicators?.vulnerability ?? (stress_assessment.depression_indicator ? 0.8 : 0.35))) * 100),
      color: 'from-[#7c3aed] to-[#a78bfa]',
      trackBg: 'bg-violet-50',
      textColor: 'text-[#4c1d95]',
      icon: <Heart size={15} className="text-[#7c3aed]" />,
      severity: stress_assessment.depression_indicator ? 'High' : 'Moderate'
    }
  ]

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-[#fef2f2] via-white to-[#f5f3ff] border border-[#e5e0e8] shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1f2937]">Critical Trauma &amp; Threat Indicators</h3>
            <p className="text-[11px] text-[#6b7280]">Core violence, fear, trauma &amp; vulnerability assessment vectors</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
          {stress_assessment.risk_level} Risk
        </span>
      </div>

      <div className="space-y-3">
        {indicators.map((ind, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-white border border-[#e5e0e8] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {ind.icon}
                <div>
                  <span className="text-xs font-bold text-[#1f2937]">{ind.label}</span>
                  <p className="text-[10px] text-[#6b7280]">{ind.sublabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                  ind.severity === 'Critical' ? 'bg-[#fef2f2] text-[#dc2626]' :
                  ind.severity === 'High' ? 'bg-[#fff7ed] text-[#ea580c]' :
                  'bg-[#eff6ff] text-[#2563eb]'
                }`}> 
                  {ind.severity}
                </span>
                <span className={`font-mono text-sm font-bold ${ind.textColor}`}>{ind.value}%</span>
              </div>
            </div>
            <div className={`w-full ${ind.trackBg} h-3 rounded-full overflow-hidden`}> 
              <div
                className={`h-full rounded-full bg-gradient-to-r ${ind.color} transition-all duration-700 ease-out`}
                style={{ width: `${ind.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const levelBadges: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', border: 'border-[#fecaca]' },
  High: { bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', border: 'border-[#fde68a]' },
  Moderate: { bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', border: 'border-[#bfdbfe]' },
  Low: { bg: 'bg-[#ecfdf5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]' }
}

export function CaseDetailModal({ caseRecord, isOpen, onClose, onUpdateCase, currentUserRole }: CaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'assessment' | 'radar' | 'voice' | 'actions' | 'notes' | 'timeline' | 'followup'>('assessment')
  const [newNote, setNewNote] = useState('')
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null)
  const [dbNotes, setDbNotes] = useState<Array<{ id: string; author: string; role: string; text: string; timestamp: string }>>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')
  const [showEscalateForm, setShowEscalateForm] = useState(false)
  const [escalating, setEscalating] = useState(false)

  // Load notes from Supabase when modal opens
  const loadNotes = useCallback(async () => {
    if (!caseRecord) return
    setNotesLoading(true)
    try {
      const notes = await CaseService.fetchNotes(caseRecord.id)
      setDbNotes(notes)
    } catch (err) {
      console.warn('Failed to load notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }, [caseRecord])

  useEffect(() => {
    if (isOpen && caseRecord) {
      loadNotes()
    }
  }, [isOpen, caseRecord, loadNotes])

  if (!isOpen || !caseRecord) return null

  const { stress_assessment, voice_analysis } = caseRecord

  // Calculate radar dimensions for dynamic visualization
  const radarDimensions: RadarDimension[] = [
    {
      label: 'Threat & Violence',
      value: Math.round((stress_assessment.indicators?.threat ?? (stress_assessment.intimidation_flag ? 0.85 : 0.35)) * 100),
      color: '#f87171'
    },
    {
      label: 'Fear / Panic',
      value: stress_assessment.fear_score || 35,
      color: '#fb923c'
    },
    {
      label: 'Acute Trauma',
      value: stress_assessment.trauma_score || 40,
      color: '#38bdf8'
    },
    {
      label: 'Anxiety Level',
      value: stress_assessment.anxiety_score || 30,
      color: '#facc15'
    },
    {
      label: 'Social Isolation',
      value: Math.round(((stress_assessment.indicators?.isolation ?? 0.35) * 100)) || (stress_assessment.social_isolation_flag ? 80 : 30),
      color: '#a78bfa'
    },
    {
      label: 'Acoustic Distress',
      value: voice_analysis?.acoustic_distress_score || (stress_assessment.speech_stress_detected ? 75 : 25),
      color: '#4ade80'
    }
  ]

  // Handle 1-Click Action Dispatch
  const handleDispatchAction = async (actionType: 'Police Protection' | 'Legal Aid (NALSA)' | 'Mental Health Counsellor' | 'Medical Hospitalization' | 'Witness Protection' | 'District Collector Notice') => {
    const referenceId = `${actionType.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`
    const newDispatch = {
      id: `DA-${Date.now().toString().slice(-4)}`,
      action_type: actionType,
      status: 'Dispatched' as const,
      dispatched_at: 'Just now',
      reference_id: referenceId
    }

    const updatedNotes = [
      ...caseRecord.notes,
      {
        id: `N-${Date.now()}`,
        author: 'NHAA Cadre Officer',
        role: 'Authorized Action',
        timestamp: 'Just now',
        text: `Action Dispatched: ${actionType} (Ref: ${newDispatch.reference_id})`
      }
    ]

    const updatedCase: CaseRecord = {
      ...caseRecord,
      status: 'Action Dispatched',
      dispatched_actions: [...caseRecord.dispatched_actions, newDispatch],
      notes: updatedNotes
    }

    onUpdateCase(updatedCase)
    setDispatchSuccess(`Successfully dispatched ${actionType}. Reference: ${newDispatch.reference_id}`)
    setTimeout(() => setDispatchSuccess(null), 4000)

    // Persist to Supabase & Activity Log
    await CaseService.dispatchAction({
      caseId: caseRecord.id,
      actionType,
      referenceId,
      officerName: 'Cadre Officer'
    })
  }

  // Handle Mark as Reviewed
  const handleMarkReviewed = async () => {
    const ok = await CaseService.markCaseReviewed(caseRecord.id, 'Cadre Officer')
    if (ok) {
      onUpdateCase({ ...caseRecord, status: 'Reviewed' })
      setDispatchSuccess('Case marked as Reviewed.')
      setTimeout(() => setDispatchSuccess(null), 3000)
    }
  }

  // Handle Escalate Case
  const handleEscalate = async () => {
    if (!escalateReason.trim()) return
    setEscalating(true)
    const ok = await CaseService.escalateCase(caseRecord.id, 'Officer', escalateReason.trim())
    if (ok) {
      onUpdateCase({ ...caseRecord, status: 'Escalated', priority_tier: 1 })
      setEscalateReason('')
      setShowEscalateForm(false)
      setDispatchSuccess('Case escalated to senior officials with highest priority.')
      setTimeout(() => setDispatchSuccess(null), 4000)
    }
    setEscalating(false)
  }

  // Handle Adding Case Note (persisted to Supabase)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const noteText = newNote.trim()
    const noteAuthor = 'Officer / Psychiatrist'
    const noteRole = 'Authorized Action'

    const tempNote = {
      id: `N-${Date.now()}`,
      author: noteAuthor,
      role: noteRole,
      text: noteText,
      timestamp: 'Just now'
    }
    setDbNotes(prev => [...prev, tempNote])
    setNewNote('')

    const result = await CaseService.addNote({
      caseId: caseRecord.id,
      author: noteAuthor,
      role: noteRole,
      text: noteText
    })

    if (result) {
      setDbNotes(prev => prev.map(n => n.id === tempNote.id ? { ...n, id: result.id } : n))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-[#173f39] text-white flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-lg text-[#9ee7d8]">
              {caseRecord.initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold">{caseRecord.victim_name}</h2>
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-md text-white/90">
                  {caseRecord.id}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${levelBadges[stress_assessment.risk_level].bg} ${levelBadges[stress_assessment.risk_level].text} ${levelBadges[stress_assessment.risk_level].border}`}>
                  {stress_assessment.risk_level} Risk (SVI: {stress_assessment.svi_score}/100)
                </span>
              </div>
              <p className="text-xs text-[#a2dcd0] mt-1 flex items-center gap-2">
                <span>{caseRecord.incident_category}</span>
                <span>·</span>
                <MapPin size={13} className="inline" />
                <span>{caseRecord.incident_location.village_town_city}, {caseRecord.incident_location.district} ({caseRecord.incident_location.state})</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#a4d7cb] hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        {/* Tab Switcher - 7 Tabs */}
        <div className="grid grid-cols-7 p-1.5 bg-[#f0f6f3] border-b border-[#e1ece8] text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'assessment' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Brain size={13} />
            <span>SVI &amp; Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'radar' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Activity size={13} />
            <span>Visual Radar</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'voice' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Mic size={13} />
            <span>Voice &amp; Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'actions' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Dispatches</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'notes' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <MessageSquare size={13} />
            <span>Notes ({dbNotes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'timeline' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <History size={13} />
            <span>Timeline</span>
          </button>
          <button
            onClick={() => setActiveTab('followup')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition ${
              activeTab === 'followup' ? 'bg-white text-[#1d8272] shadow-xs font-bold' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Calendar size={13} />
            <span>Follow-Up</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {dispatchSuccess && (
            <div className="p-3.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl text-xs text-[#065f46] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#059669]" />
              <span>{dispatchSuccess}</span>
            </div>
          )}

          {/* TAB 1: SVI & TRAUMA PROFILE + EXPLAINABLE AI */}
          {activeTab === 'assessment' && (
            <div className="space-y-6">
              {/* SVI Gauge & Sub-scores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#173f39] to-[#20584f] text-white flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-[#a2dcd0] font-medium">Stress Vulnerability Index</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-bold">{stress_assessment.svi_score}</span>
                      <span className="text-sm text-[#a2dcd0]">/ 100</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-white/20 text-white w-fit mt-3">
                    {stress_assessment.risk_level} Priority
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#e0ece8]">
                  <p className="text-xs text-[#718b85]">Acute Trauma Score</p>
                  <p className="text-2xl font-bold text-[#1f423d] mt-2">{stress_assessment.trauma_score}%</p>
                  <div className="w-full bg-[#eef4f1] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#1e8574] h-full rounded-full" style={{ width: `${stress_assessment.trauma_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#e0ece8]">
                  <p className="text-xs text-[#718b85]">Fear &amp; Intimidation</p>
                  <p className="text-2xl font-bold text-[#1f423d] mt-2">{stress_assessment.fear_score}%</p>
                  <div className="w-full bg-[#eef4f1] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#ca6258] h-full rounded-full" style={{ width: `${stress_assessment.fear_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#e0ece8]">
                  <p className="text-xs text-[#718b85]">Anxiety &amp; Panic Level</p>
                  <p className="text-2xl font-bold text-[#1f423d] mt-2">{stress_assessment.anxiety_score}%</p>
                  <div className="w-full bg-[#eef4f1] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#d98b48] h-full rounded-full" style={{ width: `${stress_assessment.anxiety_score}%` }} />
                  </div>
                </div>
              </div>

              {/* NHAA Situation & Safety Escalation Highlights */}
              <div className="p-4 rounded-2xl bg-white border border-[#e0ece8] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#718b85] uppercase">Primary Situation:</span>
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#1d8272]/10 text-[#1d8272] border border-[#1d8272]/20">
                      {stress_assessment.situation || 'DISCRIMINATION & ATROCITY'}
                    </span>
                    {stress_assessment.situation_confidence && (
                      <span className="text-[11px] text-[#718b85]">
                        ({Math.round(stress_assessment.situation_confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                  {stress_assessment.detected_language && (
                    <span className="text-[11px] font-medium text-[#41605a] bg-[#f0f6f4] px-2.5 py-0.5 rounded-lg">
                      Language: {stress_assessment.detected_language} {stress_assessment.romanized ? '(Transliterated)' : ''}
                    </span>
                  )}
                </div>

                {stress_assessment.safety_escalation_applied && (
                  <div className="p-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-xl flex items-center gap-2 text-xs font-semibold text-[#dc2626]">
                    <AlertTriangle size={15} />
                    <span>Immediate Safety Escalation Rule Triggered (High Threat / Active Danger)</span>
                  </div>
                )}
              </div>

              {/* Critical Flags */}
              <div>
                <p className="text-xs font-bold text-[#20433e] mb-2 uppercase tracking-wider">Clinical &amp; Vulnerability Indicators</p>
                <div className="flex flex-wrap gap-2">
                  {stress_assessment.intimidation_flag && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#fff2f0] border border-[#fecaca] text-[#b91c1c]">
                      <AlertTriangle size={14} /> Active Threat / Intimidation Detected
                    </span>
                  )}
                  {stress_assessment.social_isolation_flag && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#fff7ed] border border-[#ffedd5] text-[#c2410c]">
                      Social Boycott / Resource Ostracization
                    </span>
                  )}
                  {stress_assessment.depression_indicator && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#eff6ff] border border-[#dbeafe] text-[#1d4ed8]">
                      Depression / Severe Helplessness Marker
                    </span>
                  )}
                  {stress_assessment.speech_stress_detected && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#f5f3ff] border border-[#ede9fe] text-[#6d28d9]">
                      Acoustic Tremor &amp; Choked Speech
                    </span>
                  )}
                </div>
              </div>

              {/* ── Threat / Fear / Trauma / Vulnerability Overview ── */}
              <TraumaThreatOverview caseRecord={caseRecord} />

              {/* Key Trauma & Threat Indicator Bar Charts */}
              <KeyIndicatorBars caseRecord={caseRecord} />

              {/* Complainant Narrative */}
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-[#e2ede9]">
                <p className="text-xs font-bold text-[#20433e] mb-2">Complainant Narrative &amp; Statements</p>
                <p className="text-xs leading-relaxed text-[#41605a] italic bg-white p-3 rounded-xl border border-[#e5eeea]">
                  &quot;{caseRecord.narrative_text}&quot;
                </p>
                {stress_assessment.key_trauma_triggers.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-[#6f8b85]">Detected NLP Triggers:</span>
                    {stress_assessment.key_trauma_triggers.map((trigger, i) => (
                      <span key={i} className="text-[10px] font-mono bg-[#eef7f4] text-[#1d8272] border border-[#cfe8df] px-2 py-0.5 rounded-md">
                        {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explainable AI: Why This Risk? Section */}
              <ExplainableAiSection caseRecord={caseRecord} />

              {/* Recommended Action Plan */}
              <div>
                <p className="text-xs font-bold text-[#20433e] mb-2 uppercase tracking-wider">AI Generated Redressal Recommendations</p>
                <div className="space-y-2">
                  {stress_assessment.recommended_actions.map((rec, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-[#e0ece8] text-xs text-[#2b4c46]">
                      <CheckCircle2 size={16} className="text-[#1d8272] shrink-0" />
                      <span className="font-medium">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL RADAR & 10-INDICATOR MATRIX */}
          {activeTab === 'radar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <SviRadarChart dimensions={radarDimensions} />
                
                <div className="space-y-3.5 p-5 rounded-3xl bg-[#f8fbfa] border border-[#d8ebe4]">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#1d8272]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e443e]">Multi-Axis SVI Profile</h3>
                  </div>
                  <p className="text-xs text-[#52756d] leading-relaxed">
                    The radar coordinates map 6 independent clinical and physical safety dimensions. Values above 60% indicate critical priority under the SC/ST Prevention of Atrocities framework.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-[#e2efe9]">
                    {radarDimensions.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-[#e4eee9]">
                        <span className="font-semibold text-[#1f423d]">{d.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#eef4f1] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${d.value}%`, backgroundColor: d.color }} />
                          </div>
                          <span className="font-mono font-bold text-[11px]" style={{ color: d.color }}>{d.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 10-Indicator Granular Breakdown */}
              <VisualIndicatorMatrix caseRecord={caseRecord} />
            </div>
          )}

          {/* TAB 3: VOICE & ACOUSTICS */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              {voice_analysis ? (
                <>
                  <div className="p-4 rounded-2xl bg-[#173f39] text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#9ee7d8]">
                        <Mic size={15} />
                        <span>Voice Recording Sample ({voice_analysis.duration_seconds}s)</span>
                      </div>
                      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded text-white/90">
                        Language: {voice_analysis.language}
                      </span>
                    </div>
                    {/* Simulated Waveform Bar */}
                    <div className="h-14 bg-[#122f2b] rounded-xl flex items-center justify-center px-4 gap-1 overflow-hidden">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-[#1e8574] rounded-full transition-all"
                          style={{
                            height: `${Math.min(100, Math.max(15, Math.sin(i * 0.4) * 40 + Math.random() * 30 + 30))}%`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-white border border-[#e0ece8]">
                      <p className="text-[11px] text-[#718c85]">Speech Rate</p>
                      <p className="text-lg font-bold text-[#1f423d] mt-1">{voice_analysis.speech_rate_wpm} WPM</p>
                      <p className="text-[10px] text-[#ca6258] mt-0.5">Distressed (&lt;95 WPM)</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e0ece8]">
                      <p className="text-[11px] text-[#718c85]">Average Pitch</p>
                      <p className="text-lg font-bold text-[#1f423d] mt-1">{voice_analysis.average_pitch_hz} Hz</p>
                      <p className="text-[10px] text-[#718c85] mt-0.5">Elevated fundamental</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e0ece8]">
                      <p className="text-[11px] text-[#718c85]">Pitch Jitter / Tremor</p>
                      <p className="text-lg font-bold text-[#1f423d] mt-1">{voice_analysis.pitch_variation_hz} Hz</p>
                      <p className="text-[10px] text-[#ca6258] mt-0.5">High micro-vibration</p>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#e0ece8]">
                      <p className="text-[11px] text-[#718c85]">Acoustic Distress</p>
                      <p className="text-lg font-bold text-[#1f423d] mt-1">{voice_analysis.acoustic_distress_score}%</p>
                      <p className="text-[10px] text-[#1d8272] mt-0.5">Confidence 94.2%</p>
                    </div>
                  </div>

                  {voice_analysis.mfcc_indicators && (
                    <div className="p-4 rounded-2xl bg-[#f6faf8] border border-[#e0ece8]">
                      <p className="text-xs font-semibold text-[#20433e] mb-2">MFCC &amp; Formant Biomarkers</p>
                      <div className="flex flex-wrap gap-2">
                        {voice_analysis.mfcc_indicators.map((ind, i) => (
                          <span key={i} className="text-xs bg-white border border-[#d6e5df] text-[#2c534d] px-2.5 py-1 rounded-lg">
                            {ind.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-xs text-[#718b85]">
                  <Mic size={32} className="mx-auto mb-2 text-[#a2beb7]" />
                  <p>No direct voice sample recorded for this intake. Narrative text assessment applied.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DISPATCH & PROTECTION */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider mb-3">1-Click Emergency &amp; Support Dispatches</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDispatchAction('Police Protection')}
                    className="p-4 rounded-2xl border border-[#e4ded9] bg-white hover:border-[#1d8272] text-left transition shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-[#fff2f0] text-[#c94b48] flex items-center justify-center">
                        <ShieldCheck size={18} />
                      </div>
                      <ArrowUpRight size={16} className="text-[#a0b2ad] group-hover:text-[#1d8272]" />
                    </div>
                    <p className="text-xs font-bold text-[#1f423d] mt-2.5">Dispatch Local Police Protection</p>
                    <p className="text-[11px] text-[#718c85] mt-0.5">Direct SHO notification under PoA Act rules</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispatchAction('Legal Aid (NALSA)')}
                    className="p-4 rounded-2xl border border-[#e4ded9] bg-white hover:border-[#1d8272] text-left transition shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-[#eef5ff] text-[#4f76bb] flex items-center justify-center">
                        <Scale size={18} />
                      </div>
                      <ArrowUpRight size={16} className="text-[#a0b2ad] group-hover:text-[#1d8272]" />
                    </div>
                    <p className="text-xs font-bold text-[#1f423d] mt-2.5">Assign Free NALSA Legal Counsel</p>
                    <p className="text-[11px] text-[#718c85] mt-0.5">Appoints designated SC/ST Special Court lawyer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispatchAction('Mental Health Counsellor')}
                    className="p-4 rounded-2xl border border-[#e4ded9] bg-white hover:border-[#1d8272] text-left transition shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-[#eaf6f2] text-[#1d8272] flex items-center justify-center">
                        <Brain size={18} />
                      </div>
                      <ArrowUpRight size={16} className="text-[#a0b2ad] group-hover:text-[#1d8272]" />
                    </div>
                    <p className="text-xs font-bold text-[#1f423d] mt-2.5">Schedule Trauma Tele-Counsellor</p>
                    <p className="text-[11px] text-[#718c85] mt-0.5">Clinical psychologist allocation within 30 min</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispatchAction('Witness Protection')}
                    className="p-4 rounded-2xl border border-[#e4ded9] bg-white hover:border-[#1d8272] text-left transition shadow-xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="size-9 rounded-xl bg-[#fff7ed] text-[#d97706] flex items-center justify-center">
                        <Building size={18} />
                      </div>
                      <ArrowUpRight size={16} className="text-[#a0b2ad] group-hover:text-[#1d8272]" />
                    </div>
                    <p className="text-xs font-bold text-[#1f423d] mt-2.5">Witness Protection Scheme Notice</p>
                    <p className="text-[11px] text-[#718c85] mt-0.5">Safe relocation and magistrate deposition cover</p>
                  </button>
                </div>
              </div>

              {/* Dispatched Actions History */}
              <div>
                <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider mb-2">Dispatched Actions Record</p>
                {caseRecord.dispatched_actions.length > 0 ? (
                  <div className="space-y-2">
                    {caseRecord.dispatched_actions.map((action) => (
                      <div key={action.id} className="p-3 rounded-xl bg-[#f8faf9] border border-[#e2ede9] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={16} className="text-[#1d8272]" />
                          <div>
                            <p className="font-semibold text-[#1f423d]">{action.action_type}</p>
                            <p className="text-[10px] text-[#718c85]">Ref: {action.reference_id} · {action.dispatched_at}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-[#e4f3ee] text-[#1d8272] px-2 py-0.5 rounded-full">
                          {action.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#718c85] italic">No official actions dispatched yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CASE NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type officer observation, clinical notes, or victim check-in update..."
                  className="w-full p-3.5 rounded-2xl border border-[#d6e3df] text-xs text-[#20433e] outline-none min-h-[70px] bg-[#fbfdfc] focus:border-[#1e8574]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1d8272] text-white text-xs font-semibold hover:bg-[#186f60] transition"
                  >
                    <Send size={13} />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2.5 pt-2">
                {notesLoading && (
                  <p className="text-xs text-[#718b85] italic text-center py-4">Loading notes from database...</p>
                )}
                {!notesLoading && dbNotes.length === 0 && (
                  <p className="text-xs text-[#718b85] italic text-center py-4">No notes added yet. Type below to add the first note.</p>
                )}
                {dbNotes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e4ede9] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1f423d]">{note.author} ({note.role})</span>
                      <span className="text-[#8ba29c]">{note.timestamp === 'Just now' ? 'Just now' : new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[#3b5b55] leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>

              {/* Review & Escalation Actions */}
              <div className="pt-4 border-t border-[#edf3f0] space-y-3">
                <p className="text-xs font-bold text-[#20433e] uppercase tracking-wider">Case Review &amp; Escalation</p>
                <div className="flex flex-wrap gap-2">
                  {caseRecord.status !== 'Reviewed' && caseRecord.status !== 'Resolved' && (
                    <button
                      onClick={handleMarkReviewed}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-xs font-semibold hover:bg-[#d1fae5] transition"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark as Reviewed</span>
                    </button>
                  )}
                  {caseRecord.status !== 'Resolved' && caseRecord.status !== 'Escalated' && (
                    <button
                      onClick={() => setShowEscalateForm(!showEscalateForm)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] text-xs font-semibold hover:bg-[#fee2e2] transition"
                    >
                      <AlertTriangle size={14} />
                      <span>Escalate to Senior Official</span>
                    </button>
                  )}
                  {caseRecord.status === 'Reviewed' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ecfdf5] text-[#065f46] text-xs font-semibold border border-[#a7f3d0]">
                      <CheckCircle2 size={13} /> Reviewed ✓
                    </span>
                  )}
                  {caseRecord.status === 'Escalated' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fef2f2] text-[#991b1b] text-xs font-semibold border border-[#fecaca]">
                      <AlertTriangle size={13} /> Escalated ⚠
                    </span>
                  )}
                </div>

                {showEscalateForm && (
                  <div className="p-4 rounded-2xl bg-[#fff5f5] border border-[#fecaca] space-y-3">
                    <p className="text-xs font-bold text-[#991b1b]">Escalation Reason</p>
                    <textarea
                      value={escalateReason}
                      onChange={e => setEscalateReason(e.target.value)}
                      placeholder="Describe why this case needs escalation (e.g., imminent danger, systemic failure, media attention)..."
                      className="w-full p-3 rounded-xl border border-[#fecaca] text-xs text-[#991b1b] outline-none bg-white min-h-[60px]"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-[#991b1b]/60">This will set priority to Tier 1 (Critical) and notify senior officials.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowEscalateForm(false); setEscalateReason('') }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6]"
                        >Cancel</button>
                        <button
                          onClick={handleEscalate}
                          disabled={escalating || !escalateReason.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#dc2626] text-white text-xs font-semibold hover:bg-[#b91c1c] transition disabled:opacity-50"
                        >
                          <AlertTriangle size={12} />
                          {escalating ? 'Escalating...' : 'Confirm Escalation'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: TIMELINE & AUDIT LOG */}
          {activeTab === 'timeline' && (
            <ActivityTimelineTabContent caseRecord={caseRecord} />
          )}

          {/* TAB 7: FOLLOW-UP TRACKING */}
          {activeTab === 'followup' && (
            <FollowUpTabContent caseRecord={caseRecord} />
          )}
        </div>
      </div>
    </div>
  )
}

