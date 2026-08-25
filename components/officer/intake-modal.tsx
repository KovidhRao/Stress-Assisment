'use client'

import React, { useState } from 'react'
import { X, PhoneCall, Sparkles, AlertTriangle, CheckCircle2, User, MapPin } from 'lucide-react'
import { CaseRecord, ChannelType, IncidentCategory } from '@/types'
import { computeSVI } from '@/lib/svi-engine'

interface IntakeModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCase: (newCase: CaseRecord) => void
}

export function IntakeModal({ isOpen, onClose, onAddCase }: IntakeModalProps) {
  const [victimName, setVictimName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [contactNumber, setContactNumber] = useState('')
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory>('Caste-based Discrimination')
  const [stateName, setStateName] = useState('Uttar Pradesh')
  const [district, setDistrict] = useState('Lucknow')
  const [villageCity, setVillageCity] = useState('')
  const [channel, setChannel] = useState<ChannelType>('helpline_14566')
  const [language, setLanguage] = useState('Hindi')
  const [narrativeText, setNarrativeText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!narrativeText.trim()) return

    setSubmitting(true)
    setTimeout(() => {
      // Compute SVI live
      const assessment = computeSVI(narrativeText)
      const caseId = `NHAA-2026-${Math.floor(Math.random() * 900 + 9100)}`
      assessment.case_id = caseId

      const newCase: CaseRecord = {
        id: caseId,
        victim_name: isAnonymous ? 'Anonymous Caller' : (victimName || 'Citizen Complainant'),
        initials: isAnonymous ? 'AC' : (victimName || 'CC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        is_anonymous: isAnonymous,
        contact_number: contactNumber || '+91 98765 00000',
        incident_category: incidentCategory,
        incident_location: {
          village_town_city: villageCity || 'District Centre',
          district: district || 'Central',
          state: stateName
        },
        channel,
        language,
        reported_at: 'Just now',
        narrative_text: narrativeText,
        stress_assessment: assessment,
        status: 'New Intake',
        priority_tier: assessment.risk_level === 'Critical' ? 1 : assessment.risk_level === 'High' ? 2 : 3,
        notes: [
          {
            id: `N-${Date.now()}`,
            author: 'NHAA 14566 Helpline Intake Operator',
            role: 'Intake Officer',
            timestamp: 'Just now',
            text: `Intake registered via ${channel}. Live SVI calculated: ${assessment.svi_score}/100 (${assessment.risk_level} Risk).`
          }
        ],
        dispatched_actions: []
      }

      onAddCase(newCase)
      setSubmitting(false)
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#d6e3df] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-[#173f39] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 flex items-center justify-center">
              <PhoneCall size={18} className="text-[#a1e5d7]" />
            </div>
            <div>
              <h3 className="font-semibold text-base">New 14566 Helpline / Grievance Intake</h3>
              <p className="text-[11px] text-[#a4d7cb]">Live AI Stress &amp; Trauma Triage Registration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#a4d7cb] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#2b4c46]">Complainant Name</label>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition ${
                    isAnonymous ? 'bg-[#1e8574] text-white' : 'bg-[#eef5f2] text-[#3e6860]'
                  }`}
                >
                  {isAnonymous ? '✓ Anonymous' : 'Keep Anonymous'}
                </button>
              </div>
              <input
                type="text"
                disabled={isAnonymous}
                value={isAnonymous ? 'Anonymous Complainant' : victimName}
                onChange={(e) => setVictimName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none disabled:bg-[#f3f7f5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">Incident Category (PoA Act)</label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value as IncidentCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
              >
                <option value="Caste-based Discrimination">Caste-based Discrimination</option>
                <option value="Atrocity & Physical Violence">Atrocity &amp; Physical Violence</option>
                <option value="Social Boycott & Ostracization">Social Boycott &amp; Ostracization</option>
                <option value="Verbal Abuse & Intimidation">Verbal Abuse &amp; Intimidation</option>
                <option value="Land/Property Displacement">Land/Property Displacement</option>
                <option value="Sexual Harassment & Assault">Sexual Harassment &amp; Assault</option>
                <option value="Denial of Basic Rights & Services">Denial of Basic Rights &amp; Services</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">Intake Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none bg-white"
              >
                <option value="helpline_14566">NHAA Toll-Free 14566 Call</option>
                <option value="integrated_portal">Integrated Redressal Portal</option>
                <option value="ivrs">IVRS Voice Assistant</option>
                <option value="chatbot">Citizen Chatbot</option>
                <option value="mobile_app">Mobile Application</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">State / UT</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#2b4c46] mb-1">Village / City</label>
              <input
                type="text"
                value={villageCity}
                onChange={(e) => setVillageCity(e.target.value)}
                placeholder="Village / Ward"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3df] text-xs text-[#20433e] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2b4c46] mb-1">
              Complainant Narrative &amp; Statements (NLP &amp; Stress Analyzer Input)
            </label>
            <textarea
              required
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
              placeholder="Describe the complaint narrative. Mention any threats, injuries, social boycott, fear, or physical abuse for real-time SVI calculation..."
              className="w-full p-3.5 rounded-2xl border border-[#d6e3df] text-xs text-[#20433e] outline-none min-h-[100px] bg-[#fbfdfc] focus:border-[#1e8574]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#edf3f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5e7771] hover:text-[#21433e]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white text-xs font-semibold shadow-md transition"
            >
              <Sparkles size={14} />
              <span>{submitting ? 'Calculating SVI & Registering...' : 'Submit & Triage Case'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
