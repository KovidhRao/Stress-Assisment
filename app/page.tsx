'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ArrowRight,
  Bell,
  Brain,
  ChevronDown,
  FileText,
  Headphones,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  PhoneCall,
  AlertTriangle,
  LogOut,
  Compass,
  Wind,
  Plus,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Calendar,
  Smile,
  Meh,
  Frown,
  Zap,
  Waves,
  User,
  Settings,
  Globe2,
  Layers,
  MapPin
} from 'lucide-react'

import {
  INITIAL_CASES,
  DEFAULT_OFFICERS,
  INITIAL_CONTACTS,
  INITIAL_ACTIVITIES
} from '@/lib/mock-data'
import {
  CaseRecord,
  OfficerProfile,
  PsychiatristProfile,
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
  fetchOfficersFromDb,
  fetchPsychiatristsFromDb,
  saveUserProfile,
  subscribeToRealtimeCases,
  CaseService,
  AppointmentService
} from '@/lib/supabase-service'
import { SUPPORTED_LANGUAGES, t, normalizeLangCode, translateActivity } from '@/lib/i18n'

import { LoginView } from '@/components/auth/login-view'
import { UserDetailsModal } from '@/components/auth/user-details-modal'
import { ProfileModal } from '@/components/auth/profile-modal'
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
import { DistressSurveyModal } from '@/components/victim/distress-survey-modal'
import { ConsentModal } from '@/components/victim/consent-modal'
import { CaseDetailModal } from '@/components/officer/case-detail-modal'
import { IntakeModal } from '@/components/officer/intake-modal'

