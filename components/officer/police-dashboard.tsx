'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert,
  Radio,
  MapPin,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Check,
  Building,
  Car,
  FileCheck,
  BadgeAlert,
  Sparkles,
  Calendar,
  Clock,
  UserCheck
} from 'lucide-react'
import { CaseRecord, OfficerProfile, RiskLevel } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'
import { CaseService } from '@/lib/services/case-service'
import { t } from '@/lib/i18n'

interface PoliceDashboardProps {
  cases: CaseRecord[]
  currentOfficer?: OfficerProfile | null
  currentLanguage?: string
  onSelectCase: (caseRecord: CaseRecord) => void
  onOpenCaseModal: (caseRecord: CaseRecord) => void
}

const priorityStyles: Record<string, string> = {
  Critical: 'bg-[#fff0ef] text-[#c94b48] border border-[#fca5a5]',
  High: 'bg-[#fff5e5] text-[#b87817] border border-[#fde68a]'
}

export function PoliceDashboard({
  cases,
  currentOfficer,
  currentLanguage = 'en',
  onSelectCase,
  onOpenCaseModal
}: PoliceDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([])
  const [followUpsList, setFollowUpsList] = useState<Array<{
    id: string
    caseId: string
    victimName?: string
    assignedTo: string
    assignedRole: string
    followUpType: string
    scheduledAt: string
    completedAt: string | null
    status: string
    notes: string | null
    district?: string
    state?: string
    contactNumber?: string
  }>>([])
  const [followUpsLoading, setFollowUpsLoading] = useState(false)

  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  // Escalated cases
  const escalatedCases = cases.filter(c => c.status === 'Escalated')

  // Load real follow-ups from DB
  const loadFollowUps = useCallback(async () => {
    setFollowUpsLoading(true)
    try {
      const data = await CaseService.fetchAllFollowUps()
      setFollowUpsList(data)
    } catch {
      setFollowUpsList([])
    } finally {
      setFollowUpsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  const handleUpdateFollowUp = async (id: string, status: string, caseId: string) => {
    const ok = await CaseService.updateFollowUpStatus(id, status, caseId)
    if (ok) {
      loadFollowUps()
    }
  }

  // ── Computed real-time stats ────────────────────────────────
  const totalCases = cases.length
  const highCases = cases.filter(c => c.stress_assessment.risk_level === 'High').length
  const criticalCases = cases.filter(c => c.stress_assessment.risk_level === 'Critical').length
  const reviewedCases = cases.filter(c => c.status === 'Reviewed' || c.status === 'Resolved').length
  const dispatchedCases = cases.filter(c => c.dispatched_actions && c.dispatched_actions.length > 0).length
  const zeroFirRate = totalCases > 0 ? Math.round((dispatchedCases / totalCases) * 100) : 0
  const pendingFollowUps = followUpsList.filter(f => f.status === 'pending' || f.status === 'in_progress')

  // Proximity & Severity filtering:
  // Shows high/critical cases routed to this officer or in this officer's district / state
  const officerDistrict = (currentOfficer?.assigned_district || '').toLowerCase()
  const officerState = (currentOfficer?.assigned_state || '').toLowerCase()

  const policeCases = cases.filter(c => {
    const isHighOrCritical = c.stress_assessment.risk_level === 'High' || c.stress_assessment.risk_level === 'Critical'
    
    // Proximity check
    const isAssigned = c.assigned_officer_id === currentOfficer?.id ||
      (currentOfficer?.full_name && c.assigned_officer?.toLowerCase().includes(currentOfficer.full_name.toLowerCase()))
    const isLocalDistrict = officerDistrict && c.incident_location.district.toLowerCase().includes(officerDistrict)
    const isLocalState = officerState && c.incident_location.state.toLowerCase().includes(officerState)

    const matchesProximity = !currentOfficer || isAssigned || isLocalDistrict || isLocalState || currentOfficer.role === 'admin'

    const matchesSearch = !searchTerm ||
      c.victim_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.incident_location.district.toLowerCase().includes(searchTerm.toLowerCase())

    return isHighOrCritical && matchesProximity && matchesSearch
  })

  const handleDispatchEscort = (caseId: string) => {
    setDispatchedIds(prev => [...prev, caseId])
  }

  const handleCallComplainant = (caseItem: CaseRecord) => {
    setTeleRecipient({
      name: caseItem.victim_name,
      role: `Complainant · Priority Case ${caseItem.id}`,
      phone: caseItem.contact_number || '+91 98765 43210'
    })
    setTeleModalOpen(true)
  }

  const handleCallFollowUpVictim = (fup: typeof followUpsList[0]) => {
    setTeleRecipient({
      name: fup.victimName || 'Complainant',
      role: `Follow-Up Visit · Case ${fup.caseId}`,
      phone: fup.contactNumber || '+91 98765 43210'
    })
    setTeleModalOpen(true)
  }

  const followUpTypeLabels: Record<string, string> = {
    check_in: 'Welfare Check-In',
    medical: 'Medical Follow-Up',
    legal: 'Legal Aid Follow-Up',
    welfare: 'Welfare Visit'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Officer Station & Jurisdiction Banner */}
      {currentOfficer && (
        <div className="rounded-3xl border border-[#c7d2fe] bg-gradient-to-r from-[#eef2ff] via-white to-[#f5f3ff] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#4338ca] text-white shadow-md">
              <BadgeAlert size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1e1b4b]">
                  {currentOfficer.full_name}
                </h2>
                <span className="font-mono text-[10px] font-extrabold bg-white border border-[#c7d2fe] text-[#4338ca] px-2 py-0.5 rounded-md">
                  {currentOfficer.officer_badge_id}
                </span>
              </div>
              <p className="text-xs text-[#4f46e5] mt-0.5 flex items-center gap-1 font-medium">
                <MapPin size={13} />
                <span>{t('pd_station_label', currentLanguage)} {currentOfficer.station_name || currentOfficer.assigned_district} &bull; {currentOfficer.assigned_district}, {currentOfficer.assigned_state}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-[#c7d2fe] px-4 py-2 text-xs font-bold text-[#4338ca] shadow-xs">
            <Radio size={14} className="animate-pulse text-[#ef4444]" />
            <span>{t('pd_proximity_radar', currentLanguage)} &bull; {policeCases.length} {t('pd_priority_queue', currentLanguage)}</span>
          </div>
        </div>
      )}

      {/* Police KPI Banner — all values computed from real case data */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-[#fca5a5] bg-[#fffbfb] p-4 shadow-xs">
          <p className="text-xs text-[#991b1b] font-semibold">{t('high_svi_alert', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#991b1b]">{policeCases.length}</p>
          <p className="mt-1 text-[11px] text-[#dc2626] font-semibold">{t('pd_priority_tier', currentLanguage)}</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">{t('pd_total_cases', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">{totalCases}</p>
          <p className="mt-1 text-[11px] text-[#1d8272] font-semibold">{t('pd_across', currentLanguage)} {currentOfficer?.assigned_district || 'District'}</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">{t('pd_zero_fir', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">{zeroFirRate}%</p>
          <p className="mt-1 text-[11px] text-[#1d8272] font-semibold">{t('pd_sco_sta', currentLanguage)}</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">{t('pd_dispatched_escorts', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">{dispatchedCases}</p>
          <p className="mt-1 text-[11px] text-[#698881]">{t('pd_active_field', currentLanguage)}</p>
        </div>

        <div className="rounded-2xl border border-[#d8b4fe] bg-[#faf5ff] p-4 shadow-xs">
          <p className="text-xs text-[#7e22ce] font-semibold">Scheduled Follow-Ups</p>
          <p className="mt-2 text-2xl font-bold text-[#7e22ce]">{pendingFollowUps.length}</p>
          <p className="mt-1 text-[11px] text-[#9333ea] font-semibold">Active Check-Ins</p>
        </div>

        <div className="rounded-2xl border border-[#fef2f2] bg-[#fff5f5] p-4 shadow-xs">
          <p className="text-xs text-[#991b1b] font-semibold">{t('pd_escalated_cases', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#dc2626]">{escalatedCases.length}</p>
          <p className="mt-1 text-[11px] text-[#991b1b] font-semibold">{t('pd_senior_review', currentLanguage)}</p>
        </div>
      </div>

      {/* ── Compact Follow-Ups Overview ── */}
      <div className="rounded-3xl border border-[#d8b4fe] bg-gradient-to-r from-[#faf5ff] to-[#f3e8ff] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-[#7e22ce] text-white shadow-xs">
                <Calendar size={14} />
              </span>
              <h3 className="text-sm font-bold text-[#1f2937]">Upcoming Follow-Ups</h3>
              <span className="rounded-full bg-[#f3e8ff] text-[#7e22ce] px-2 py-0.5 text-[10px] font-bold border border-[#d8b4fe]">
                {pendingFollowUps.length} pending
              </span>
            </div>
            <button
              onClick={loadFollowUps}
              className="text-[11px] font-bold text-[#7e22ce] hover:text-[#581c87] bg-white px-2.5 py-1 rounded-lg border border-[#ddd6fe] transition"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingFollowUps.length === 0 && (
              <div className="col-span-full py-4 text-center">
                <Calendar size={20} className="mx-auto text-[#c084fc] mb-1" />
                <p className="text-[11px] text-[#6b7280] font-medium">No pending follow-ups — all check-ins are up to date.</p>
              </div>
            )}
            {pendingFollowUps.slice(0, 6).map(fup => {
              const matchedCase = cases.find(c => c.id === fup.caseId)
              return (
                <div key={fup.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#ede9fe] text-xs">
                  <div className="size-8 rounded-lg bg-[#f3e8ff] text-[#7e22ce] flex items-center justify-center shrink-0">
                    <Calendar size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1f2937] truncate">{fup.victimName || (matchedCase ? matchedCase.victim_name : 'Complainant')}</p>
                    <p className="text-[10px] text-[#6b7280] truncate">{followUpTypeLabels[fup.followUpType] || fup.followUpType} · {new Date(fup.scheduledAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    fup.status === 'pending' ? 'bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]' : 'bg-[#eff6ff] text-[#1d4ed8] border border-[#dbeafe]'
                  }`}>{fup.status.replace('_', ' ')}</span>
                </div>
              )
            })}
          </div>
        </div>


      {/* Main High Priority Dispatch Queue */}
      <div className="rounded-3xl border border-[#fca5a5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-xs">
              <ShieldAlert size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#1a3d36]">{t('officer_console_title', currentLanguage)}</h2>
              <p className="text-xs text-[#6d8a83]">
                {t('active_cases', currentLanguage)}: {currentOfficer?.assigned_district || 'All Jurisdictions'}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-2.5 text-[#8ca8a0]" />
            <input
              type="text"
              placeholder={t('pd_search_placeholder', currentLanguage)}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[#d8e8e2] bg-[#fbfdfc] pl-9 pr-4 py-2 text-xs text-[#1a3d36] placeholder-[#8ca8a0] outline-none focus:border-[#1d8272] focus:bg-white"
            />
          </div>
        </div>

        {/* Case Cards Table / List */}
        <div className="space-y-4 pt-2">
          {policeCases.length > 0 ? (
            policeCases.map(c => {
              const isDispatched = dispatchedIds.includes(c.id)

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#fed7aa] bg-[#fffaf5] p-5 transition hover:border-[#f97316] hover:shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#feebd7] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#c2410c] bg-white px-2 py-0.5 rounded-md border border-[#fed7aa]">
                          {c.id}
                        </span>
                        <h3 className="font-bold text-sm text-[#1e293b]">{c.victim_name}</h3>
                        <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold ${priorityStyles[c.stress_assessment.risk_level] || 'bg-red-50 text-red-700'}`}>
                          SVI {c.stress_assessment.svi_score} · {c.stress_assessment.risk_level}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716c] mt-1 flex items-center gap-1 font-medium">
                        <MapPin size={12} className="text-[#ea580c]" />
                        <span>{c.incident_location.village_town_city}, {c.incident_location.district}, {c.incident_location.state} {c.incident_location.pincode ? `(${c.incident_location.pincode})` : ''}</span>
                        {c.proximity_routing && (
                          <span className="ml-1 text-[10px] text-[#c2410c] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#fed7aa]">
                            Matched via: {typeof c.proximity_routing === 'object' ? c.proximity_routing.routing_reason : c.proximity_routing}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCallComplainant(c)}
                        className="flex items-center gap-1.5 rounded-xl border border-[#fed7aa] bg-white px-3 py-1.5 text-xs font-bold text-[#c2410c] hover:bg-[#fff7ed] transition cursor-pointer"
                      >
                        <PhoneCall size={13} />
                        <span>{t('pd_call_complainant', currentLanguage)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatchEscort(c.id)}
                        disabled={isDispatched}
                        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer ${
                          isDispatched
                            ? 'bg-[#10b981] cursor-default'
                            : 'bg-[#ea580c] hover:bg-[#c2410c] shadow-xs'
                        }`}
                      >
                        {isDispatched ? <Check size={13} /> : <Car size={13} />}
                        <span>{isDispatched ? t('pd_escort_dispatched', currentLanguage) : t('dispatch_action', currentLanguage)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCaseModal(c)}
                        className="flex items-center gap-1 rounded-xl bg-[#1d8272] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#166558] transition cursor-pointer"
                      >
                        <span>{t('review_case', currentLanguage)}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#44403c] leading-relaxed line-clamp-2">
                    &ldquo;{c.narrative_text}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-[#a8a29e]">{t('pd_key_flags', currentLanguage)}</span>
                    {c.stress_assessment.key_trauma_triggers.slice(0, 4).map((trig, idx) => (
                      <span key={idx} className="rounded-md bg-[#fee2e2] text-[#991b1b] px-2 py-0.5 text-[10px] font-semibold">
                        {trig}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#fed7aa] p-8 text-center bg-[#fffaf5]">
              <CheckCircle2 size={32} className="mx-auto text-[#10b981]" />
              <h4 className="mt-2 text-xs font-bold text-[#1c1917]">{t('pd_no_escalations', currentLanguage)}</h4>
              <p className="mt-1 text-[11px] text-[#78716c]">
                {t('pd_no_escalations_desc', currentLanguage)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Follow-Ups & Welfare Check-Ins Section */}
      <div className="rounded-3xl border border-[#d8b4fe] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#7e22ce] text-white shadow-xs">
              <Calendar size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1f2937]">Scheduled Follow-Ups &amp; Welfare Visits</h2>
                <span className="rounded-full bg-[#f3e8ff] text-[#7e22ce] px-2.5 py-0.5 text-xs font-bold border border-[#d8b4fe]">
                  {followUpsList.length} Active
                </span>
              </div>
              <p className="text-xs text-[#6b7280]">
                Scheduled welfare check-ins, medical follow-ups, and victim protection monitoring
              </p>
            </div>
          </div>

          <button
            onClick={loadFollowUps}
            className="text-xs font-bold text-[#7e22ce] hover:text-[#581c87] bg-[#f5f3ff] px-3 py-1.5 rounded-xl border border-[#ddd6fe] transition"
          >
            Refresh Follow-Ups
          </button>
        </div>

        {followUpsLoading ? (
          <p className="text-xs text-[#718b85] italic text-center py-6">Loading scheduled visits...</p>
        ) : followUpsList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e9d5ff] p-8 text-center bg-[#faf5ff]">
            <Calendar size={32} className="mx-auto text-[#c084fc]" />
            <h4 className="mt-2 text-xs font-bold text-[#1f2937]">No Pending Follow-Up Visits</h4>
            <p className="mt-1 text-[11px] text-[#6b7280]">
              All scheduled welfare check-ins and victim monitoring tasks are up to date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUpsList.map((fup) => {
              const matchedCase = cases.find(c => c.id === fup.caseId)
              const statusColors: Record<string, string> = {
                pending: 'bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]',
                in_progress: 'bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]',
                completed: 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]',
                cancelled: 'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]'
              }

              return (
                <div
                  key={fup.id}
                  className="p-4 rounded-2xl border border-[#ede9fe] bg-[#fcfbfe] hover:border-[#c084fc] transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-extrabold text-[#7e22ce] bg-[#f5f3ff] px-2 py-0.5 rounded-md border border-[#ddd6fe]">
                        {fup.caseId}
                      </span>
                      <h4 className="font-bold text-sm text-[#1e1b4b]">
                        {fup.victimName || (matchedCase ? matchedCase.victim_name : 'Complainant')}
                      </h4>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-[#6b21a8] border border-[#d8b4fe]">
                        {followUpTypeLabels[fup.followUpType] || fup.followUpType}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize ${statusColors[fup.status] || statusColors.pending}`}>
                        {fup.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#6b7280] flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock size={12} className="text-[#7e22ce]" />
                        Scheduled: {new Date(fup.scheduledAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck size={12} className="text-[#7e22ce]" />
                        Assigned: {fup.assignedTo}
                      </span>
                      {(fup.district || matchedCase?.incident_location.district) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-[#7e22ce]" />
                          {fup.district || matchedCase?.incident_location.district}, {fup.state || matchedCase?.incident_location.state}
                        </span>
                      )}
                    </div>

                    {fup.notes && (
                      <p className="text-[11px] text-[#4b5563] italic bg-white p-2 rounded-xl border border-[#ede9fe]">
                        &quot;{fup.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions for Follow-Up */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCallFollowUpVictim(fup)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#d8b4fe] bg-white text-xs font-bold text-[#7e22ce] hover:bg-[#faf5ff] transition cursor-pointer"
                    >
                      <PhoneCall size={13} />
                      <span>Tele-Call</span>
                    </button>

                    {fup.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateFollowUp(fup.id, 'in_progress', fup.caseId)}
                        className="px-3 py-1.5 rounded-xl bg-[#eff6ff] text-[#1d4ed8] text-xs font-bold hover:bg-[#dbeafe] transition"
                      >
                        Start Visit
                      </button>
                    )}

                    {(fup.status === 'pending' || fup.status === 'in_progress') && (
                      <button
                        onClick={() => handleUpdateFollowUp(fup.id, 'completed', fup.caseId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ecfdf5] text-[#065f46] text-xs font-bold hover:bg-[#d1fae5] transition"
                      >
                        <CheckCircle2 size={13} />
                        <span>Complete</span>
                      </button>
                    )}

                    {matchedCase && (
                      <button
                        onClick={() => onOpenCaseModal(matchedCase)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1d8272] text-white text-xs font-bold hover:bg-[#166558] transition"
                      >
                        <span>Review</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Escalated Cases Queue */}
      {escalatedCases.length > 0 && (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fff5f5] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-xs animate-pulse">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#991b1b]">{t('pd_escalation_queue', currentLanguage)}</h2>
              <p className="text-xs text-[#b91c1c]">
                {escalatedCases.length} case{escalatedCases.length !== 1 ? 's' : ''} escalated to Tier 1 (Critical) priority
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {escalatedCases.map(c => (
              <div
                key={c.id}
                className="rounded-2xl border border-[#fecaca] bg-white p-4 transition hover:border-[#dc2626] hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
                    <AlertTriangle size={18} className="text-[#dc2626]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#dc2626] bg-[#fef2f2] px-2 py-0.5 rounded-md border border-[#fecaca]">
                        {c.id}
                      </span>
                      <h3 className="font-bold text-sm text-[#1e293b]">{c.victim_name}</h3>
                    </div>
                    <p className="text-[11px] text-[#78716c] mt-0.5">
                      {c.incident_location.district}, {c.incident_location.state} &bull; SVI {c.stress_assessment.svi_score} &bull; Priority Tier {c.priority_tier}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCaseModal(c)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#dc2626] px-4 py-2 text-xs font-bold text-white hover:bg-[#b91c1c] transition cursor-pointer shadow-xs"
                >
                  <span>{t('pd_review_escalated', currentLanguage)}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tele-Call Modal */}
      <TeleCallModal
        isOpen={teleModalOpen}
        onClose={() => setTeleModalOpen(false)}
        recipientName={teleRecipient.name}
        recipientRole={teleRecipient.role}
        recipientPhone={teleRecipient.phone}
        recipientAvatarColor="#dc2626"
      />
    </div>
  )
}
