'use client'

import React, { useState, useMemo } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Brain,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Headphones,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Mic,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
  PhoneCall,
  AlertTriangle,
  Radio,
  LogOut,
  SlidersHorizontal,
  Compass,
  Wind,
  Plus,
  Scale,
  Building,
  CheckCircle2,
  Lock,
  Globe,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'

import { INITIAL_CASES, DEFAULT_OFFICERS } from '@/lib/mock-data'
import { computeSVI } from '@/lib/svi-engine'
import { CaseRecord, OfficerProfile, RiskLevel, UserProfile, VoiceAnalysisMetrics } from '@/types'
import { LoginView } from '@/components/auth/login-view'
import { VoiceRecorderModal } from '@/components/victim/voice-recorder-modal'
import { WellbeingToolsModal } from '@/components/victim/wellbeing-tools-modal'
import { SOSModal } from '@/components/victim/sos-modal'
import { ScreeningModal } from '@/components/victim/screening-modal'
import { ConsentModal } from '@/components/victim/consent-modal'
import { CaseDetailModal } from '@/components/officer/case-detail-modal'
import { IntakeModal } from '@/components/officer/intake-modal'

const levelStyles: Record<RiskLevel, string> = {
  Critical: 'bg-[#fff0ef] text-[#c94b48] border border-[#fca5a5]',
  High: 'bg-[#fff5e5] text-[#b87817] border border-[#fde68a]',
  Moderate: 'bg-[#eef5ff] text-[#4f76bb] border border-[#bfdbfe]',
  Low: 'bg-[#edf8f2] text-[#4f9674] border border-[#a7f3d0]'
}

