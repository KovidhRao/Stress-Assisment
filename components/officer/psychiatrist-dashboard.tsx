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
  Sparkles
} from 'lucide-react'
import { CaseRecord, RiskLevel, AppointmentRecord } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'

interface PsychiatristDashboardProps {
  cases: CaseRecord[]
  scheduledAppointments: AppointmentRecord[]
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
  onSelectCase,
  onOpenCaseModal
}: PsychiatristDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<'All' | 'High' | 'Moderate'>('All')

  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  // Psychiatrist sees Moderate, High, and Critical cases
  const psychCases = cases.filter(c => {
    const isPsychTier = c.stress_assessment.risk_level === 'Moderate' || c.stress_assessment.risk_level === 'High' || c.stress_assessment.risk_level === 'Critical'
    const matchesFilter = filterRisk === 'All' || c.stress_assessment.risk_level === filterRisk
    const matchesSearch = !searchTerm ||
      c.victim_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.incident_location.district.toLowerCase().includes(searchTerm.toLowerCase())
    return isPsychTier && matchesFilter && matchesSearch
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
      {/* Psychiatrist Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Active Clinical Cases</p>
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

      {/* Scheduled Appointments Sync Section */}
      <div className="rounded-3xl border border-[#c5e4db] bg-gradient-to-r from-[#eef8f5] to-[#f4faf7] p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-[#1d8272] text-white shadow-xs">
              <Calendar size={18} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#173d37]">Live Tele-Consultation Schedule</h3>
              <p className="text-[11px] text-[#5b7d75]">Appointments booked by complainants in real time</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1d8272] border border-[#cfe3db]">
            {scheduledAppointments.length + 1} Upcoming Today
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Synced victim appointments */}
          {scheduledAppointments.map((apt) => (
            <div key={apt.id} className="rounded-2xl bg-white border border-[#cfe5dc] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#1d8272] uppercase bg-[#eaf6f2] px-2 py-0.5 rounded">
                  {apt.slot_time} · {apt.date}
                </span>
                <span className="size-2 rounded-full bg-[#10b981] animate-ping" />
              </div>
              <p className="font-bold text-xs text-[#1a413b] mt-2">Ananya S. (Complainant)</p>
              <p className="text-[11px] text-[#698982] mt-0.5">{apt.meeting_mode} · Trauma Intake</p>
              <button
                type="button"
                onClick={() => setTeleModalOpen(true)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1d8272] text-white py-1.5 text-xs font-bold hover:bg-[#186f60] transition"
              >
                <PhoneCall size={12} />
                <span>Launch Tele-Session</span>
              </button>
            </div>
          ))}

          {/* Default Slot */}
          <div className="rounded-2xl bg-white border border-[#cfe5dc] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#1e40af] uppercase bg-[#eff6ff] px-2 py-0.5 rounded">
                6:30 PM · Today
              </span>
              <span className="size-2 rounded-full bg-[#3b82f6]" />
            </div>
            <p className="font-bold text-xs text-[#1a413b] mt-2">Pooja Rani Meghwal</p>
            <p className="text-[11px] text-[#698982] mt-0.5">Secure Video Call · Physical Assault Review</p>
            <button
              type="button"
              onClick={() => setTeleModalOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1e40af] text-white py-1.5 text-xs font-bold hover:bg-[#1d3557] transition"
            >
              <PhoneCall size={12} />
              <span>Launch Tele-Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Case Management Table */}
      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#183e38]">Assigned Psychological Care Queue</h2>
            <p className="text-xs text-[#6d8a83]">
              Review vulnerability indicators and initiate clinical tele-intervention.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 rounded-xl border border-[#d6e3df] bg-[#fbfdfc] px-3 py-1.5 text-xs text-[#204540]">
              <Search size={14} className="text-[#718d86]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient, ID..."
                className="bg-transparent outline-none text-xs w-32 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex gap-2">
          {(['All', 'High', 'Moderate'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                filterRisk === r
                  ? 'bg-[#1d8272] text-white shadow-xs'
                  : 'bg-[#f0f6f3] text-[#627f78] hover:bg-[#e4eee9]'
              }`}
            >
              {r === 'All' ? 'All Triage' : `${r} Risk`}
            </button>
          ))}
        </div>

        {/* Case Cards List */}
        <div className="space-y-3 pt-2">
          {psychCases.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectCase(item)}
              className="p-4 rounded-2xl border border-[#e2ede8] bg-[#fbfdfc] hover:bg-[#f0f8f5] transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#e4f3ee] text-xs font-bold text-[#1d8272] shrink-0 mt-0.5">
                  {item.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-[#1a3f39]">{item.victim_name}</p>
                    <span className="font-mono text-[10px] text-[#718d86]">{item.id}</span>
                  </div>
                  <p className="text-[11px] text-[#6d8a83] mt-0.5 line-clamp-1">
                    {item.incident_category} · {item.incident_location.district}, {item.incident_location.state}
                  </p>
                  <p className="text-[11px] text-[#4d7068] mt-1 italic line-clamp-1">
                    &ldquo;{item.narrative_text}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span className={`rounded-xl px-2.5 py-1 text-[10px] font-bold ${levelStyles[item.stress_assessment.risk_level]}`}>
                  SVI {item.stress_assessment.svi_score} · {item.stress_assessment.risk_level}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCallComplainant(item)
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white px-3 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall size={12} />
                  <span>Call</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenCaseModal(item)
                  }}
                  className="flex items-center gap-1 rounded-xl border border-[#d2e4de] bg-white hover:bg-[#eaf4f0] px-3 py-1.5 text-xs font-semibold text-[#1c4b42] transition"
                >
                  <span>View Case</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
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
