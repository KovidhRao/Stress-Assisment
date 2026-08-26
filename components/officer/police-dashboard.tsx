'use client'

import React, { useState } from 'react'
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
  FileCheck
} from 'lucide-react'
import { CaseRecord, RiskLevel } from '@/types'
import { TeleCallModal } from '@/components/victim/tele-call-modal'

interface PoliceDashboardProps {
  cases: CaseRecord[]
  onSelectCase: (caseRecord: CaseRecord) => void
  onOpenCaseModal: (caseRecord: CaseRecord) => void
}

const priorityStyles: Record<string, string> = {
  Critical: 'bg-[#fff0ef] text-[#c94b48] border border-[#fca5a5]',
  High: 'bg-[#fff5e5] text-[#b87817] border border-[#fde68a]'
}

export function PoliceDashboard({
  cases,
  onSelectCase,
  onOpenCaseModal
}: PoliceDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([])

  // Tele-call modal state
  const [teleModalOpen, setTeleModalOpen] = useState(false)
  const [teleRecipient, setTeleRecipient] = useState({ name: '', role: '', phone: '' })

  // Police ONLY see High and Critical risk cases
  const policeCases = cases.filter(c => {
    const isHighOrCritical = c.stress_assessment.risk_level === 'High' || c.stress_assessment.risk_level === 'Critical'
    const matchesSearch = !searchTerm ||
      c.victim_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.incident_location.district.toLowerCase().includes(searchTerm.toLowerCase())
    return isHighOrCritical && matchesSearch
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Police Escalation KPI Banner */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#fca5a5] bg-[#fffbfb] p-4.5 shadow-xs">
          <p className="text-xs text-[#991b1b] font-semibold">Critical Threat Queue</p>
          <p className="mt-2 text-2xl font-bold text-[#991b1b]">{policeCases.length}</p>
          <p className="mt-1 text-[11px] text-[#dc2626] font-semibold">Priority Tier 1 &amp; 2</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Patrol Units Active</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">14</p>
          <p className="mt-1 text-[11px] text-[#1d8272] font-semibold">Across Nodal Districts</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Zero-FIR Compliance</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">100%</p>
          <p className="mt-1 text-[11px] text-[#1d8272] font-semibold">SC/ST PoA Statutory</p>
        </div>

        <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
          <p className="text-xs text-[#698881] font-semibold">Dispatched Escorts</p>
          <p className="mt-2 text-2xl font-bold text-[#173a34]">{dispatchedIds.length + 8}</p>
          <p className="mt-1 text-[11px] text-[#698881]">Active field units</p>
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
              <h2 className="text-base font-bold text-[#991b1b]">Law Enforcement &amp; Emergency Escort Queue</h2>
              <p className="text-xs text-[#7f1d1d]">
                Restricted to High and Critical SVI threats requiring immediate physical protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 rounded-xl border border-[#d6e3df] bg-[#fbfdfc] px-3 py-1.5 text-xs text-[#204540]">
              <Search size={14} className="text-[#718d86]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search case, district..."
                className="bg-transparent outline-none text-xs w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Priority Case Cards */}
        <div className="space-y-3 pt-2">
          {policeCases.map((item) => {
            const isDispatched = dispatchedIds.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => onSelectCase(item)}
                className="p-5 rounded-2xl border border-[#fee2e2] bg-[#fffbfb] hover:bg-[#fff5f5] transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fee2e2] text-sm font-bold text-[#991b1b] shrink-0 mt-0.5">
                    {item.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs sm:text-sm text-[#991b1b]">{item.victim_name}</p>
                      <span className="font-mono text-[10px] text-[#7f1d1d] bg-white px-2 py-0.5 rounded border border-[#fca5a5]">
                        {item.id}
                      </span>
                    </div>
                    <p className="text-xs text-[#7f1d1d] mt-1 font-medium flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#dc2626]" />
                      <span>{item.incident_location.village_town_city}, {item.incident_location.district} ({item.incident_location.state})</span>
                      <span>•</span>
                      <span>Reported {item.reported_at}</span>
                    </p>
                    <p className="text-[11px] text-[#556964] mt-1 line-clamp-1 italic">
                      &ldquo;{item.narrative_text}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className={`rounded-xl px-3 py-1 text-[11px] font-bold ${priorityStyles[item.stress_assessment.risk_level] || priorityStyles['High']}`}>
                    Tier {item.priority_tier} · SVI {item.stress_assessment.svi_score}
                  </span>

                  {isDispatched ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={13} />
                      <span>Patrol Dispatched</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDispatchEscort(item.id)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                    >
                      <Car size={13} />
                      <span>Dispatch Patrol</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCallComplainant(item)
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#d2e4de] bg-white hover:bg-[#f0f8f5] px-3 py-1.5 text-xs font-semibold text-[#1c4b42] transition"
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
                    className="flex items-center gap-1 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white px-3 py-1.5 text-xs font-bold transition"
                  >
                    <span>Dossier</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
