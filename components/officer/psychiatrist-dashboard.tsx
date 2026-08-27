'use client'

import React, { useState } from 'react'
import {
  Brain,
  Calendar,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  Search,
  Check,
  FileText,
  Activity,
  Sparkles,
  MapPin,
  BadgeAlert
} from 'lucide-react'
import { CaseRecord, RiskLevel, AppointmentRecord, OfficerProfile } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'
import { t } from '@/lib/i18n'

interface PsychiatristDashboardProps {
  cases: CaseRecord[]
  scheduledAppointments: AppointmentRecord[]
  currentOfficer?: OfficerProfile | null
  currentLanguage?: string
  onSelectCase: (caseRecord: CaseRecord) => void
  onOpenCaseModal: (caseRecord: CaseRecord) => void
  onUpdateStatus?: (caseId: string, newStatus: string) => void
}

const levelStyles: Record<RiskLevel, string> = {
  Critical: 'bg-[#fff0ef] text-[#c94b48] border border-[#fca5a5]',
  High: 'bg-[#fff5e5] text-[#b87817] border border-[#fde68a]',
  Moderate: 'bg-[#eef5ff] text-[#4f76bb] border border-[#bfdbfe]',
  Low: 'bg-[#edf8f2] text-[#4f9674] border border-[#a7f3d0]'
}