export default function Home() {
  // Global App States
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'usr-default',
    email: 'ananya.s@example.com',
    full_name: 'Ananya S.',
    role: 'victim',
    avatar_initials: 'AS',
    created_at: new Date().toISOString()
  })
  const [currentOfficer, setCurrentOfficer] = useState<OfficerProfile | null>(null)
  const [isOfficerMode, setIsOfficerMode] = useState(false)
  const [activeTab, setActiveTab] = useState('My space')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')

  // Cases state
  const [casesList, setCasesList] = useState<CaseRecord[]>(INITIAL_CASES)
  const [selectedCase, setSelectedCase] = useState<CaseRecord>(INITIAL_CASES[0])
  const [selectedCaseModalOpen, setSelectedCaseModalOpen] = useState(false)
  const [officerFilter, setOfficerFilter] = useState('All cases')
  const [officerSearch, setOfficerSearch] = useState('')

  // Victim Interactive Assessment States
  const [victimNarrative, setVictimNarrative] = useState(
    'I feel constantly anxious and fearful since the village pradhan threatened our family over the land survey. I cannot sleep and fear they will attack us again.'
  )
  const [victimVoiceMetrics, setVictimVoiceMetrics] = useState<VoiceAnalysisMetrics | null>(null)
  const [victimClinicalScore, setVictimClinicalScore] = useState(6)
  const [victimAssessment, setVictimAssessment] = useState(() => computeSVI(
    'I feel constantly anxious and fearful since the village pradhan threatened our family over the land survey. I cannot sleep and fear they will attack us again.',
    null,
    6
  ))
  const [isSharedPrivately, setIsSharedPrivately] = useState(false)
  const [victimJourneyProgress, setVictimJourneyProgress] = useState(2)

  // Modals state
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [wellbeingModalOpen, setWellbeingModalOpen] = useState(false)
  const [wellbeingModalTab, setWellbeingModalTab] = useState<'breathing' | 'soundscape' | 'grounding'>('breathing')
  const [sosModalOpen, setSosModalOpen] = useState(false)
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Handle Login
  const handleLoginSuccess = (user: UserProfile, officer?: OfficerProfile | null) => {
    setCurrentUser(user)
    setCurrentOfficer(officer || null)
    const isOff = user.role === 'officer' || user.role === 'counsellor' || user.role === 'admin'
    setIsOfficerMode(isOff)
    setActiveTab(isOff ? 'Overview' : 'My space')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
  }

  // Quick Panic Exit (Redirects immediately for safety)
  const handleQuickExit = () => {
    window.location.href = 'https://www.google.com/search?q=weather+forecast+india'
  }

  // Recalculate victim SVI live on text change or voice submit
  const handleNarrativeChange = (text: string) => {
    setVictimNarrative(text)
    setIsSharedPrivately(false)
    const updatedAssessment = computeSVI(text, victimVoiceMetrics, victimClinicalScore)
    setVictimAssessment(updatedAssessment)
  }

  const handleVoiceComplete = (metrics: VoiceAnalysisMetrics) => {
    setVictimVoiceMetrics(metrics)
    if (metrics.transcript && !victimNarrative) {
      setVictimNarrative(metrics.transcript)
    }
    const updatedAssessment = computeSVI(victimNarrative || metrics.transcript, metrics, victimClinicalScore)
    setVictimAssessment(updatedAssessment)
    setVictimJourneyProgress(prev => Math.min(5, prev + 1))
  }

  const handleClinicalComplete = (score: number) => {
    setVictimClinicalScore(score)
    const updatedAssessment = computeSVI(victimNarrative, victimVoiceMetrics, score)
    setVictimAssessment(updatedAssessment)
    setVictimJourneyProgress(prev => Math.min(5, prev + 1))
  }

  // Handle Case Update from Officer Dossier
  const handleUpdateCase = (updated: CaseRecord) => {
    setCasesList(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelectedCase(updated)
  }

  // Handle Adding New Intake
  const handleAddIntake = (newCase: CaseRecord) => {
    setCasesList(prev => [newCase, ...prev])
    setSelectedCase(newCase)
  }

  // Filtered cases for Officer
  const filteredCases = useMemo(() => {
    return casesList.filter(c => {
      const matchFilter = officerFilter === 'All cases' || c.stress_assessment.risk_level === officerFilter
      const query = officerSearch.toLowerCase().trim()
      const matchSearch = !query || 
        c.victim_name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.incident_category.toLowerCase().includes(query) ||
        c.incident_location.district.toLowerCase().includes(query) ||
        c.incident_location.state.toLowerCase().includes(query)
      return matchFilter && matchSearch
    })
  }, [casesList, officerFilter, officerSearch])

  // If user is not logged in, render Login View
  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />
  }

  // Navigation Items
  const navItems = isOfficerMode
    ? [
        ['Overview', LayoutDashboard],
        ['Cases & Triage', ClipboardList],
        ['Wellbeing Insights', Activity],
        ['Redressal Team', Users]
      ] as const
    : [
        ['My space', LayoutDashboard],
        ['My story & Audio', FileText],
        ['Wellbeing journey', HeartHandshake],
        ['Support circle', Users]
      ] as const

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#24433d] font-sans antialiased">
      {/* Panic Quick Exit & National Helpline Banner */}
      <header className="bg-[#173f39] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#23564e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-tight">
            <span className="bg-[#1e8574] text-white px-2 py-0.5 rounded text-[11px]">14566</span>
            <span className="hidden sm:inline">National Helpline Against Atrocities</span>
          </div>
          <span className="hidden md:inline text-white/50">|</span>
          <span className="hidden md:inline text-[#a0dfd2]">Ministry of Social Justice and Empowerment, Govt of India</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
            <Globe size={13} className="text-[#a0dfd2]" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-white text-[11px] outline-none cursor-pointer"
            >
              <option value="English" className="text-black">English</option>
              <option value="Hindi" className="text-black">हिन्दी</option>
              <option value="Marathi" className="text-black">मराठी</option>
              <option value="Tamil" className="text-black">தமிழ்</option>
              <option value="Telugu" className="text-black">తెలుగు</option>
            </select>
          </div>

          {/* Quick Exit Button */}
          <button
            onClick={handleQuickExit}
            className="flex items-center gap-1.5 bg-[#ca4f46] hover:bg-[#b03e36] text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs transition"
            title="Quickly close this page and redirect to Google search"
          >
            <ShieldAlert size={13} />
            <span>Quick Panic Exit</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-37px)]">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#e3ebe7] bg-[#fbfdfc] px-5 py-6 transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#1d8b79] text-white shadow-sm font-bold">
                <HeartHandshake size={19} strokeWidth={2.4} />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-[#163a35]">sahaaya</span>
                <span className="block text-[9px] text-[#718b85] uppercase tracking-wider font-semibold">
                  NHAA 14566 Portal
                </span>
              </div>
            </div>
            <button
              className="text-[#7d8a86] lg:hidden p-1 hover:bg-[#eaf3f0] rounded-lg"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </div>

          {/* Role Switcher */}
          <div className="mt-8 rounded-2xl bg-[#eef6f3] p-1.5 border border-[#dcebe5]">
            <button
              onClick={() => {
                const nextMode = !isOfficerMode
                setIsOfficerMode(nextMode)
                setActiveTab(nextMode ? 'Overview' : 'My space')
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#285750] hover:bg-white transition shadow-xs"
            >
              <span className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-white text-[#258b79] shadow-xs">
                  {isOfficerMode ? <ShieldCheck size={16} /> : <UserRound size={16} />}
                </span>
                <span>{isOfficerMode ? 'Officer Console' : 'Victim Space'}</span>
              </span>
              <ChevronDown size={14} className="text-[#64847d]" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 flex flex-col gap-1.5 flex-1">
            {navItems.map(([label, Icon]) => (
              <button
                key={label}
                onClick={() => {
                  setActiveTab(label)
                  setSidebarOpen(false)
                }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  activeTab === label
                    ? 'bg-[#e4f1ed] text-[#177967] shadow-xs'
                    : 'text-[#647c76] hover:bg-[#f0f5f2] hover:text-[#1e4842]'
                }`}
              >
                <Icon size={17} strokeWidth={activeTab === label ? 2.4 : 1.8} />
                <span>{label}</span>
              </button>
            ))}

            {/* Victim Quick SOS Action in Sidebar */}
            {!isOfficerMode && (
              <button
                type="button"
                onClick={() => setSosModalOpen(true)}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5] py-2.5 px-3 text-xs font-bold transition shadow-xs"
              >
                <AlertTriangle size={15} />
                <span>Trigger Emergency SOS</span>
              </button>
            )}

            {/* Officer Quick Intake in Sidebar */}
            {isOfficerMode && (
              <button
                type="button"
                onClick={() => setIntakeModalOpen(true)}
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white py-2.5 px-3 text-xs font-bold transition shadow-md"
              >
                <Plus size={15} />
                <span>New 14566 Intake</span>
              </button>
            )}
          </nav>

          {/* Informed Consent / Ethical AI Info Card */}
          <div className="mt-auto rounded-2xl border border-[#dfeae5] bg-white p-4 shadow-xs">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-lg bg-[#eaf5f2] text-[#238c7b]">
              <Lock size={15} />
            </div>
            <p className="text-xs font-bold text-[#244b44]">Ethical AI &amp; PoA Shield</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#738e88]">
              Zero-knowledge biometrics and trauma assessment protocols.
            </p>
            <button
              onClick={() => setConsentModalOpen(true)}
              className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-[#1c8877] hover:underline"
            >
              Review Consent Badges <ArrowRight size={12} />
            </button>
          </div>

          {/* User Profile Bar / Logout */}
          <div className="mt-4 pt-3 border-t border-[#e6eee9] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-[#1d8272] text-white font-bold text-xs flex items-center justify-center">
                {currentUser.avatar_initials || 'US'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1f423d] truncate">{currentUser.full_name}</p>
                <p className="text-[10px] text-[#718b85] capitalize">{currentUser.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#718b85] hover:text-[#991b1b] hover:bg-[#fee2e2] transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* MAIN APPLICATION CONTAINER */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="flex h-16 items-center justify-between border-b border-[#e4ede9] bg-white/90 backdrop-blur-md px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                className="text-[#607973] lg:hidden p-1.5 hover:bg-[#edf4f1] rounded-xl"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={21} />
              </button>

              <div className="hidden items-center gap-2 text-xs font-semibold text-[#8ca39d] sm:flex">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-[#204a43]">{isOfficerMode ? 'Officer Triage Console' : 'Victim Support Space'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Direct 14566 Call Pill */}
              <a
                href="tel:14566"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eaf6f2] text-[#1d8272] text-xs font-bold hover:bg-[#d8efe8] transition"
              >
                <PhoneCall size={13} />
                <span>Helpline 14566</span>
              </a>

              {/* Notification Pill */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex size-9 items-center justify-center rounded-xl border border-[#dbe6e2] text-[#5e7771] hover:bg-[#f2f7f5] transition"
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e67863] animate-pulse" />
              </button>

              {/* Switch Role Quick Button */}
              <button
                onClick={() => {
                  const nextMode = !isOfficerMode
                  setIsOfficerMode(nextMode)
                  setActiveTab(nextMode ? 'Overview' : 'My space')
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#d6e3df] text-[#2c5851] bg-[#fbfdfc] hover:bg-[#eef5f2] transition hidden sm:flex items-center gap-1.5"
              >
                {isOfficerMode ? <UserRound size={14} /> : <ShieldCheck size={14} />}
                <span>Switch to {isOfficerMode ? 'Victim Space' : 'Officer Console'}</span>
              </button>
            </div>
          </header>

          {/* MAIN VIEWPORT BODY */}
          <main className="flex-1 p-5 sm:p-8 overflow-y-auto">
            {/* NOTIFICATIONS DRAWER OVERLAY */}
            {notificationsOpen && (
              <div className="mb-6 p-4 rounded-2xl bg-white border border-[#dcebe5] shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#edf4f1]">
                  <p className="text-xs font-bold text-[#1f423d] flex items-center gap-1.5">
                    <Bell size={14} className="text-[#1d8272]" />
                    <span>Real-Time NHAA Alerts &amp; Triage Notifications</span>
                  </p>
                  <button onClick={() => setNotificationsOpen(false)} className="text-[#718b85] hover:text-[#20433e]">
                    <X size={15} />
                  </button>
                </div>
                <div className="space-y-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#fff2f0] border border-[#fecaca] text-[#991b1b]">
                    <strong>Critical Triage:</strong> Case NHAA-2026-9041 (Suresh Kumar Valmiki) triggered 92 SVI - Urgent Police Escort Requested.
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]">
                    <strong>Legal Counsel Assigned:</strong> NALSA Advocate Radhika Nair acknowledged case NHAA-2026-8860.
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. VICTIM / CITIZEN VIEW */}
            {/* ========================================================================= */}
            {!isOfficerMode && (
              <div className="mx-auto max-w-[1160px] space-y-8">
                {/* Header Greeting & Emergency Button */}
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                      NHAA Safe Space · Tuesday, 25 August 2026
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#173a34] sm:text-4xl">
                      Welcome, {currentUser.full_name}
                    </h1>
                    <p className="mt-1.5 text-xs text-[#718d86]">
                      You are in a safe, confidential environment. We are here to listen and help protect you.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setSosModalOpen(true)}
                      className="flex items-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2.5 text-xs font-bold shadow-md transition animate-pulse"
                    >
                      <AlertTriangle size={15} />
                      <span>SOS Emergency</span>
                    </button>
                    <button
                      onClick={() => {
                        setWellbeingModalTab('soundscape')
                        setWellbeingModalOpen(true)
                      }}
                      className="flex items-center gap-2 rounded-2xl border border-[#d6e3df] bg-white hover:bg-[#f3f8f6] px-4 py-2.5 text-xs font-semibold text-[#27534c] shadow-xs transition"
                    >
                      <Headphones size={15} />
                      <span>Calming Audio</span>
                    </button>
                  </div>
                </div>

                {/* SVI Assessment Card & Journey Progress */}
                <div className="grid gap-6 lg:grid-cols-[1.3fr_.85fr]">
                  {/* Dynamic SVI Snapshot Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#174840] via-[#1d6b5e] to-[#1e8574] p-6 sm:p-7 text-white shadow-xl">
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-[#a7e8db] uppercase">
                          AI Stress Vulnerability Snapshot
                        </p>
                        <h2 className="mt-2.5 max-w-sm text-2xl font-bold leading-snug">
                          {victimAssessment.risk_level === 'Critical' && 'We detected acute distress signals.'}
                          {victimAssessment.risk_level === 'High' && 'You are carrying significant stress.'}
                          {victimAssessment.risk_level === 'Moderate' && 'You are taking a brave step forward.'}
                          {victimAssessment.risk_level === 'Low' && 'Gentle support for your wellbeing.'}
                        </h2>
                        <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#cdece5]">
                          Based on your voice tone and written statements, our clinical AI has prepared personalized protection recommendations.
                        </p>
                      </div>

                      <div className="flex size-13 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                        <Brain size={26} className="text-[#a7e8db]" />
                      </div>
                    </div>

                    <div className="relative z-10 mt-8 flex items-end justify-between border-t border-white/20 pt-5">
                      <div>
                        <p className="text-[11px] text-[#a7e8db] uppercase font-semibold">Stress Vulnerability Index</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-extrabold">{victimAssessment.svi_score}</span>
                          <span className="text-xs text-[#a7e8db]">/ 100</span>
                          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white text-[#174840]">
                            {victimAssessment.risk_level} Risk
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setScreeningModalOpen(true)}
                        className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#185a4f] hover:bg-[#eafaf6] transition shadow-sm flex items-center gap-1"
                      >
                        <span>Take Full 2-Min Screen</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div className="absolute -right-8 -top-10 size-48 rounded-full border-[24px] border-white/10" />
                    <div className="absolute -bottom-16 right-20 size-40 rounded-full border-[20px] border-[#39a896]/30" />
                  </div>

                  {/* Wellbeing Journey Tracker */}
                  <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">YOUR HEALING JOURNEY</p>
                        <span className="text-xs font-bold text-[#1d8272]">{victimJourneyProgress} of 5 complete</span>
                      </div>

                      <div className="mt-4 flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                              n <= victimJourneyProgress ? 'bg-[#1d8272]' : 'bg-[#e4efe9]'
                            }`}
                          />
                        ))}
                      </div>

                      <h3 className="mt-5 text-base font-bold text-[#1f423d]">Immediate Nervous System Reset</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#6d8a83]">
                        Engage in short sensory grounding or audio therapy to lower physical trembling and fear.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setWellbeingModalTab('breathing')
                        setWellbeingModalOpen(true)
                      }}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eaf6f2] hover:bg-[#d8efe8] py-3 text-xs font-bold text-[#18685b] transition shadow-xs"
                    >
                      <Wind size={15} />
                      <span>Start 2-Minute Box Breathing</span>
                    </button>
                  </div>
                </div>

                {/* Narrative & Voice Assessment Input Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Share Story Card */}
                  <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">SHARE YOUR STORY</p>
                          <h3 className="mt-1 text-lg font-bold text-[#1e423d]">Voice &amp; Text Assessment</h3>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#fff4e9] text-[#d9944b]">
                          <FileText size={20} />
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#6d8a83]">
                        Write or speak openly. Our speech analytics &amp; NLP engine evaluates pitch tremor, speed, and keywords in real time.
                      </p>

                      <textarea
                        value={victimNarrative}
                        onChange={(e) => handleNarrativeChange(e.target.value)}
                        className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-[#dcebe5] bg-[#fbfdfc] p-3.5 text-xs text-[#204540] outline-none placeholder:text-[#9db7b0] focus:border-[#1e8574]"
                        placeholder="Describe what occurred, any threats, denial of rights, or how you are feeling..."
                      />

                      {/* Detected Triggers Chips */}
                      {victimAssessment.key_trauma_triggers.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-[#6e8a83]">Live Triggers Detected:</span>
                          {victimAssessment.key_trauma_triggers.map((trig, i) => (
                            <span key={i} className="text-[10px] bg-[#fff2f0] text-[#991b1b] px-2 py-0.5 rounded-md font-mono border border-[#fecaca]">
                              {trig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#edf4f1]">
                      <button
                        onClick={() => setVoiceModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-[#d4e4df] bg-[#fbfdfc] hover:bg-[#eef7f4] px-4 py-2 text-xs font-semibold text-[#27534c] transition"
                      >
                        <Mic size={15} className="text-[#1d8272]" />
                        <span>{victimVoiceMetrics ? 'Re-record Voice' : 'Add Voice Recording'}</span>
                      </button>

                      <button
                        onClick={() => setIsSharedPrivately(true)}
                        className="rounded-xl bg-[#1d8272] hover:bg-[#186f60] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                      >
                        {isSharedPrivately ? '✓ Saved Privately' : 'Analyze & Save'}
                      </button>
                    </div>
                  </div>

                  {/* Immediate Coping & Resources Card */}
                  <div className="rounded-3xl bg-[#f0f6f3] border border-[#dbe8e3] p-6 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">CLINICAL &amp; REDRESSAL TOOLS</p>
                      <h3 className="mt-1 text-lg font-bold text-[#1e423d]">Immediate Support Matrix</h3>

                      <div className="mt-4 space-y-3">
                        <button
                          onClick={() => {
                            setWellbeingModalTab('breathing')
                            setWellbeingModalOpen(true)
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#dcebe5] hover:border-[#1d8272] transition text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-[#e4f3ee] text-[#1d8272] flex items-center justify-center">
                              <Target size={17} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#234842]">2-Minute Box Breathing</p>
                              <p className="text-[11px] text-[#718d86]">Stabilize acute panic &amp; physical tremors</p>
                            </div>
                          </div>
                          <ArrowRight size={15} className="text-[#8ea8a2] group-hover:text-[#1d8272]" />
                        </button>

                        <button
                          onClick={() => {
                            setWellbeingModalTab('soundscape')
                            setWellbeingModalOpen(true)
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#dcebe5] hover:border-[#1d8272] transition text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-[#fff1e4] text-[#d68e48] flex items-center justify-center">
                              <Headphones size={17} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#234842]">Calming 432 Hz Soundscape</p>
                              <p className="text-[11px] text-[#718d86]">Synthesized audio masking for intrusive stress</p>
                            </div>
                          </div>
                          <ArrowRight size={15} className="text-[#8ea8a2] group-hover:text-[#1d8272]" />
                        </button>

                        <button
                          onClick={() => {
                            setWellbeingModalTab('grounding')
                            setWellbeingModalOpen(true)
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#dcebe5] hover:border-[#1d8272] transition text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-[#eef5ff] text-[#4f76bb] flex items-center justify-center">
                              <Compass size={17} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#234842]">5-4-3-2-1 Sensory Grounding</p>
                              <p className="text-[11px] text-[#718d86]">Clinically guided orientation to safety</p>
                            </div>
                          </div>
                          <ArrowRight size={15} className="text-[#8ea8a2] group-hover:text-[#1d8272]" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#d8e6e0] flex items-center justify-between text-xs">
                      <span className="text-[#64827b]">Need legal counsel?</span>
                      <button
                        onClick={() => alert('NALSA Legal Aid Cell helpline (15100) or NHAA Legal Counsel will be assigned based on your complaint.')}
                        className="font-bold text-[#1d8272] hover:underline"
                      >
                        Request Free NALSA Legal Aid
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. NHAA OFFICER & COUNSELLOR CONSOLE VIEW */}
            {/* ========================================================================= */}
            {isOfficerMode && (
              <div className="mx-auto max-w-[1200px] space-y-8">
                {/* Officer Console Header */}
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                      NHAA 14566 Triage Console · Active Cadre Session
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#173a34] sm:text-4xl">
                      {currentOfficer ? currentOfficer.full_name : 'Dr. Ramesh Chandra'}
                    </h1>
                    <p className="mt-1.5 text-xs text-[#718d86]">
                      Department: {currentOfficer ? currentOfficer.department : 'Psychological Triage & Crisis Response'} · Badge: {currentOfficer ? currentOfficer.officer_badge_id : 'NHAA-DL-8092'}
                    </p>
                  </div>

                  <button
                    onClick={() => setIntakeModalOpen(true)}
                    className="flex items-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white px-5 py-3 text-xs font-bold shadow-md transition"
                  >
                    <ClipboardList size={16} />
                    <span>New 14566 Call Intake</span>
                  </button>
                </div>

                {/* Triage KPI Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
                    <p className="text-xs text-[#698881] font-semibold">Active Grievance Queue</p>
                    <p className="mt-2 text-2xl font-bold text-[#173a34]">{casesList.length}</p>
                    <p className="mt-1 text-xs font-semibold text-[#1d8272]">+2 new intakes today</p>
                  </div>

                  <div className="rounded-2xl border border-[#fca5a5] bg-[#fffbfb] p-4.5 shadow-xs">
                    <p className="text-xs text-[#991b1b] font-semibold">Critical Risk (SVI &gt; 75)</p>
                    <p className="mt-2 text-2xl font-bold text-[#991b1b]">
                      {casesList.filter(c => c.stress_assessment.risk_level === 'Critical').length}
                    </p>
                    <p className="mt-1 text-xs text-[#dc2626] font-semibold">Immediate police &amp; crisis dispatch</p>
                  </div>

                  <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
                    <p className="text-xs text-[#698881] font-semibold">Avg. Crisis Response</p>
                    <p className="mt-2 text-2xl font-bold text-[#173a34]">14 min</p>
                    <p className="mt-1 text-xs text-[#1d8272] font-semibold">22% faster than target</p>
                  </div>

                  <div className="rounded-2xl border border-[#dcebe5] bg-white p-4.5 shadow-xs">
                    <p className="text-xs text-[#698881] font-semibold">Dispatched Protections</p>
                    <p className="mt-2 text-2xl font-bold text-[#173a34]">18</p>
                    <p className="mt-1 text-xs text-[#698881]">Across 4 State Nodal Desks</p>
                  </div>
                </div>

                {/* Main Interactive Case Triage Table & Quick Selected Drawer */}
                <div className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
                  {/* Case List Section */}
                  <section className="rounded-3xl border border-[#dcebe5] bg-white p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-base font-bold text-[#1a3f39]">Real-Time Triage &amp; Risk Queue</h2>
                        <p className="mt-0.5 text-xs text-[#6d8a83]">
                          Multi-channel distress assessments from 14566, IVRS, and Web Portal.
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-xl border border-[#d6e3df] bg-[#fbfdfc] px-3 py-1.5 text-xs text-[#204540]">
                          <Search size={14} className="text-[#718d86]" />
                          <input
                            type="text"
                            value={officerSearch}
                            onChange={(e) => setOfficerSearch(e.target.value)}
                            placeholder="Search case, district..."
                            className="bg-transparent outline-none text-xs w-36 sm:w-44"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {['All cases', 'Critical', 'High', 'Moderate', 'Low'].map((item) => (
                        <button
                          key={item}
                          onClick={() => setOfficerFilter(item)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            officerFilter === item
                              ? 'bg-[#1d8272] text-white shadow-xs'
                              : 'bg-[#f0f6f3] text-[#607d76] hover:bg-[#e4eee9]'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    {/* Cases List Rows */}
                    <div className="mt-4 flex flex-col divide-y divide-[#edf4f1]">
                      {filteredCases.length > 0 ? (
                        filteredCases.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedCase(item)
                            }}
                            className={`flex items-center gap-3.5 py-4 px-3 rounded-2xl cursor-pointer transition ${
                              selectedCase.id === item.id ? 'bg-[#eef7f4]' : 'hover:bg-[#f8faf9]'
                            }`}
                          >
                            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#e4f3ee] text-xs font-bold text-[#1d8272] shrink-0">
                              {item.initials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-xs font-bold text-[#1a3f39]">{item.victim_name}</p>
                                <span className="text-[10px] font-mono text-[#718d86]">{item.id}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-[#6d8a83] truncate">
                                {item.incident_category} · {item.incident_location.district} ({item.incident_location.state}) · {item.reported_at}
                              </p>
                            </div>

                            {/* SVI Meter */}
                            <div className="text-right shrink-0">
                              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${levelStyles[item.stress_assessment.risk_level]}`}>
                                SVI {item.stress_assessment.svi_score} · {item.stress_assessment.risk_level}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCase(item)
                                setSelectedCaseModalOpen(true)
                              }}
                              className="p-1.5 text-[#7a958e] hover:text-[#1d8272] hover:bg-white rounded-lg transition"
                              title="Open Full Dossier"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-[#718d86]">
                          No cases matching &quot;{officerSearch}&quot; in {officerFilter}.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Selected Case Quick Overview Sidebar */}
                  <aside className="rounded-3xl bg-[#f0f6f3] border border-[#dcebe5] p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">SELECTED DOSSIER</p>
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${levelStyles[selectedCase.stress_assessment.risk_level]}`}>
                          {selectedCase.stress_assessment.risk_level} Risk
                        </span>
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d5ebe4] font-bold text-base text-[#1d8272]">
                          {selectedCase.initials}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#1b403a]">{selectedCase.victim_name}</h3>
                          <p className="text-[11px] text-[#718d86] font-mono">Case ID: {selectedCase.id}</p>
                        </div>
                      </div>

                      {/* Circular SVI Gauge */}
                      <div className="mt-6 rounded-2xl bg-white border border-[#dcebe5] p-4 shadow-xs">
                        <p className="text-xs text-[#698881] font-semibold">AI Stress Vulnerability Signal</p>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="relative size-14 rounded-full border-[6px] border-[#fee2e2] border-t-[#dc2626] border-r-[#dc2626] flex items-center justify-center">
                            <span className="text-xs font-bold text-[#991b1b]">{selectedCase.stress_assessment.svi_score}%</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1b403a]">{selectedCase.stress_assessment.risk_level} Priority</p>
                            <p className="text-[11px] text-[#6d8a83] mt-0.5">
                              {selectedCase.stress_assessment.intimidation_flag ? 'Intimidation threat verified' : 'Psychological support required'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Step */}
                      <div className="mt-5">
                        <p className="text-xs font-bold text-[#698881] uppercase">Key Recommended Action</p>
                        <div className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[#2c534d] bg-white p-3 rounded-xl border border-[#dcebe5]">
                          <Check size={16} className="mt-0.5 shrink-0 text-[#1d8272]" />
                          <span>{selectedCase.stress_assessment.recommended_actions[0] || 'Schedule Safe Tele-Counselling'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCaseModalOpen(true)}
                      className="mt-6 w-full rounded-2xl bg-[#1d8272] hover:bg-[#186f60] py-3 text-xs font-bold text-white shadow-md transition"
                    >
                      Open Full Case Dossier &amp; Dispatch
                    </button>
                  </aside>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onComplete={handleVoiceComplete}
        language={selectedLanguage}
      />

      <WellbeingToolsModal
        isOpen={wellbeingModalOpen}
        onClose={() => setWellbeingModalOpen(false)}
        initialTab={wellbeingModalTab}
      />

      <SOSModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        complainantName={currentUser.full_name}
      />

      <ScreeningModal
        isOpen={screeningModalOpen}
        onClose={() => setScreeningModalOpen(false)}
        onComplete={handleClinicalComplete}
      />

      <ConsentModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        onConsentGiven={() => alert('Informed Consent preferences saved securely.')}
      />

      <CaseDetailModal
        caseRecord={selectedCase}
        isOpen={selectedCaseModalOpen}
        onClose={() => setSelectedCaseModalOpen(false)}
        onUpdateCase={handleUpdateCase}
      />

      <IntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        onAddCase={handleAddIntake}
      />
    </div>
  )
}
