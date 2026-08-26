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
  ShieldAlert,
  Calendar,
  Smile,
  Meh,
  Frown,
  Zap,
  Waves
} from 'lucide-react'

import {
  INITIAL_CASES,
  DEFAULT_OFFICERS,
  INITIAL_STORIES,
  INITIAL_CONTACTS,
  INITIAL_ACTIVITIES
} from '@/lib/mock-data'
import { computeSVI } from '@/lib/svi-engine'
import {
  CaseRecord,
  OfficerProfile,
  RiskLevel,
  UserProfile,
  VoiceAnalysisMetrics,
  UserStory,
  AppointmentRecord,
  TrustedContact,
  UserActivity
} from '@/types'

import { LoginView } from '@/components/auth/login-view'
import { StoryInputCard } from '@/components/victim/story-input-card'
import { MyStoriesView } from '@/components/victim/my-stories-view'
import { WellbeingJourneyView } from '@/components/victim/wellbeing-journey-view'
import { SupportCircleView } from '@/components/victim/support-circle-view'
import { PsychiatristDashboard } from '@/components/officer/psychiatrist-dashboard'
import { PoliceDashboard } from '@/components/officer/police-dashboard'
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
  const [currentOfficer, setCurrentOfficer] = useState<OfficerProfile | null>(DEFAULT_OFFICERS[0])
  const [isOfficerMode, setIsOfficerMode] = useState(false)
  const [officerRoleView, setOfficerRoleView] = useState<'psychiatrist' | 'police'>('psychiatrist')
  const [activeTab, setActiveTab] = useState<'My space' | 'My story & Audio' | 'Wellbeing journey' | 'Support circle'>('My space')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')

  // Prototype Simulated Condition State (Normal / Moderate / High)
  const [simulatedCondition, setSimulatedCondition] = useState<RiskLevel>('Moderate')
  const [selectedMood, setSelectedMood] = useState<'Calm' | 'Okay' | 'Stressed' | 'Anxious' | 'Overwhelmed' | null>('Stressed')

  // Interactive Stories State
  const [storiesList, setStoriesList] = useState<UserStory[]>(INITIAL_STORIES)
  const [contactsList, setContactsList] = useState<TrustedContact[]>(INITIAL_CONTACTS)
  const [scheduledAppointments, setScheduledAppointments] = useState<AppointmentRecord[]>([])
  const [activitiesList, setActivitiesList] = useState<UserActivity[]>(INITIAL_ACTIVITIES)

  // Cases State for Officer Console
  const [casesList, setCasesList] = useState<CaseRecord[]>(INITIAL_CASES)
  const [selectedCase, setSelectedCase] = useState<CaseRecord>(INITIAL_CASES[0])
  const [selectedCaseModalOpen, setSelectedCaseModalOpen] = useState(false)

  // Modals State
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [wellbeingModalOpen, setWellbeingModalOpen] = useState(false)
  const [wellbeingModalTab, setWellbeingModalTab] = useState<'breathing' | 'soundscape' | 'grounding'>('breathing')
  const [sosModalOpen, setSosModalOpen] = useState(false)
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Quick Panic Exit (Redirects immediately for safety)
  const handleQuickExit = () => {
    window.location.href = 'https://www.google.com/search?q=weather+forecast+india'
  }

  // Handle Login
  const handleLoginSuccess = (user: UserProfile, officer?: OfficerProfile | null) => {
    setCurrentUser(user)
    setCurrentOfficer(officer || DEFAULT_OFFICERS[0])
    const isOff = user.role === 'officer' || user.role === 'counsellor' || user.role === 'admin'
    setIsOfficerMode(isOff)
    setActiveTab(isOff ? 'My space' : 'My space')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
  }

  // Dynamic SVI snapshot scores based on selected prototype condition
  const currentSnapshot = useMemo(() => {
    switch (simulatedCondition) {
      case 'Low':
        return {
          svi_score: 24,
          risk_level: 'Low' as RiskLevel,
          title: 'You appear to be in a relatively stable emotional state.',
          message: 'Your baseline stress indicators are within calm parameters. Continue gentle wellness practices to maintain resilience.',
          badge: 'Calm & Stable',
          actionText: 'Continue to Wellbeing Journey'
        }
      case 'Moderate':
        return {
          svi_score: 58,
          risk_level: 'Moderate' as RiskLevel,
          title: 'You may be experiencing moderate levels of stress or distress.',
          message: 'Elevated anxiety patterns detected. A dedicated clinical psychologist has been assigned to assist your emotional wellbeing.',
          badge: 'Moderate Risk',
          actionText: 'View Support Plan'
        }
      case 'High':
      case 'Critical':
      default:
        return {
          svi_score: 84,
          risk_level: 'High' as RiskLevel,
          title: 'You may be experiencing significant emotional distress.',
          message: 'We detected acute distress signals. Both clinical psychological care and rapid emergency protection support have been activated.',
          badge: 'High Risk Alert',
          actionText: 'View Immediate Support Plan'
        }
    }
  }, [simulatedCondition])

  // Handle Story Submission
  const handleStorySubmitted = (newStory: UserStory, metrics?: VoiceAnalysisMetrics) => {
    setStoriesList(prev => [newStory, ...prev])
    setSimulatedCondition(newStory.risk_level)

    // Add activity
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: 'Story added & analyzed',
      description: `"${newStory.title}" safely stored with SVI ${newStory.svi_score}.`,
      timestamp: 'Just now',
      type: 'story'
    }
    setActivitiesList(prev => [newAct, ...prev])

    // If Moderate or High, also create a case in the Officer console queue
    if (newStory.risk_level === 'Moderate' || newStory.risk_level === 'High') {
      const newOfficerCase: CaseRecord = {
        id: `NHAA-2026-${Math.floor(Math.random() * 900 + 9100)}`,
        victim_name: currentUser.full_name,
        initials: currentUser.avatar_initials || 'AS',
        is_anonymous: false,
        contact_number: '+91 97551 12345',
        incident_category: 'Caste-based Discrimination',
        incident_location: {
          village_town_city: 'Dindori Hostel',
          district: 'Dindori',
          state: 'Madhya Pradesh',
          pincode: '481880'
        },
        channel: metrics ? 'mobile_app' : 'integrated_portal',
        language: 'English',
        reported_at: 'Just now',
        narrative_text: newStory.narrative_text,
        voice_analysis: metrics,
        stress_assessment: {
          id: `SA-${Date.now()}`,
          case_id: `NHAA-2026-NEW`,
          svi_score: newStory.svi_score,
          risk_level: newStory.risk_level,
          trauma_score: newStory.risk_level === 'High' ? 82 : 55,
          fear_score: newStory.risk_level === 'High' ? 78 : 50,
          anxiety_score: newStory.risk_level === 'High' ? 85 : 62,
          depression_indicator: true,
          suicidal_ideation_flag: false,
          intimidation_flag: true,
          social_isolation_flag: true,
          speech_stress_detected: !!metrics,
          key_trauma_triggers: newStory.key_triggers || ['intimidation', 'isolation'],
          recommended_actions: [
            'Immediate Clinical Tele-Consultation',
            'District Anti-Discrimination Protection Notice'
          ],
          assessed_at: new Date().toISOString()
        },
        status: newStory.risk_level === 'High' ? 'New Intake' : 'Under Triage',
        assigned_officer: 'Insp. Vikram Pratap Singh',
        assigned_counsellor: 'Dr. Ramesh Chandra',
        priority_tier: newStory.risk_level === 'High' ? 1 : 2,
        notes: [
          {
            id: `N-${Date.now()}`,
            author: 'AI Triage Engine',
            role: 'Automated Assessment',
            timestamp: 'Just now',
            text: `Newly submitted story classified as ${newStory.risk_level} SVI (${newStory.svi_score}).`
          }
        ],
        dispatched_actions: []
      }
      setCasesList(prev => [newOfficerCase, ...prev])
    }
  }

  // Handle Mood Selection
  const handleMoodSelect = (mood: 'Calm' | 'Okay' | 'Stressed' | 'Anxious' | 'Overwhelmed') => {
    setSelectedMood(mood)
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Daily mood recorded: ${mood}`,
      description: mood === 'Calm' || mood === 'Okay' ? 'Relaxed state noted in your daily log.' : 'Grounding suggestions prioritized.',
      timestamp: 'Just now',
      type: 'mood'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  // Handle Appointment Scheduling
  const handleScheduleAppointment = (newApt: AppointmentRecord) => {
    setScheduledAppointments(prev => [newApt, ...prev])
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Consultation confirmed with ${newApt.doctor_name}`,
      description: `${newApt.date} at ${newApt.slot_time} (${newApt.meeting_mode}).`,
      timestamp: 'Just now',
      type: 'appointment'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  // Handle Adding Trusted Contact
  const handleAddContact = (newContact: TrustedContact) => {
    setContactsList(prev => [...prev, newContact])
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Added ${newContact.name} to Support Circle`,
      description: `Relationship: ${newContact.relationship} (${newContact.category}).`,
      timestamp: 'Just now',
      type: 'support'
    }
    setActivitiesList(prev => [newAct, ...prev])
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

  // If user is not logged in, render Login View
  if (!isLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />
  }

  // Victim Navigation items
  const victimNavItems = [
    { label: 'My space' as const, icon: LayoutDashboard, desc: 'Dashboard & Stories' },
    { label: 'My story & Audio' as const, icon: FileText, desc: 'Your Private Submissions' },
    { label: 'Wellbeing journey' as const, icon: HeartHandshake, desc: 'Calming & Care Pathways' },
    { label: 'Support circle' as const, icon: Users, desc: 'Professional & Trusted Allies' }
  ]

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#24433d] font-sans antialiased">
      {/* 1. TOP NATIONAL HELPLINE & PANIC EXIT BANNER */}
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

          {/* Quick Panic Exit Button */}
          <button
            onClick={handleQuickExit}
            className="flex items-center gap-1.5 bg-[#ca4f46] hover:bg-[#b03e36] text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
            title="Quickly close this page and redirect to Google search"
          >
            <ShieldAlert size={13} />
            <span>Quick Panic Exit</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-37px)]">
        {/* ========================================================================= */}
        {/* 2. SIDEBAR NAVIGATION */}
        {/* ========================================================================= */}
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
                  NHAA 14566 Safe Space
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

          {/* Mode Badge in Sidebar */}
          <div className="mt-7 rounded-2xl bg-[#eef6f3] p-2 border border-[#dcebe5]">
            <button
              onClick={() => {
                const nextMode = !isOfficerMode
                setIsOfficerMode(nextMode)
                setActiveTab('My space')
              }}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-[#285750] hover:bg-white transition shadow-xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-white text-[#258b79] shadow-xs">
                  {isOfficerMode ? <ShieldCheck size={14} /> : <UserRound size={14} />}
                </span>
                <span>{isOfficerMode ? 'Officer Console' : 'Victim Support Space'}</span>
              </span>
              <ChevronDown size={13} className="text-[#64847d]" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 flex flex-col gap-1.5 flex-1">
            {!isOfficerMode ? (
              victimNavItems.map(({ label, icon: Icon }) => {
                const isActive = activeTab === label
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setActiveTab(label)
                      setSidebarOpen(false)
                    }}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#e4f1ed] text-[#177967] shadow-xs border border-[#cfe2db]'
                        : 'text-[#647c76] hover:bg-[#f0f5f2] hover:text-[#1e4842]'
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-[#177967]' : 'text-[#7a958e]'} />
                    <span>{label}</span>
                  </button>
                )
              })
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#718f88] uppercase px-2">Operational Views</p>
                <button
                  onClick={() => setOfficerRoleView('psychiatrist')}
                  className={`w-full flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    officerRoleView === 'psychiatrist'
                      ? 'bg-[#e4f1ed] text-[#177967] shadow-xs border border-[#cfe2db]'
                      : 'text-[#647c76] hover:bg-[#f0f5f2]'
                  }`}
                >
                  <Brain size={16} />
                  <span>Psychiatrist Queue</span>
                </button>
                <button
                  onClick={() => setOfficerRoleView('police')}
                  className={`w-full flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    officerRoleView === 'police'
                      ? 'bg-[#fee2e2] text-[#991b1b] shadow-xs border border-[#fca5a5]'
                      : 'text-[#647c76] hover:bg-[#f0f5f2]'
                  }`}
                >
                  <ShieldAlert size={16} />
                  <span>Police Escort Dispatch</span>
                </button>
              </div>
            )}
          </nav>

          {/* Ethical AI Info Card */}
          <div className="mt-auto rounded-2xl border border-[#dfeae5] bg-white p-4 shadow-xs">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-lg bg-[#eaf5f2] text-[#238c7b]">
              <Lock size={15} />
            </div>
            <p className="text-xs font-bold text-[#244b44]">SC/ST PoA Ethical Shield</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#738e88]">
              Zero-knowledge encrypted biometrics and trauma screening protocols.
            </p>
            <button
              onClick={() => setConsentModalOpen(true)}
              className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-[#1c8877] hover:underline cursor-pointer"
            >
              Review Consent Badges <ArrowRight size={12} />
            </button>
          </div>

          {/* User Profile Bar / Logout */}
          <div className="mt-4 pt-3 border-t border-[#e6eee9] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-[#1d8272] text-white font-bold text-xs flex items-center justify-center">
                {currentUser.avatar_initials || 'AS'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1f423d] truncate">{currentUser.full_name}</p>
                <p className="text-[10px] text-[#718b85] capitalize">{isOfficerMode ? 'Nodal Officer' : 'Protected Citizen'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#718b85] hover:text-[#991b1b] hover:bg-[#fee2e2] transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 3. MAIN APPLICATION VIEWPORT */}
        {/* ========================================================================= */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* ======================================================================= */}
          {/* TOP NAVIGATION BAR (As requested in Section 1) */}
          {/* Order: Helpline 14566 | Notifications | SOS Emergency | Calming Audio | Switch to Officer Console */}
          {/* ======================================================================= */}
          <header className="flex h-16 items-center justify-between border-b border-[#e4ede9] bg-white/95 backdrop-blur-md px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                className="text-[#607973] lg:hidden p-1.5 hover:bg-[#edf4f1] rounded-xl"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={21} />
              </button>

              <div className="hidden items-center gap-2 text-xs font-semibold text-[#8ca39d] sm:flex">
                <span>Safe Space</span>
                <span>/</span>
                <span className="text-[#204a43]">{isOfficerMode ? `Officer Console (${officerRoleView})` : activeTab}</span>
              </div>
            </div>

            {/* Top Right Action Items */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 1. Helpline 14566 Button */}
              <a
                href="tel:14566"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eaf6f2] text-[#1d8272] text-xs font-bold hover:bg-[#d8efe8] transition"
              >
                <PhoneCall size={13} />
                <span>Helpline 14566</span>
              </a>

              {/* 2. Notification Button */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex size-9 items-center justify-center rounded-xl border border-[#dbe6e2] text-[#5e7771] hover:bg-[#f2f7f5] transition cursor-pointer"
                title="Triage Notifications"
              >
                <Bell size={16} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e67863] animate-pulse" />
              </button>

              {/* 3. SOS Emergency Button (Prominent soft red/coral styling) */}
              <button
                type="button"
                onClick={() => setSosModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5] px-3 py-1.5 text-xs font-bold transition shadow-xs animate-pulse cursor-pointer"
                title="Emergency SOS Dispatch"
              >
                <AlertTriangle size={14} className="text-[#dc2626]" />
                <span className="hidden xs:inline sm:inline">SOS Emergency</span>
              </button>

              {/* 4. Calming Audio Button (Calming teal/neutral styling) */}
              <button
                type="button"
                onClick={() => {
                  setWellbeingModalTab('soundscape')
                  setWellbeingModalOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#cfe3dc] bg-[#eef8f4] hover:bg-[#dff1ea] text-[#185a4f] px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
                title="Calming Audio Therapy"
              >
                <Headphones size={14} className="text-[#1d8272]" />
                <span className="hidden md:inline">Calming Audio</span>
              </button>

              {/* 5. Switch to Officer Console Button */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isOfficerMode
                  setIsOfficerMode(nextMode)
                  setActiveTab('My space')
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#d6e3df] text-[#1e584f] bg-[#fbfdfc] hover:bg-[#eef5f2] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isOfficerMode ? <UserRound size={14} /> : <ShieldCheck size={14} />}
                <span>{isOfficerMode ? 'Victim Space' : 'Officer Console'}</span>
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
                  <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]">
                    <strong>Psychological Triage:</strong> Dr. Ramesh Chandra is on duty for tele-consultation support.
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#fff2f0] border border-[#fecaca] text-[#991b1b]">
                    <strong>District Patrol:</strong> Special Atrocities Cell nodal desk active in your region.
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* A. VICTIM VIEWS (MY SPACE, MY STORY, WELLBEING JOURNEY, SUPPORT CIRCLE) */}
            {/* ===================================================================== */}
            {!isOfficerMode && (
              <>
                {/* 1. MY SPACE TAB (MAIN DASHBOARD) */}
                {activeTab === 'My space' && (
                  <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
                    {/* Greeting & Subtitle (Large SOS and Calming Audio removed from here) */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                          NHAA Safe Space · Tuesday, 25 August 2026
                        </p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#173a34] sm:text-4xl">
                          Welcome, {currentUser.full_name}
                        </h1>
                        <p className="mt-1.5 text-xs text-[#718d86]">
                          You are in a safe, confidential environment. We are here to listen and help protect you.
                        </p>
                      </div>

                      {/* PROTOTYPE CONDITION SWITCHER (Normal / Moderate / High) */}
                      <div className="rounded-2xl border border-[#cfe2db] bg-[#edf6f2] p-1.5 shadow-xs flex items-center gap-1">
                        <span className="text-[10px] font-bold text-[#456c64] px-2 uppercase">Demo State:</span>
                        {(['Low', 'Moderate', 'High'] as const).map((lvl) => {
                          const isSelected = simulatedCondition === lvl
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSimulatedCondition(lvl)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? lvl === 'Low'
                                    ? 'bg-[#1d8272] text-white shadow-xs'
                                    : lvl === 'Moderate'
                                    ? 'bg-[#f59e0b] text-white shadow-xs'
                                    : 'bg-[#dc2626] text-white shadow-xs'
                                  : 'text-[#50766d] hover:bg-white'
                              }`}
                            >
                              {lvl === 'Low' ? '🟢 Normal' : lvl === 'Moderate' ? '🟡 Moderate' : '🔴 High'}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* SVI Snapshot Card & Wellbeing Journey Quick Card */}
                    <div className="grid gap-6 lg:grid-cols-[1.3fr_.85fr]">
                      {/* Left: Dynamic SVI Snapshot Card */}
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#174840] via-[#1d6b5e] to-[#1e8574] p-6 sm:p-7 text-white shadow-lg flex flex-col justify-between">
                        <div className="relative z-10 flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold tracking-wider text-[#a7e8db] uppercase">
                              AI Stress Vulnerability Snapshot
                            </p>
                            <h2 className="mt-2.5 max-w-sm text-2xl font-bold leading-snug">
                              {currentSnapshot.title}
                            </h2>
                            <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#cdece5]">
                              {currentSnapshot.message}
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
                              <span className="text-3xl font-extrabold">{currentSnapshot.svi_score}</span>
                              <span className="text-xs text-[#a7e8db]">/ 100</span>
                              <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#174840]">
                                {currentSnapshot.badge}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('Wellbeing journey')}
                            className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#185a4f] hover:bg-[#eafaf6] transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{currentSnapshot.actionText}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>

                        <div className="absolute -right-8 -top-10 size-48 rounded-full border-[24px] border-white/10" />
                        <div className="absolute -bottom-16 right-20 size-40 rounded-full border-[20px] border-[#39a896]/30" />
                      </div>

                      {/* Right: Safe Space Reminder & Quick Wellness Tools */}
                      <div className="flex flex-col gap-4">
                        {/* Safe Space Reminder Card */}
                        <div className="rounded-3xl border border-[#d6e5df] bg-white p-5 sm:p-6 shadow-xs">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase">
                            <Lock size={14} />
                            <span>Your Safe Space Reminder</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[#5c7b74]">
                            This is your space. Share only what you&apos;re comfortable sharing. Your healing and protection journey can be taken one gentle step at a time.
                          </p>
                        </div>

                        {/* Quick Wellness Tools */}
                        <div className="rounded-3xl border border-[#d6e5df] bg-white p-5 sm:p-6 shadow-xs flex-1 flex flex-col justify-between">
                          <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">Quick Wellness Tools</p>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setWellbeingModalTab('breathing')
                                setWellbeingModalOpen(true)
                              }}
                              className="p-3 rounded-2xl bg-[#eef7f4] hover:bg-[#dff0eb] text-left border border-[#cbe4db] transition cursor-pointer group"
                            >
                              <Wind size={16} className="text-[#1d8272]" />
                              <p className="text-xs font-bold text-[#184840] mt-1.5">2-Min Breathing</p>
                              <p className="text-[10px] text-[#6d8a83]">Box rhythm reset</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setWellbeingModalTab('grounding')
                                setWellbeingModalOpen(true)
                              }}
                              className="p-3 rounded-2xl bg-[#eef7f4] hover:bg-[#dff0eb] text-left border border-[#cbe4db] transition cursor-pointer group"
                            >
                              <Compass size={16} className="text-[#1d8272]" />
                              <p className="text-xs font-bold text-[#184840] mt-1.5">5-4-3-2-1 Sense</p>
                              <p className="text-[10px] text-[#6d8a83]">Grounding guide</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* REDESIGNED STORY INPUT CARD (Main Focus as requested in Section 4) */}
                    <StoryInputCard
                      onStorySubmitted={handleStorySubmitted}
                      onOpenVoiceModal={() => setVoiceModalOpen(true)}
                    />

                    {/* Daily Check-In & Recent Activity Rows (Section 11) */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Daily Check-In Card */}
                      <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-[#183e38]">How are you feeling right now?</h3>
                            <span className="text-xs font-semibold text-[#1d8272]">Daily Check-in</span>
                          </div>
                          <p className="mt-1 text-xs text-[#6e8e86]">
                            Select a mood to tune your personalized calming suggestions.
                          </p>

                          {/* 5 Mood Options */}
                          <div className="grid grid-cols-5 gap-2 mt-4">
                            {[
                              { label: 'Calm', icon: Smile, color: 'text-[#10b981]', bg: 'bg-[#ecfdf5]' },
                              { label: 'Okay', icon: Meh, color: 'text-[#3b82f6]', bg: 'bg-[#eff6ff]' },
                              { label: 'Stressed', icon: Frown, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
                              { label: 'Anxious', icon: Zap, color: 'text-[#8b5cf6]', bg: 'bg-[#f5f3ff]' },
                              { label: 'Overwhelmed', icon: Waves, color: 'text-[#ef4444]', bg: 'bg-[#fef2f2]' }
                            ].map((item) => {
                              const isCurrent = selectedMood === item.label
                              const Icon = item.icon
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => handleMoodSelect(item.label as any)}
                                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition cursor-pointer border ${
                                    isCurrent
                                      ? `${item.bg} border-[#1d8272] shadow-sm scale-105`
                                      : 'bg-[#fbfcfb] border-[#e2ece8] hover:border-[#b8dad0]'
                                  }`}
                                >
                                  <Icon size={20} className={item.color} />
                                  <span className="text-[11px] font-bold text-[#234842] mt-1">{item.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {selectedMood && (
                          <div className="mt-4 p-3 rounded-2xl bg-[#f0f8f5] border border-[#d2e8e0] text-xs text-[#1e584e]">
                            <strong>Tip:</strong> {selectedMood === 'Calm' ? 'Enjoy your peace of mind.' : 'Try a 2-minute box breathing cycle to release physical tension.'}
                          </div>
                        )}
                      </div>

                      {/* Recent Activity Timeline */}
                      <div className="rounded-3xl border border-[#d6e5df] bg-white p-6 shadow-xs">
                        <h3 className="font-bold text-base text-[#183e38]">Recent Activity</h3>
                        <div className="mt-4 space-y-3">
                          {activitiesList.slice(0, 4).map((act) => (
                            <div key={act.id} className="flex items-start gap-3 text-xs">
                              <span className="size-2 rounded-full bg-[#1d8272] mt-1.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#193e38]">{act.title}</p>
                                <p className="text-[11px] text-[#6d8a83]">{act.description}</p>
                              </div>
                              <span className="text-[10px] text-[#8ea8a2] shrink-0">{act.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MY STORY & AUDIO TAB */}
                {activeTab === 'My story & Audio' && (
                  <MyStoriesView
                    stories={storiesList}
                    onShareAnotherStory={() => setActiveTab('My space')}
                    onViewSupportPlan={(risk) => {
                      setSimulatedCondition(risk)
                      setActiveTab('Wellbeing journey')
                    }}
                  />
                )}

                {/* 3. WELLBEING JOURNEY TAB */}
                {activeTab === 'Wellbeing journey' && (
                  <WellbeingJourneyView
                    currentRiskLevel={simulatedCondition}
                    onScheduleAppointment={handleScheduleAppointment}
                    scheduledAppointments={scheduledAppointments}
                    onTriggerSOS={() => setSosModalOpen(true)}
                    onOpenAudioTools={() => {
                      setWellbeingModalTab('soundscape')
                      setWellbeingModalOpen(true)
                    }}
                  />
                )}

                {/* 4. SUPPORT CIRCLE TAB */}
                {activeTab === 'Support circle' && (
                  <SupportCircleView
                    contacts={contactsList}
                    onAddContact={handleAddContact}
                    onTriggerSOS={() => setSosModalOpen(true)}
                  />
                )}
              </>
            )}

            {/* ===================================================================== */}
            {/* B. OFFICER CONSOLE VIEWS (PSYCHIATRIST & POLICE VIEWS) */}
            {/* ===================================================================== */}
            {isOfficerMode && (
              <div className="mx-auto max-w-[1200px] space-y-8 animate-in fade-in duration-200">
                {/* Officer Header & Role Switcher */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#e2ece7] pb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                      <ShieldCheck size={14} />
                      <span>NHAA 14566 National Triage Network</span>
                    </div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#163a34]">
                      {officerRoleView === 'psychiatrist' ? 'Dr. Ramesh Chandra' : 'Insp. Vikram Pratap Singh'}
                    </h1>
                    <p className="mt-1 text-xs text-[#68857e]">
                      {officerRoleView === 'psychiatrist'
                        ? 'Department: Psychological Triage & Crisis Response · Badge: NHAA-DL-8092'
                        : 'Department: Law Enforcement & Atrocities Protection Liaison · Badge: NHAA-MH-4421'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIntakeModalOpen(true)}
                      className="flex items-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white px-5 py-2.5 text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <ClipboardList size={15} />
                      <span>New 14566 Intake</span>
                    </button>
                  </div>
                </div>

                {/* Switch between Psychiatrist and Police Dashboards */}
                {officerRoleView === 'psychiatrist' ? (
                  <PsychiatristDashboard
                    cases={casesList}
                    scheduledAppointments={scheduledAppointments}
                    onSelectCase={(c) => {
                      setSelectedCase(c)
                      setSelectedCaseModalOpen(true)
                    }}
                    onOpenCaseModal={(c) => {
                      setSelectedCase(c)
                      setSelectedCaseModalOpen(true)
                    }}
                  />
                ) : (
                  <PoliceDashboard
                    cases={casesList}
                    onSelectCase={(c) => {
                      setSelectedCase(c)
                      setSelectedCaseModalOpen(true)
                    }}
                    onOpenCaseModal={(c) => {
                      setSelectedCase(c)
                      setSelectedCaseModalOpen(true)
                    }}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS & POPUPS */}
      {/* ========================================================================= */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onComplete={(metrics) => {
          const newStory: UserStory = {
            id: `STORY-${Date.now().toString().slice(-4)}`,
            title: metrics.transcript.slice(0, 48) + '...',
            narrative_text: metrics.transcript,
            audio_url: 'recorded_voice.webm',
            audio_duration_seconds: metrics.duration_seconds,
            transcript: metrics.transcript,
            language: metrics.language,
            created_at: new Date().toISOString(),
            formatted_time: 'Just now',
            status: metrics.acoustic_distress_score > 70 ? 'Support Plan Available' : 'Under Review',
            risk_level: metrics.acoustic_distress_score > 70 ? 'High' : 'Moderate',
            svi_score: metrics.acoustic_distress_score,
            key_triggers: ['voice distress', 'acoustic tremor']
          }
          handleStorySubmitted(newStory, metrics)
        }}
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
        onComplete={(score) => {
          setSimulatedCondition(score >= 8 ? 'High' : score >= 5 ? 'Moderate' : 'Low')
        }}
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