export function PsychiatristDashboard({
  cases,
  scheduledAppointments,
  currentOfficer,
  currentLanguage = 'en',
  onSelectCase,
  onOpenCaseModal
}: PsychiatristDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<'All' | 'High' | 'Moderate'>('All')

  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  const officerDistrict = (currentOfficer?.assigned_district || '').toLowerCase()
  const officerState = (currentOfficer?.assigned_state || '').toLowerCase()

  // Psychiatrist sees Moderate, High, and Critical cases routed to their region
  const psychCases = cases.filter(c => {
    const isPsychTier = c.stress_assessment.risk_level === 'Moderate' || c.stress_assessment.risk_level === 'High' || c.stress_assessment.risk_level === 'Critical'
    const matchesFilter = filterRisk === 'All' || c.stress_assessment.risk_level === filterRisk

    const isAssigned = c.assigned_officer_id === currentOfficer?.id ||
      (currentOfficer?.full_name && c.assigned_counsellor?.toLowerCase().includes(currentOfficer.full_name.toLowerCase()))
    const isLocalDistrict = officerDistrict && c.incident_location.district.toLowerCase().includes(officerDistrict)
    const isLocalState = officerState && c.incident_location.state.toLowerCase().includes(officerState)

    const matchesProximity = !currentOfficer || isAssigned || isLocalDistrict || isLocalState || currentOfficer.role === 'admin'

    const matchesSearch = !searchTerm ||
      c.victim_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.incident_location.district.toLowerCase().includes(searchTerm.toLowerCase())

    return isPsychTier && matchesFilter && matchesProximity && matchesSearch
  })

  const handleCallComplainant = (caseItem: CaseRecord) => {
    setTeleRecipient({
      name: caseItem.victim_name,
      role: `Complainant · Case ${caseItem.id}`,
      phone: caseItem.contact_number || '+91 98765 43210'
    })
    setTeleModalOpen(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Officer Header */}
      {currentOfficer && (
        <div className="rounded-3xl border border-[#cfe3dc] bg-gradient-to-r from-[#eef8f5] via-white to-[#f0fbf7] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#1d8272] text-white shadow-md">
              <Brain size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#163a34]">
                  {currentOfficer.full_name}
                </h2>
                <span className="font-mono text-[10px] font-extrabold bg-white border border-[#cfe3dc] text-[#1d8272] px-2 py-0.5 rounded-md">
                  {currentOfficer.officer_badge_id}
                </span>
              </div>
              <p className="text-xs text-[#285e54] mt-0.5 flex items-center gap-1 font-medium">
                <MapPin size={13} />
                <span>Specialized Triage Cell &bull; {currentOfficer.assigned_district}, {currentOfficer.assigned_state}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-[#cfe3dc] px-4 py-2 text-xs font-bold text-[#1d8272] shadow-xs">
            <Sparkles size={14} />
            <span>Clinical Proximity Triage Active</span>
          </div>
        </div>
      )}

      {/* Psychiatrist Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">{t('active_cases', currentLanguage)}</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">{psychCases.length}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#1d8272]">Moderate &amp; High Triage</p>
        </div>

        <div className="rounded-2xl border border-[#bfdbfe] bg-[#f8faff] p-4.5 shadow-xs">
          <p className="text-xs text-[#1e40af] font-semibold">Booked Consultations</p>
          <p className="mt-2 text-2xl font-bold text-[#1e40af]">{scheduledAppointments.length + 2}</p>
          <p className="mt-1 text-[11px] text-[#3b82f6] font-semibold">Synced from victim app</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Trauma De-escalation Rate</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">94.2%</p>
          <p className="mt-1 text-[11px] text-[#1d8272] font-semibold">Over 48 hours</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Avg Session Length</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">22 min</p>
          <p className="mt-1 text-[11px] text-[#698881]">Telephonic / Video</p>
        </div>
      </div>

      {/* Main Clinical Triage Case Queue */}
      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a3d36]">Psychological &amp; Crisis Triage Queue</h2>
            <p className="text-xs text-[#6d8a83]">
              Review citizen voice analyses, trauma markers, and initiate clinical tele-consultations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Risk filter */}
            <div className="flex items-center rounded-xl bg-[#f0f6f4] p-1 text-xs">
              {(['All', 'High', 'Moderate'] as const).map(risk => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => setFilterRisk(risk)}
                  className={`rounded-lg px-3 py-1 font-semibold transition ${
                    filterRisk === risk
                      ? 'bg-white text-[#1d8272] shadow-xs'
                      : 'text-[#698881] hover:text-[#163a34]'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search size={15} className="absolute left-3.5 top-2.5 text-[#8ca8a0]" />
              <input
                type="text"
                placeholder="Search victim, case..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-[#d8e8e2] bg-[#fbfdfc] pl-9 pr-4 py-2 text-xs text-[#1a3d36] placeholder-[#8ca8a0] outline-none focus:border-[#1d8272] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Case Cards */}
        <div className="space-y-4 pt-1">
          {psychCases.length > 0 ? (
            psychCases.map(c => {
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#dcebe5] bg-white p-5 transition hover:border-[#b8dad0] hover:shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf4f1] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#1d8272] bg-[#eef7f4] px-2 py-0.5 rounded-md border border-[#cfe3dc]">
                          {c.id}
                        </span>
                        <h3 className="font-bold text-sm text-[#163a34]">{c.victim_name}</h3>
                        <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold ${levelStyles[c.stress_assessment.risk_level]}`}>
                          SVI {c.stress_assessment.svi_score} · {c.stress_assessment.risk_level}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6d8a83] mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-[#1d8272]" />
                        <span>{c.incident_location.village_town_city}, {c.incident_location.district}, {c.incident_location.state}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCallComplainant(c)}
                        className="flex items-center gap-1.5 rounded-xl border border-[#cfe3dc] bg-white px-3 py-1.5 text-xs font-bold text-[#1d8272] hover:bg-[#edf7f3] transition"
                      >
                        <PhoneCall size={13} />
                        <span>Initiate Tele-Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCaseModal(c)}
                        className="flex items-center gap-1 rounded-xl bg-[#1d8272] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#166558] transition shadow-xs"
                      >
                        <span>{t('review_case', currentLanguage)}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#2a4d46] leading-relaxed line-clamp-2">
                    &ldquo;{c.narrative_text}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#73928a] font-medium">Psych Markers:</span>
                      {c.stress_assessment.key_trauma_triggers.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="rounded-md bg-[#edf7f3] text-[#1d8272] px-2 py-0.5 text-[10px] font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>

                    {c.voice_analysis && (
                      <span className="text-[#1d8272] font-semibold bg-[#eaf5f1] px-2 py-0.5 rounded-md text-[10px]">
                        🎙️ Voice Distress: {c.voice_analysis.acoustic_distress_score}/100
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#dcebe5] p-8 text-center bg-[#fafdfc]">
              <CheckCircle2 size={32} className="mx-auto text-[#10b981]" />
              <h4 className="mt-2 text-xs font-bold text-[#163a34]">All Triage Cases Clear in Your District</h4>
              <p className="mt-1 text-[11px] text-[#6d8a83]">
                No pending moderate or high trauma cases requiring immediate psychiatric triage.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tele-Call Modal */}
      <TeleCallModal
        isOpen={teleModalOpen}
        onClose={() => setTeleModalOpen(false)}
        recipientName={teleRecipient.name}
        recipientRole={teleRecipient.role}
        recipientPhone={teleRecipient.phone}
      />
    </div>
  )
}

