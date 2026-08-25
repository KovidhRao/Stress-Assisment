'use client'

import React, { useState } from 'react'
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
  ArrowUpRight
} from 'lucide-react'
import { CaseRecord, RiskLevel } from '@/types'

interface CaseDetailModalProps {
  caseRecord: CaseRecord | null
  isOpen: boolean
  onClose: () => void
  onUpdateCase: (updated: CaseRecord) => void
  currentUserRole?: string
}

const levelBadges: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-[#fef2f2]', text: 'text-[#991b1b]', border: 'border-[#fecaca]' },
  High: { bg: 'bg-[#fffbeb]', text: 'text-[#92400e]', border: 'border-[#fde68a]' },
  Moderate: { bg: 'bg-[#eff6ff]', text: 'text-[#1e40af]', border: 'border-[#bfdbfe]' },
  Low: { bg: 'bg-[#ecfdf5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]' }
}

export function CaseDetailModal({ caseRecord, isOpen, onClose, onUpdateCase }: CaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'assessment' | 'voice' | 'actions' | 'notes'>('assessment')
  const [newNote, setNewNote] = useState('')
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null)

  if (!isOpen || !caseRecord) return null

  const { stress_assessment, voice_analysis } = caseRecord

  // Handle 1-Click Action Dispatch
  const handleDispatchAction = (actionType: 'Police Protection' | 'Legal Aid (NALSA)' | 'Mental Health Counsellor' | 'Medical Hospitalization' | 'Witness Protection' | 'District Collector Notice') => {
    const newDispatch = {
      id: `DA-${Date.now().toString().slice(-4)}`,
      action_type: actionType,
      status: 'Dispatched' as const,
      dispatched_at: 'Just now',
      reference_id: `${actionType.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`
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
  }

  // Handle Adding Case Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const updatedNotes = [
      ...caseRecord.notes,
      {
        id: `N-${Date.now()}`,
        author: 'Dr. Ramesh Chandra',
        role: 'Psychological Triage',
        timestamp: 'Just now',
        text: newNote.trim()
      }
    ]

    onUpdateCase({
      ...caseRecord,
      notes: updatedNotes
    })
    setNewNote('')
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 p-1.5 bg-[#f0f6f3] border-b border-[#e1ece8] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'assessment' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Brain size={15} />
            <span>SVI &amp; Trauma Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'voice' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <Mic size={15} />
            <span>Voice &amp; Acoustics</span>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'actions' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Dispatch &amp; Protection</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition ${
              activeTab === 'notes' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#647d77] hover:text-[#20433e]'
            }`}
          >
            <MessageSquare size={15} />
            <span>Case Notes ({caseRecord.notes.length})</span>
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

          {/* TAB 1: SVI & TRAUMA PROFILE */}
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

          {/* TAB 2: VOICE & ACOUSTICS */}
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

          {/* TAB 3: DISPATCH & PROTECTION */}
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

          {/* TAB 4: CASE NOTES */}
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
                {caseRecord.notes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e4ede9] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1f423d]">{note.author} ({note.role})</span>
                      <span className="text-[#8ba29c]">{note.timestamp}</span>
                    </div>
                    <p className="text-[#3b5b55] leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
