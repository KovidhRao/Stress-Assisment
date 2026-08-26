'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  Waves,
  Database
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

import { supabase } from '@/lib/supabase'
import {
  fetchUserProfile,
  fetchCasesFromDb,
  createCaseInDb,
  updateCaseInDb,
  saveAssessmentInDb,
  subscribeToRealtimeCases
} from '@/lib/supabase-service'

import { LoginView } from '@/components/auth/login-view'
import { UserDetailsModal } from '@/components/auth/user-details-modal'
import { SupabaseStatusModal } from '@/components/ui/supabase-status-modal'
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
  // Global Auth & User States — starts on Login Page by default
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [wellbeingModalOpen, setWellbeingModalOpen] = useState(false)
  const [wellbeingModalTab, setWellbeingModalTab] = useState<'breathing' | 'soundscape' | 'grounding'>('breathing')
  const [sosModalOpen, setSosModalOpen] = useState(false)
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // 1. Supabase Session Check on OAuth Redirect & Real-time Listeners
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // Only auto-login if returning from an active OAuth redirect callback (Google)
        const isOAuthRedirect =
          typeof window !== 'undefined' &&
          (window.location.hash.includes('access_token') || window.location.search.includes('code='))

        if (isOAuthRedirect) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && isMounted) {
            const profile = await fetchUserProfile(session.user.id, session.user.email)
            if (profile) {
              setCurrentUser(profile)
              const isOff = profile.role === 'officer' || profile.role === 'counsellor' || profile.role === 'admin'
              setIsOfficerMode(isOff)
              setActiveTab('My space')
              if (!profile.is_profile_complete) {
                setDetailsModalOpen(true)
              }
            } else {
              const meta = session.user.user_metadata ?? {}
              const guessedName =
                meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Citizen User'
              const tempUser: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                full_name: guessedName,
                phone: meta.phone || '',
                role: 'victim',
                is_profile_complete: false,
                avatar_initials: guessedName.slice(0, 2).toUpperCase(),
                created_at: session.user.created_at
              }
              setCurrentUser(tempUser)
              setDetailsModalOpen(true)
            }
            setIsLoggedIn(true)
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        const profile = await fetchUserProfile(session.user.id, session.user.email)
        if (profile) {
          setCurrentUser(profile)
          const isOff = profile.role === 'officer' || profile.role === 'counsellor' || profile.role === 'admin'
          setIsOfficerMode(isOff)
          setActiveTab('My space')
          setIsLoggedIn(true)
          if (!profile.is_profile_complete && !profile.anonymous) {
            setDetailsModalOpen(true)
          }
        }
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setIsLoggedIn(false)
        setIsOfficerMode(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Fetch Cases & Subscribe to Real-time Updates when Logged In
  useEffect(() => {
    if (isLoggedIn) {
      const loadCases = async () => {
        const dbCases = await fetchCasesFromDb()
        if (dbCases && dbCases.length > 0) {
          setCasesList(dbCases)
          setSelectedCase(dbCases[0])
        }
      }
      loadCases()

      const unsubscribe = subscribeToRealtimeCases(
        (newCase) => {
          setCasesList(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)])
        },
        (updatedCase) => {
          setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
          setSelectedCase(prev => prev.id === updatedCase.id ? updatedCase : prev)
        }
      )

      return () => {
        unsubscribe()
      }
    }
  }, [isLoggedIn])

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
    setActiveTab('My space')
    setIsLoggedIn(true)

    if (!user.is_profile_complete && !user.anonymous && user.role === 'victim') {
      setDetailsModalOpen(true)
    }
  }

  const handleProfileSaved = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser)
    setDetailsModalOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentOfficer(null)
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

  // Handle Story Submission (Syncs with Supabase in real-time)
  const handleStorySubmitted = async (newStory: UserStory, metrics?: VoiceAnalysisMetrics) => {
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

    // Generate real case record linked with user's id
    const userSuffix = currentUser.id.slice(-4).toUpperCase()
    const caseId = `NHAA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${userSuffix}`

    const newOfficerCase: CaseRecord = {
      id: caseId,
      victim_name: currentUser.full_name,
      initials: currentUser.avatar_initials || 'AS',
      is_anonymous: !!currentUser.anonymous,
      contact_number: currentUser.phone || '+91 97551 12345',
      incident_category: 'Caste-based Discrimination',
      incident_location: {
        village_town_city: currentUser.village_town_city || currentUser.district || 'District Nodal Center',
        district: currentUser.district || 'Lucknow',
        state: currentUser.state || 'Uttar Pradesh',
        pincode: currentUser.pincode || '226001'
      },
      channel: metrics ? 'mobile_app' : 'integrated_portal',
      language: currentUser.preferred_language || 'English',
      reported_at: 'Just now',
      narrative_text: newStory.narrative_text,
      voice_analysis: metrics,
      stress_assessment: {
        id: `SA-${Date.now()}`,
        case_id: caseId,
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

    // Save to Supabase
    await createCaseInDb(newOfficerCase, currentUser.id)
    await saveAssessmentInDb({
      userId: currentUser.id,
      caseId: caseId,
      narrativeText: newStory.narrative_text,
      sviScore: newStory.svi_score,
      riskLevel: newStory.risk_level,
      fearScore: newStory.risk_level === 'High' ? 78 : 50,
      traumaScore: newStory.risk_level === 'High' ? 82 : 55,
      anxietyScore: newStory.risk_level === 'High' ? 85 : 62,
      voiceMetrics: metrics,
      indicators: newStory.key_triggers,
      recommendations: [
        'Immediate Clinical Tele-Consultation',
        'District Anti-Discrimination Protection Notice'
      ]
    })
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
    updateCaseInDb(updated.id, updated)
  }

  // Handle Adding New Intake
  const handleAddIntake = (newCase: CaseRecord) => {
    setCasesList(prev => [newCase, ...prev])
    setSelectedCase(newCase)
    createCaseInDb(newCase)
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
            <span className="flex size-2 rounded-full bg-[#34d399] animate-ping" />
            <span className="text-[#a7e8db]">NATIONAL HELPLINE 14566</span>
          </div>
          <span className="hidden text-white/50 md:inline">|</span>
          <span className="hidden text-white/80 text-[11px] md:inline">
            Toll-Free Grievance &amp; Psychological Trauma Redressal for SC/ST Communities
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Status Pill */}
          <button
            onClick={() => setSupabaseModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono transition"
            title="View Supabase Realtime Database Status"
          >
            <Database size={11} />
            <span className="hidden sm:inline">Supabase Live</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#12332e] px-2.5 py-1 rounded-lg border border-[#23564e] text-[11px]">
            <Globe size={12} className="text-[#a7e8db]" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              <option value="English" className="bg-[#173f39] text-white">English</option>
              <option value="Hindi" className="bg-[#173f39] text-white">हिंदी (Hindi)</option>
              <option value="Tamil" className="bg-[#173f39] text-white">தமிழ் (Tamil)</option>
              <option value="Telugu" className="bg-[#173f39] text-white">తెలుగు (Telugu)</option>
              <option value="Marathi" className="bg-[#173f39] text-white">मराठी (Marathi)</option>
              <option value="Bengali" className="bg-[#173f39] text-white">বাংলা (Bengali)</option>
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
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#1d8272] text-white shadow-md">
                <Brain size={20} />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-[#163a35]">sahaaya</span>
                <span className="block text-[9px] text-[#718b85] uppercase tracking-wider font-semibold">
                  NHAA 14566 Safe Space
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#607973] hover:text-[#1e4842]"
            >
              <X size={20} />
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

          {/* Current User Pill */}
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
          <header className="flex h-16 items-center justify-between border-b border-[#e4ede9] bg-white/95 backdrop-blur-md px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                className="text-[#607973] lg:hidden p-1.5 hover:bg-[#edf4f1] rounded-xl"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
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

              {/* 3. SOS Emergency Button */}
              <button
                type="button"
                onClick={() => setSosModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5] px-3 py-1.5 text-xs font-bold transition shadow-xs animate-pulse cursor-pointer"
                title="Emergency SOS Dispatch"
              >
                <AlertTriangle size={14} className="text-[#dc2626]" />
                <span className="hidden xs:inline sm:inline">SOS Emergency</span>
              </button>

              {/* 4. Calming Audio Button */}
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

          {/* MAIN SCROLLABLE CONTENT BODY */}
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            {/* Notification Dropdown Panel */}
            {notificationsOpen && (
              <div className="mb-6 mx-auto max-w-[1160px] rounded-2xl border border-[#d6e3df] bg-white p-4 shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-[#e9f0ec] pb-2.5">
                  <span className="text-xs font-bold text-[#1f4740] flex items-center gap-2">
                    <Bell size={14} className="text-[#1d8272]" /> Live Triage Updates
                  </span>
                  <button onClick={() => setNotificationsOpen(false)} className="text-[#718b85] hover:text-[#1f4740]">
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
                    {/* Greeting & Subtitle */}
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
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#a7e8db] uppercase flex items-center gap-1.5">
                              <Sparkles size={14} /> AI Stress Vulnerability Snapshot
                            </span>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                              {currentSnapshot.badge}
                            </span>
                          </div>

                          <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                            {currentSnapshot.title}
                          </h2>
                          <p className="mt-2 text-xs leading-relaxed text-[#d0ede7] max-w-lg">
                            {currentSnapshot.message}
                          </p>
                        </div>

                        <div className="mt-8 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold text-[#a7e8db] uppercase tracking-wider">
                              Stress Vulnerability Index (SVI)
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-4xl font-extrabold">{currentSnapshot.svi_score}</span>
                              <span className="text-sm text-[#a7e8db]">/ 100</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('Wellbeing journey')}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#185a4f] hover:bg-[#eef8f4] transition shadow-xs cursor-pointer"
                          >
                            <span>{currentSnapshot.actionText}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>

                        <div className="absolute -right-8 -top-10 size-48 rounded-full border-[24px] border-white/10 pointer-events-none" />
                      </div>

                      {/* Right: Wellbeing Tracker & Quick Wellness Tools */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">YOUR HEALING JOURNEY</p>
                            <span className="text-xs font-bold text-[#1d8272]">Step 2 of 4 active</span>
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-[#6d8a83]">
                            This is your space. Share only what you're comfortable sharing. Your healing and protection journey can be taken one gentle step at a time.
                          </p>

                          <div className="mt-5 space-y-2">
                            <p className="text-[11px] font-bold text-[#325851] uppercase">Quick Wellness Tools</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setWellbeingModalTab('breathing')
                                  setWellbeingModalOpen(true)
                                }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#eef8f4] hover:bg-[#e0f1eb] text-left text-xs font-semibold text-[#1a5e52] transition cursor-pointer border border-[#d2e8df]"
                              >
                                <Wind size={16} className="text-[#1d8272] shrink-0" />
                                <div>
                                  <span className="block font-bold">2-Min Breathing</span>
                                  <span className="text-[10px] text-[#60857c]">Box rhythm reset</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setWellbeingModalTab('grounding')
                                  setWellbeingModalOpen(true)
                                }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f0f4f8] hover:bg-[#e2ebf3] text-left text-xs font-semibold text-[#294c6e] transition cursor-pointer border border-[#d3e0ec]"
                              >
                                <Compass size={16} className="text-[#3b82f6] shrink-0" />
                                <div>
                                  <span className="block font-bold">5-4-3-2-1 Sense</span>
                                  <span className="text-[10px] text-[#6b8299]">Grounding guide</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-[#edf3f0]">
                          <button
                            type="button"
                            onClick={() => setScreeningModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1d8272] hover:bg-[#186f60] text-white py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Sparkles size={14} />
                            <span>Take Full 2-Minute Stress Assessment</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section: Share Your Story (StoryInputCard) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#173a34]">Share Your Story</h2>
                          <p className="text-xs text-[#6e8a83]">
                            Write or speak openly. Our speech analytics and trauma evaluation engine operates in zero-knowledge mode.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('My story & Audio')}
                          className="text-xs font-bold text-[#1d8272] hover:underline flex items-center gap-1"
                        >
                          <span>View all stories ({storiesList.length})</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <StoryInputCard onStorySubmitted={handleStorySubmitted} />
                    </div>

                    {/* Section: Mood Tracker & Recent Activity Grid */}
                    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                      {/* Left: How are you feeling right now */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#1a3f39]">How are you feeling right now?</h3>
                          <p className="mt-1 text-xs text-[#6f8c85]">
                            Select a mood to tune your personalized calming suggestions.
                          </p>

                          <div className="mt-5 grid grid-cols-5 gap-2">
                            {(
                              [
                                { label: 'Calm', icon: Smile, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                                { label: 'Okay', icon: Smile, color: 'text-teal-600 bg-teal-50 border-teal-200' },
                                { label: 'Stressed', icon: Meh, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                                { label: 'Anxious', icon: Frown, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                                { label: 'Overwhelmed', icon: Zap, color: 'text-rose-600 bg-rose-50 border-rose-200' }
                              ] as const
                            ).map(({ label, icon: MoodIcon, color }) => {
                              const isSelected = selectedMood === label
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => handleMoodSelect(label)}
                                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                                    isSelected
                                      ? `${color} ring-2 ring-[#1d8272] shadow-sm`
                                      : 'border-[#e0ebe6] bg-[#fafcfb] hover:bg-[#edf5f1] text-[#55776f]'
                                  }`}
                                >
                                  <MoodIcon size={22} />
                                  <span className="text-[11px]">{label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="mt-6 p-3 rounded-2xl bg-[#eef8f4] border border-[#cfe3dc] text-xs text-[#1c5f54] flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-[#1d8272] shrink-0" />
                          <span>
                            {selectedMood === 'Calm' || selectedMood === 'Okay'
                              ? 'Your nervous system is in a regulated state. Keep breathing gently.'
                              : 'We recommend trying the 2-minute box breathing or listening to 432 Hz soundscapes.'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Recent Timeline / Activity */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs">
                        <h3 className="text-base font-bold text-[#1a3f39]">Recent Activity</h3>
                        <p className="mt-1 text-xs text-[#6f8c85]">Your private journey logs and milestones.</p>

                        <div className="mt-4 space-y-3">
                          {activitiesList.slice(0, 3).map((act) => (
                            <div
                              key={act.id}
                              className="flex items-start gap-3 p-3 rounded-2xl bg-[#f8fbfa] border border-[#e4eee9]"
                            >
                              <div className="flex size-7 items-center justify-center rounded-xl bg-[#e3f2ed] text-[#1d8272] text-xs font-bold shrink-0 mt-0.5">
                                ✓
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-[#1f4740]">{act.title}</p>
                                  <span className="text-[10px] text-[#7d9992]">{act.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-[#69857e] mt-0.5">{act.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MY STORY & AUDIO TAB */}
                {activeTab === 'My story & Audio' && (
                  <div className="mx-auto max-w-[1160px] animate-in fade-in duration-200">
                    <MyStoriesView
                      stories={storiesList}
                      onShareAnotherStory={() => setActiveTab('My space')}
                      onDeleteStory={(id) => setStoriesList(prev => prev.filter(s => s.id !== id))}
                      onViewSupportPlan={() => setActiveTab('Wellbeing journey')}
                    />
                  </div>
                )}

                {/* 3. WELLBEING JOURNEY TAB */}
                {activeTab === 'Wellbeing journey' && (
                  <div className="mx-auto max-w-[1160px] animate-in fade-in duration-200">
                    <WellbeingJourneyView
                      currentRiskLevel={simulatedCondition}
                      scheduledAppointments={scheduledAppointments}
                      onScheduleAppointment={handleScheduleAppointment}
                      onTriggerSOS={() => setSosModalOpen(true)}
                      onOpenAudioTools={() => {
                        setWellbeingModalTab('soundscape')
                        setWellbeingModalOpen(true)
                      }}
                    />
                  </div>
                )}

                {/* 4. SUPPORT CIRCLE TAB */}
                {activeTab === 'Support circle' && (
                  <div className="mx-auto max-w-[1160px] animate-in fade-in duration-200">
                    <SupportCircleView
                      contacts={contactsList}
                      onAddContact={handleAddContact}
                      onTriggerSOS={() => setSosModalOpen(true)}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===================================================================== */}
            {/* B. OFFICER VIEWS (PSYCHIATRIST QUEUE & POLICE ESCORT DISPATCH) */}
            {/* ===================================================================== */}
            {isOfficerMode && (
              <div className="mx-auto max-w-[1280px] space-y-6 animate-in fade-in duration-200">
                {/* Officer View Switcher Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#dcebe5] shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-2 rounded-full bg-[#10b981]" />
                      <h1 className="text-xl font-bold text-[#163c35]">
                        NHAA Triage Console · {officerRoleView === 'psychiatrist' ? 'Psychiatrist Queue' : 'Police Escort Dispatch'}
                      </h1>
                    </div>
                    <p className="text-xs text-[#708d86] mt-0.5">
                      {officerRoleView === 'psychiatrist'
                        ? 'Department: Psychological Triage & Crisis Response · Badge: NHAA-DL-8092'
                        : 'Department: Law Enforcement & Atrocities Protection Liaison · Badge: NHAA-MH-4421'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOfficerRoleView('psychiatrist')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                        officerRoleView === 'psychiatrist'
                          ? 'bg-[#1d8272] text-white shadow-xs'
                          : 'bg-[#f0f6f3] text-[#456b63] hover:bg-[#e4efe9]'
                      }`}
                    >
                      <Brain size={15} />
                      <span>Psychiatrist View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOfficerRoleView('police')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                        officerRoleView === 'police'
                          ? 'bg-[#dc2626] text-white shadow-xs'
                          : 'bg-[#f0f6f3] text-[#456b63] hover:bg-[#e4efe9]'
                      }`}
                    >
                      <ShieldAlert size={15} />
                      <span>Police Escort View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntakeModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#0f766e] text-white text-xs font-bold shadow-xs hover:bg-[#115e59] transition cursor-pointer ml-2"
                    >
                      <Plus size={15} />
                      <span>New Intake</span>
                    </button>
                  </div>
                </div>

                {/* Render Selected Officer View */}
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

      {/* User Details Onboarding Modal */}
      <UserDetailsModal
        user={currentUser}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onSaved={handleProfileSaved}
        isMandatory={false}
      />

      {/* Supabase Realtime Status Modal */}
      <SupabaseStatusModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onComplete={(metrics: VoiceAnalysisMetrics) => {
          setVoiceModalOpen(false)
          // Add as story
          const story: UserStory = {
            id: `STORY-${Date.now()}`,
            title: 'Audio Testimony Recording',
            narrative_text: metrics.transcript || 'Voice statement recorded via mobile speech analysis.',
            transcript: metrics.transcript,
            audio_url: 'blob:https://sahaaya.nhaa.gov.in/audio/sample',
            audio_duration_seconds: metrics.duration_seconds,
            svi_score: metrics.acoustic_distress_score || 72,
            risk_level: metrics.acoustic_distress_score > 75 ? 'High' : 'Moderate',
            key_triggers: ['Speech Tremor', 'Acoustic Distress'],
            created_at: new Date().toISOString(),
            formatted_time: 'Just now',
            status: metrics.acoustic_distress_score > 75 ? 'Urgent Review' : 'Under Review'
          }
          handleStorySubmitted(story, metrics)
        }}
      />

      {/* Wellbeing Tools Modal */}
      <WellbeingToolsModal
        isOpen={wellbeingModalOpen}
        onClose={() => setWellbeingModalOpen(false)}
        initialTab={wellbeingModalTab}
      />

      {/* Emergency SOS Modal */}
      <SOSModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        complainantName={currentUser.full_name}
      />

      {/* 2-Min Clinical Screening Modal */}
      <ScreeningModal
        isOpen={screeningModalOpen}
        onClose={() => setScreeningModalOpen(false)}
        onComplete={(score) => {
          setScreeningModalOpen(false)
          const lvl: RiskLevel = score > 75 ? 'High' : score > 45 ? 'Moderate' : 'Low'
          setSimulatedCondition(lvl)
        }}
      />

      {/* Informed Consent / Ethical AI Modal */}
      <ConsentModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        onConsentGiven={() => setConsentModalOpen(false)}
      />

      {/* Officer Case Detail Modal */}
      <CaseDetailModal
        caseRecord={selectedCase}
        isOpen={selectedCaseModalOpen}
        onClose={() => setSelectedCaseModalOpen(false)}
        onUpdateCase={handleUpdateCase}
      />

      {/* Officer New 14566 Intake Modal */}
      <IntakeModal
        isOpen={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        onAddCase={handleAddIntake}
      />
    </div>
  )
}