export default function Home() {
  // ─── Global Auth & Role State ───────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'usr-default',
    email: 'manashvitha@gmail.com',
    full_name: 'MANASHVITHA P',
    role: 'victim',
    preferred_language: 'te',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    village_town_city: 'Guntur City',
    pincode: '522001',
    avatar_initials: 'MP',
    created_at: new Date().toISOString()
  })

  // Connected professionals
  const [officersList, setOfficersList] = useState<OfficerProfile[]>([])
  const [psychiatristsList, setPsychiatristsList] = useState<PsychiatristProfile[]>([])
  const [currentOfficer, setCurrentOfficer] = useState<OfficerProfile | null>(null)
  const [currentPsychiatrist, setCurrentPsychiatrist] = useState<PsychiatristProfile | null>(null)

  // Navigation & Language
  const [activeTab, setActiveTab] = useState<'My space' | 'My story & Audio' | 'Wellbeing journey' | 'Support circle'>('My space')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('te')

  // ─── Data Collections ───────────────────────────────────────────────────────
  const [casesList, setCasesList] = useState<CaseRecord[]>(INITIAL_CASES)
  const [storiesList, setStoriesList] = useState<UserStory[]>([])
  const [activeCaseId, setActiveCaseId] = useState<string>(INITIAL_CASES[0]?.id || 'NHAA-2026-9041')
  const [contactsList, setContactsList] = useState<TrustedContact[]>(INITIAL_CONTACTS)
  const [scheduledAppointments, setScheduledAppointments] = useState<AppointmentRecord[]>([])
  const [activitiesList, setActivitiesList] = useState<UserActivity[]>(INITIAL_ACTIVITIES)
  const [selectedMood, setSelectedMood] = useState<'Calm' | 'Okay' | 'Stressed' | 'Anxious' | 'Overwhelmed' | null>('Stressed')

  // Selected case for officer review modal
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<CaseRecord>(INITIAL_CASES[0])
  const [selectedCaseModalOpen, setSelectedCaseModalOpen] = useState(false)

  // ─── Modals State ───────────────────────────────────────────────────────────
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [wellbeingModalOpen, setWellbeingModalOpen] = useState(false)
  const [wellbeingModalTab, setWellbeingModalTab] = useState<'breathing' | 'soundscape' | 'grounding'>('breathing')
  const [sosModalOpen, setSosModalOpen] = useState(false)
  const [screeningModalOpen, setScreeningModalOpen] = useState(false)
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [intakeModalOpen, setIntakeModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [preDistressSurveyOpen, setPreDistressSurveyOpen] = useState(false)
  const [postDistressSurveyOpen, setPostDistressSurveyOpen] = useState(false)

  // Quick Panic Exit (Redirects immediately)
  const handleQuickExit = () => {
    window.location.href = 'https://www.google.com/search?q=weather+forecast+india'
  }

  // ─── Load Officers & Psychiatrists on Mount ─────────────────────────────────
  useEffect(() => {
    fetchOfficersFromDb().then(officers => {
      if (officers && officers.length > 0) setOfficersList(officers)
    })
    fetchPsychiatristsFromDb().then(psychs => {
      if (psychs && psychs.length > 0) setPsychiatristsList(psychs)
    })
  }, [])

  // ─── Supabase Session Check on OAuth Redirect & Real-time Listeners ────────
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && isMounted) {
          const profile = await fetchUserProfile(session.user.id, session.user.email)
          if (profile) {
            setCurrentUser(profile)
            if (profile.preferred_language) setSelectedLanguage(normalizeLangCode(profile.preferred_language))
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
      } catch (err) {
        console.error('Session check error:', err)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        const profile = await fetchUserProfile(session.user.id, session.user.email)
        if (profile) {
          setCurrentUser(profile)
          if (profile.preferred_language) setSelectedLanguage(normalizeLangCode(profile.preferred_language))
          setActiveTab('My space')
          setIsLoggedIn(true)
          if (!profile.is_profile_complete && !profile.anonymous) {
            setDetailsModalOpen(true)
          }
        } else {
          // Profile not returned (new OAuth user, trigger delay, etc.)
          const meta = session.user.user_metadata ?? {}
          const guessedName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Citizen User'
          const tempUser: UserProfile = {
            id: session.user.id,
            email: session.user.email,
            full_name: guessedName,
            phone: meta.phone || '',
            role: 'victim',
            preferred_language: 'en',
            is_profile_complete: false,
            avatar_initials: guessedName.slice(0, 2).toUpperCase(),
            created_at: session.user.created_at
          }
          setCurrentUser(tempUser)
          setActiveTab('My space')
          setIsLoggedIn(true)
          setDetailsModalOpen(true)
        }
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setIsLoggedIn(false)
        setCurrentOfficer(null)
        setCurrentPsychiatrist(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ─── Fetch Cases & Realtime Subscription ───────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      const loadData = async () => {
        if (currentUser.role === 'officer') {
          const offCases = await CaseService.fetchOfficerCases(
            currentOfficer?.id,
            currentUser.district || currentOfficer?.assigned_district,
            currentUser.state || currentOfficer?.assigned_state
          )
          if (offCases.length > 0) setCasesList(offCases)
        } else if (currentUser.role === 'psychiatrist') {
          const psychCases = await CaseService.fetchPsychiatristCases(
            currentPsychiatrist?.id,
            currentUser.district
          )
          if (psychCases.length > 0) setCasesList(psychCases)
        } else {
          const userCases = await CaseService.fetchVictimCases(currentUser.id)
          if (userCases && userCases.length > 0) {
            setCasesList(userCases)
            setActiveCaseId(userCases[0].id)
          }
          // Load real stories from Supabase
          const userStories = await CaseService.fetchVictimStories(currentUser.id)
          if (userStories && userStories.length > 0) {
            setStoriesList(userStories)
          }
        }

        const apts = await AppointmentService.fetchAppointments({
          userId: currentUser.role === 'victim' ? currentUser.id : undefined,
          psychiatristId: currentUser.role === 'psychiatrist' ? currentPsychiatrist?.id : undefined
        })
        if (apts && apts.length > 0) setScheduledAppointments(apts)
      }

      loadData()

      const unsubscribe = subscribeToRealtimeCases(
        (newCase) => {
          setCasesList(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)])
        },
        (updatedCase) => {
          setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
        }
      )

      return () => {
        unsubscribe()
      }
    }
  }, [isLoggedIn, currentUser, currentOfficer, currentPsychiatrist])

  // ─── Active Case Computation (Dynamic SVI Snapshot & Dynamic Journey) ──────
  const activeCaseRecord = useMemo<CaseRecord | null>(() => {
    return casesList.find(c => c.id === activeCaseId) || casesList[0] || null
  }, [casesList, activeCaseId])

  const activeRiskLevel = useMemo<RiskLevel>(() => {
    return activeCaseRecord?.stress_assessment?.risk_level || 'Low'
  }, [activeCaseRecord])

  const activeSviScore = useMemo<number>(() => {
    return activeCaseRecord?.stress_assessment?.svi_score ?? 24
  }, [activeCaseRecord])

  // Dynamic SVI snapshot keys for i18n
  const dynamicSnapshotKeys = useMemo(() => {
    if (activeRiskLevel === 'Critical' || activeRiskLevel === 'High') {
      return {
        titleKey: 'snapshot_critical_title',
        descKey: 'snapshot_critical_desc',
        badgeKey: 'badge_critical',
        actionKey: 'action_critical'
      }
    }
    if (activeRiskLevel === 'Moderate') {
      return {
        titleKey: 'snapshot_moderate_title',
        descKey: 'snapshot_moderate_desc',
        badgeKey: 'badge_moderate',
        actionKey: 'action_moderate'
      }
    }
    return {
      titleKey: 'snapshot_normal_title',
      descKey: 'snapshot_normal_desc',
      badgeKey: 'badge_normal',
      actionKey: 'action_normal'
    }
  }, [activeRiskLevel])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleLoginSuccess = (
    user: UserProfile,
    officer?: OfficerProfile | null,
    psychiatrist?: PsychiatristProfile | null
  ) => {
    setCurrentUser(user)
    if (user.preferred_language) {
      setSelectedLanguage(normalizeLangCode(user.preferred_language))
    }

    if (officer) {
      setCurrentOfficer(officer)
    } else if (psychiatrist) {
      setCurrentPsychiatrist(psychiatrist)
    }

    setIsLoggedIn(true)
  }

  const handleProfileUpdated = (updatedUser: UserProfile, updatedOfficer?: OfficerProfile | null) => {
    setCurrentUser(updatedUser)
    if (updatedUser.preferred_language) {
      setSelectedLanguage(normalizeLangCode(updatedUser.preferred_language))
    }
    if (updatedOfficer) {
      setCurrentOfficer(updatedOfficer)
      setOfficersList(prev => prev.map(o => o.id === updatedOfficer.id ? updatedOfficer : o))
    }
  }

  const handleLanguageChange = async (newLang: string) => {
    const norm = normalizeLangCode(newLang)
    setSelectedLanguage(norm)
    if (currentUser && currentUser.id) {
      const updatedUser = { ...currentUser, preferred_language: norm }
      setCurrentUser(updatedUser)
      await saveUserProfile({ id: currentUser.id, preferred_language: norm })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentOfficer(null)
    setCurrentPsychiatrist(null)
    setActiveTab('My space')
  }

  // 1 User -> Many Cases: New Story Submission
  const handleStorySubmitted = async (
    newStory: UserStory,
    metrics?: VoiceAnalysisMetrics,
    generatedCase?: CaseRecord
  ) => {
    setStoriesList(prev => [newStory, ...prev])

    if (generatedCase) {
      setCasesList(prev => [generatedCase, ...prev.filter(c => c.id !== generatedCase.id)])
      setActiveCaseId(generatedCase.id)
    }

    // Log Activity
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Story #${newStory.case_id || newStory.id} Submitted`,
      description: `Classified as ${newStory.risk_level} (SVI ${newStory.svi_score}).`,
      timestamp: 'Just now',
      type: 'story'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  const handleMoodSelect = (mood: 'Calm' | 'Okay' | 'Stressed' | 'Anxious' | 'Overwhelmed') => {
    setSelectedMood(mood)
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Daily mood: ${mood}`,
      description: mood === 'Calm' || mood === 'Okay' ? 'Relaxed state noted.' : 'Grounding suggestions prioritized.',
      timestamp: 'Just now',
      type: 'mood'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  const handleScheduleAppointment = (newApt: AppointmentRecord) => {
    setScheduledAppointments(prev => [newApt, ...prev])
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Consultation Booked with ${newApt.doctor_name}`,
      description: `${newApt.date} at ${newApt.slot_time} (${newApt.meeting_mode}).`,
      timestamp: 'Just now',
      type: 'appointment'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  const handleAddContact = (newContact: TrustedContact) => {
    setContactsList(prev => [...prev, newContact])
    const newAct: UserActivity = {
      id: `ACT-${Date.now()}`,
      title: `Added ${newContact.name} to Support Circle`,
      description: `Relationship: ${newContact.relationship}.`,
      timestamp: 'Just now',
      type: 'support'
    }
    setActivitiesList(prev => [newAct, ...prev])
  }

  const handleUpdateCase = (updated: CaseRecord) => {
    setCasesList(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelectedCaseForModal(updated)
    CaseService.updateCase(updated.id, updated)
  }

  const handleAddIntake = (newCase: CaseRecord) => {
    setCasesList(prev => [newCase, ...prev])
    setSelectedCaseForModal(newCase)
  }

  // ─── If not logged in, render Login View ────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        initialLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
      />
    )
  }

  // Victim Navigation items with dynamic translations
  const victimNavItems = [
    { label: 'My space' as const, key: 'tab_my_space', icon: LayoutDashboard, desc: 'Dashboard & SVI' },
    { label: 'My story & Audio' as const, key: 'tab_my_story', icon: FileText, desc: 'Your Case Dossier' },
    { label: 'Wellbeing journey' as const, key: 'tab_wellbeing', icon: HeartHandshake, desc: 'Calming & Care Pathways' },
    { label: 'Support circle' as const, key: 'tab_support_circle', icon: Users, desc: 'Professional & Trusted Allies' }
  ]

  const isOfficer = currentUser.role === 'officer'
  const isPsychiatrist = currentUser.role === 'psychiatrist' || currentUser.role === 'counsellor'

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#24433d] font-sans antialiased">
      {/* 1. TOP NATIONAL HELPLINE & PANIC EXIT BANNER */}
      <header className="bg-[#173f39] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#23564e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-tight">
            <span className="flex size-2 rounded-full bg-[#34d399] animate-ping" />
            <span className="text-[#a7e8db]">{t('helpline_top_banner', selectedLanguage)}</span>
          </div>
          <span className="hidden text-white/50 md:inline">|</span>
          <span className="hidden text-white/80 text-[11px] md:inline">
            {t('helpline_top_desc', selectedLanguage)}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Panic Exit Button */}
          <button
            onClick={handleQuickExit}
            className="flex items-center gap-1.5 bg-[#ca4f46] hover:bg-[#b03e36] text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
            title="Quickly close this page and redirect to Google search"
          >
            <ShieldAlert size={13} />
            <span>{t('quick_panic_exit', selectedLanguage)}</span>
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

          {/* Role Status Badge in Sidebar */}
          <div className="mt-7 rounded-2xl bg-[#eef6f3] p-2.5 border border-[#dcebe5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-white text-[#258b79] shadow-xs">
                {isOfficer ? <ShieldAlert size={15} /> : isPsychiatrist ? <Brain size={15} /> : <UserRound size={15} />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#163a34] capitalize">
                  {isOfficer ? t('portal_officer', selectedLanguage) : isPsychiatrist ? t('portal_psychiatrist', selectedLanguage) : t('portal_citizen', selectedLanguage)}
                </p>
                <p className="text-[10px] text-[#5c8077]">
                  {isOfficer ? (currentOfficer?.assigned_district || 'District Police') : isPsychiatrist ? 'NIMHANS Triage' : t('role_victim', selectedLanguage)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items (Role Determined) */}
          <nav className="mt-6 flex flex-col gap-1.5 flex-1">
            {!isOfficer && !isPsychiatrist ? (
              victimNavItems.map(({ label, key, icon: Icon }) => {
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
                    <span>{t(key, selectedLanguage)}</span>
                  </button>
                )
              })
            ) : isOfficer ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#718f88] uppercase px-2">{t('portal_officer', selectedLanguage)}</p>
                <div className="p-3 rounded-2xl bg-[#fef2f2] border border-[#fecaca] text-xs font-bold text-[#991b1b] flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span>Police Escort Dispatch</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[#718f88] uppercase px-2">{t('portal_psychiatrist', selectedLanguage)}</p>
                <div className="p-3 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-xs font-bold text-[#1d4ed8] flex items-center gap-2">
                  <Brain size={16} />
                  <span>{t('portal_psychiatrist', selectedLanguage)}</span>
                </div>
              </div>
            )}
          </nav>

          {/* Profile Quick Button */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="mb-3 flex items-center justify-between rounded-2xl border border-[#cfe2db] bg-[#edf7f3] p-3 text-left transition hover:bg-[#e2f1ec] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-xl bg-[#1d8272] text-white text-xs font-bold">
                {currentUser.avatar_initials || 'CU'}
              </div>
              <div>
                <p className="text-xs font-bold text-[#163a34] truncate max-w-[110px]">{currentUser.full_name}</p>
                <p className="text-[10px] text-[#557b72]">{t('profile', selectedLanguage)} &amp; Settings</p>
              </div>
            </div>
            <Settings size={14} className="text-[#1d8272]" />
          </button>

          {/* Ethical AI Info Card */}
          <div className="rounded-2xl border border-[#dfeae5] bg-white p-4 shadow-xs">
            <div className="mb-2.5 flex size-8 items-center justify-center rounded-lg bg-[#eaf5f2] text-[#238c7b]">
              <Lock size={15} />
            </div>
            <p className="text-xs font-bold text-[#244b44]">{t('ethical_shield_title', selectedLanguage)}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#738e88]">
              {t('ethical_shield_desc', selectedLanguage)}
            </p>
            <button
              onClick={() => setConsentModalOpen(true)}
              className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-[#1c8877] hover:underline cursor-pointer"
            >
              {t('review_consent_badges', selectedLanguage)} <ArrowRight size={12} />
            </button>
          </div>

          {/* Current User Pill */}
          <div className="mt-4 pt-3 border-t border-[#e6eee9] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-[#1d8272] text-white font-bold text-xs flex items-center justify-center">
                {currentUser.avatar_initials || 'CU'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1f423d] truncate">{currentUser.full_name}</p>
                <p className="text-[10px] text-[#718b85] capitalize">{t(`role_${currentUser.role}`, selectedLanguage) || currentUser.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#718b85] hover:text-[#991b1b] hover:bg-[#fee2e2] transition cursor-pointer"
              title={t('logout', selectedLanguage)}
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
                <span className="text-[#204a43]">
                  {isOfficer ? t('portal_officer', selectedLanguage) : isPsychiatrist ? t('portal_psychiatrist', selectedLanguage) : (activeTab === 'My story & Audio' ? t('tab_my_story', selectedLanguage) : activeTab === 'Wellbeing journey' ? t('tab_wellbeing', selectedLanguage) : activeTab === 'Support circle' ? t('tab_support_circle', selectedLanguage) : t('tab_my_space', selectedLanguage))}
                </span>
              </div>
            </div>

            {/* Top Right Action Items */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-1.5 rounded-xl bg-white border border-[#cfe3dc] px-2.5 py-1 text-xs shadow-xs">
                <Globe2 size={14} className="text-[#1d8272]" />
                <select
                  value={selectedLanguage}
                  onChange={e => handleLanguageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#163a34] outline-none cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile Button */}
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[#cfe2db] bg-[#f7fbf9] px-3 py-1.5 text-xs font-bold text-[#163a34] hover:bg-[#eef7f3] transition shadow-xs cursor-pointer"
              >
                <User size={14} className="text-[#1d8272]" />
                <span className="hidden sm:inline">{t('profile', selectedLanguage)}</span>
              </button>

              {/* Helpline 14566 Button */}
              <a
                href="tel:14566"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eaf6f2] text-[#1d8272] text-xs font-bold hover:bg-[#d8efe8] transition"
              >
                <PhoneCall size={13} />
                <span>{t('helpline_btn', selectedLanguage)}</span>
              </a>

              {/* Calming Audio Button */}
              <button
                type="button"
                onClick={() => {
                  setWellbeingModalTab('soundscape')
                  setWellbeingModalOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#cfe3dc] bg-[#eef8f4] hover:bg-[#dff1ea] text-[#185a4f] px-3 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
                title={t('calming_audio', selectedLanguage)}
              >
                <Headphones size={14} className="text-[#1d8272]" />
                <span className="hidden md:inline">{t('calming_audio', selectedLanguage)}</span>
              </button>

              {/* SOS Emergency Button */}
              <button
                type="button"
                onClick={() => setSosModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] border border-[#fca5a5] px-3 py-1.5 text-xs font-bold transition shadow-xs animate-pulse cursor-pointer"
                title={t('emergency_sos_btn', selectedLanguage)}
              >
                <AlertTriangle size={14} className="text-[#dc2626]" />
                <span className="hidden xs:inline sm:inline">{t('emergency_sos_btn', selectedLanguage)}</span>
              </button>
            </div>
          </header>

          {/* MAIN SCROLLABLE CONTENT BODY */}
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            {/* ===================================================================== */}
            {/* A. VICTIM VIEWS (MY SPACE, MY STORY, WELLBEING JOURNEY, SUPPORT CIRCLE) */}
            {/* ===================================================================== */}
            {!isOfficer && !isPsychiatrist && (
              <>
                {/* 1. MY SPACE TAB (MAIN DASHBOARD) */}
                {activeTab === 'My space' && (
                  <div className="mx-auto max-w-[1160px] space-y-8 animate-in fade-in duration-200">
                    {/* Greeting & Subtitle */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-xs font-bold text-[#1d8272] uppercase tracking-wider">
                          NHAA Safe Space &bull; {t('active_jurisdiction', selectedLanguage)} {currentUser.district || 'Pune'}, {currentUser.state || 'Maharashtra'}
                        </p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#173a34] sm:text-4xl">
                          {t('welcome_user', selectedLanguage)}, {currentUser.full_name}
                        </h1>
                        <p className="mt-1.5 text-xs text-[#718d86]">
                          {t('safe_space_subtitle', selectedLanguage)}
                        </p>
                      </div>

                      {/* Active Case Selector (if multiple cases exist) */}
                      {casesList.length > 1 && (
                        <div className="rounded-2xl border border-[#cfe2db] bg-white p-2 shadow-xs flex items-center gap-2">
                          <Layers size={15} className="text-[#1d8272]" />
                          <span className="text-xs font-bold text-[#163a34]">{t('viewing_case', selectedLanguage)}</span>
                          <select
                            value={activeCaseId}
                            onChange={e => setActiveCaseId(e.target.value)}
                            className="bg-[#f0f9f6] text-xs font-mono font-bold text-[#1d8272] px-2.5 py-1 rounded-xl outline-none border border-[#cfe2db] cursor-pointer"
                          >
                            {casesList.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.id} ({c.stress_assessment.risk_level} Risk)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* SVI Snapshot Card & Wellbeing Journey Quick Card */}
                    <div className="grid gap-6 lg:grid-cols-[1.3fr_.85fr]">
                      {/* Left: Dynamic SVI Snapshot Card */}
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#174840] via-[#1d6b5e] to-[#1e8574] p-6 sm:p-7 text-white shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wider text-[#a7e8db] uppercase flex items-center gap-1.5">
                              <Sparkles size={14} /> {t('svi_snapshot_title', selectedLanguage)}
                            </span>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                              {t(dynamicSnapshotKeys.badgeKey, selectedLanguage)}
                            </span>
                          </div>

                          <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                            {t(dynamicSnapshotKeys.titleKey, selectedLanguage)}
                          </h2>
                          <p className="mt-2 text-xs leading-relaxed text-[#d0ede7] max-w-lg">
                            {t(dynamicSnapshotKeys.descKey, selectedLanguage)}
                          </p>
                        </div>

                        <div className="mt-8 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold text-[#a7e8db] uppercase tracking-wider">
                              {t('svi_score_full', selectedLanguage)}
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-4xl font-extrabold">{activeSviScore}</span>
                              <span className="text-sm text-[#a7e8db]">/ 100</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('Wellbeing journey')}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#185a4f] hover:bg-[#eef8f4] transition shadow-xs cursor-pointer"
                          >
                            <span>{t(dynamicSnapshotKeys.actionKey, selectedLanguage)}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>

                        <div className="absolute -right-8 -top-10 size-48 rounded-full border-[24px] border-white/10 pointer-events-none" />
                      </div>

                      {/* Right: Wellbeing Tracker & Quick Wellness Tools */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold tracking-wider text-[#698881] uppercase">{t('healing_journey_card_title', selectedLanguage)}</p>
                            <span className="text-xs font-bold text-[#1d8272]">Case #{activeCaseRecord?.id || 'Active'}</span>
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-[#6d8a83]">
                            {t('healing_journey_card_desc', selectedLanguage)}
                          </p>

                          <div className="mt-5 space-y-2">
                            <p className="text-[11px] font-bold text-[#325851] uppercase">{t('quick_wellness_tools', selectedLanguage)}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setWellbeingModalTab('breathing')
                                  if (activeCaseRecord) {
                                    setPreDistressSurveyOpen(true)
                                  } else {
                                    setWellbeingModalOpen(true)
                                  }
                                }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#eef8f4] hover:bg-[#e0f1eb] text-left text-xs font-semibold text-[#1a5e52] transition cursor-pointer border border-[#d2e8df]"
                              >
                                <Wind size={16} className="text-[#1d8272] shrink-0" />
                                <div>
                                  <span className="block font-bold">{t('tool_box_breathing', selectedLanguage)}</span>
                                  <span className="text-[10px] text-[#60857c]">{t('tool_box_desc', selectedLanguage)}</span>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setWellbeingModalTab('grounding')
                                  if (activeCaseRecord) {
                                    setPreDistressSurveyOpen(true)
                                  } else {
                                    setWellbeingModalOpen(true)
                                  }
                                }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f0f4f8] hover:bg-[#e2ebf3] text-left text-xs font-semibold text-[#294c6e] transition cursor-pointer border border-[#d3e0ec]"
                              >
                                <Compass size={16} className="text-[#3b82f6] shrink-0" />
                                <div>
                                  <span className="block font-bold">{t('tool_grounding', selectedLanguage)}</span>
                                  <span className="text-[10px] text-[#6b8299]">{t('tool_grounding_desc', selectedLanguage)}</span>
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
                            <span>{t('take_full_assessment', selectedLanguage)}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section: Share Your Story (StoryInputCard) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-[#173a34]">
                            {t('share_story_title', selectedLanguage)}
                          </h2>
                          <p className="text-xs text-[#6e8a83]">
                            {t('share_story_subtitle', selectedLanguage)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('My story & Audio')}
                          className="text-xs font-bold text-[#1d8272] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{t('tab_my_story', selectedLanguage)} ({storiesList.length})</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>

                      <StoryInputCard
                        currentUser={currentUser}
                        officersList={officersList}
                        psychiatristsList={psychiatristsList}
                        currentLanguage={selectedLanguage}
                        onStorySubmitted={handleStorySubmitted}
                        onOpenVoiceModal={() => setVoiceModalOpen(true)}
                      />
                    </div>

                    {/* Section: Mood Tracker & Recent Activity Grid */}
                    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                      {/* Left: How are you feeling right now */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-bold text-[#1a3f39]">{t('mood_question', selectedLanguage)}</h3>
                          <p className="mt-1 text-xs text-[#6f8c85]">
                            {t('mood_subtitle', selectedLanguage)}
                          </p>

                          <div className="mt-5 grid grid-cols-5 gap-2">
                            {(
                              [
                                { label: 'Calm', key: 'mood_calm', icon: Smile, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                                { label: 'Okay', key: 'mood_okay', icon: Smile, color: 'text-teal-600 bg-teal-50 border-teal-200' },
                                { label: 'Stressed', key: 'mood_stressed', icon: Meh, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                                { label: 'Anxious', key: 'mood_anxious', icon: Frown, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                                { label: 'Overwhelmed', key: 'mood_overwhelmed', icon: Zap, color: 'text-rose-600 bg-rose-50 border-rose-200' }
                              ] as const
                            ).map(({ label, key, icon: MoodIcon, color }) => {
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
                                  <span className="text-[11px]">{t(key, selectedLanguage)}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="mt-6 p-3 rounded-2xl bg-[#eef8f4] border border-[#cfe3dc] text-xs text-[#1c5f54] flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-[#1d8272] shrink-0" />
                          <span>
                            {selectedMood === 'Calm' || selectedMood === 'Okay'
                              ? t('mood_msg_calm', selectedLanguage)
                              : t('mood_msg_stressed', selectedLanguage)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Recent Timeline / Activity */}
                      <div className="rounded-3xl border border-[#dcebe5] bg-white p-6 shadow-xs">
                        <h3 className="text-base font-bold text-[#1a3f39]">{t('recent_activity', selectedLanguage)}</h3>
                        <p className="mt-1 text-xs text-[#6f8c85]">{t('recent_activity_desc', selectedLanguage)}</p>

                        <div className="mt-4 space-y-3">
                          {activitiesList.slice(0, 3).map((rawAct) => {
                            const act = translateActivity(rawAct, selectedLanguage)
                            return (
                              <div
                                key={rawAct.id}
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
                            )
                          })}
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
                      activeStoryId={activeCaseRecord ? `STORY-${activeCaseRecord.id}` : undefined}
                      currentLanguage={selectedLanguage}
                      onSelectActiveStory={(story) => {
                        if (story.case_id) setActiveCaseId(story.case_id)
                      }}
                      onShareAnotherStory={() => setActiveTab('My space')}
                      onDeleteStory={(id) => setStoriesList(prev => prev.filter(s => s.id !== id))}
                      onViewSupportPlan={(risk, caseId) => {
                        if (caseId) setActiveCaseId(caseId)
                        setActiveTab('Wellbeing journey')
                      }}
                    />
                  </div>
                )}

                {/* 3. WELLBEING JOURNEY TAB */}
                {activeTab === 'Wellbeing journey' && (
                  <div className="mx-auto max-w-[1160px] animate-in fade-in duration-200">
                    <WellbeingJourneyView
                      currentRiskLevel={activeRiskLevel}
                      activeCase={activeCaseRecord}
                      currentUser={currentUser}
                      currentLanguage={selectedLanguage}
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
                      currentLanguage={selectedLanguage}
                      onAddContact={handleAddContact}
                      onTriggerSOS={() => setSosModalOpen(true)}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===================================================================== */}
            {/* B. POLICE OFFICER PORTAL */}
            {/* ===================================================================== */}
            {isOfficer && (
              <div className="mx-auto max-w-[1280px] space-y-6 animate-in fade-in duration-200">
                <PoliceDashboard
                  cases={casesList}
                  currentOfficer={currentOfficer}
                  currentLanguage={selectedLanguage}
                  onSelectCase={(c) => {
                    setSelectedCaseForModal(c)
                    setSelectedCaseModalOpen(true)
                  }}
                  onOpenCaseModal={(c) => {
                    setSelectedCaseForModal(c)
                    setSelectedCaseModalOpen(true)
                  }}
                />
              </div>
            )}

            {/* ===================================================================== */}
            {/* C. PSYCHIATRIST PORTAL */}
            {/* ===================================================================== */}
            {isPsychiatrist && (
              <div className="mx-auto max-w-[1280px] space-y-6 animate-in fade-in duration-200">
                <PsychiatristDashboard
                  cases={casesList}
                  scheduledAppointments={scheduledAppointments}
                  currentOfficer={currentOfficer}
                  currentLanguage={selectedLanguage}
                  onSelectCase={(c) => {
                    setSelectedCaseForModal(c)
                    setSelectedCaseModalOpen(true)
                  }}
                  onOpenCaseModal={(c) => {
                    setSelectedCaseForModal(c)
                    setSelectedCaseModalOpen(true)
                  }}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS & POPUPS */}
      {/* ========================================================================= */}

      {/* User Profile View & Edit Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={currentUser}
        officer={currentOfficer}
        currentLanguage={selectedLanguage}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* User Details Onboarding Modal */}
      <UserDetailsModal
        user={currentUser}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onSaved={(u) => handleProfileUpdated(u, null)}
        isMandatory={false}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onComplete={(metrics: VoiceAnalysisMetrics) => {
          setVoiceModalOpen(false)
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
        language={selectedLanguage}
      />

      {/* Wellbeing Tools Modal */}
      <WellbeingToolsModal
        isOpen={wellbeingModalOpen}
        onClose={() => setWellbeingModalOpen(false)}
        onCloseWithSurvey={() => {
          setWellbeingModalOpen(false)
          if (activeCaseRecord && !isOfficer && !isPsychiatrist) {
            setPostDistressSurveyOpen(true)
          }
        }}
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
          if (activeCaseRecord) {
            const updatedRisk: RiskLevel = score > 75 ? 'High' : score > 45 ? 'Moderate' : 'Low'
            const updatedCase: CaseRecord = {
              ...activeCaseRecord,
              stress_assessment: {
                ...activeCaseRecord.stress_assessment,
                svi_score: score,
                risk_level: updatedRisk
              }
            }
            handleUpdateCase(updatedCase)
          }
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
        caseRecord={selectedCaseForModal}
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

      {/* Pre/Post Distress Survey Modals */}
      {!isOfficer && !isPsychiatrist && activeCaseRecord && (
        <>
          <DistressSurveyModal
            isOpen={preDistressSurveyOpen}
            onClose={() => setPreDistressSurveyOpen(false)}
            surveyType="pre_intervention"
            caseId={activeCaseRecord.id}
            userId={currentUser.id}
            onComplete={() => {
              setPreDistressSurveyOpen(false)
              setWellbeingModalOpen(true)
            }}
          />
          <DistressSurveyModal
            isOpen={postDistressSurveyOpen}
            onClose={() => setPostDistressSurveyOpen(false)}
            surveyType="post_intervention"
            caseId={activeCaseRecord.id}
            userId={currentUser.id}
          />
        </>
      )}
    </div>
  )
}
