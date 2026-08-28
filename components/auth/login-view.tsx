'use client'

import React, { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  UserRound, 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  PhoneCall, 
  Eye, 
  EyeOff, 
  Building2,
  FileSearch,
  Send,
  Database,
  MapPin,
  BadgeAlert,
  Globe2,
  Brain,
  Stethoscope
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_OFFICERS } from '@/lib/mock-data'
import { OfficerProfile, PsychiatristProfile, UserProfile } from '@/types'
import { fetchOfficersFromDb, fetchPsychiatristsFromDb, fetchUserProfile, saveUserProfile } from '@/lib/supabase-service'
import { SUPPORTED_LANGUAGES, t } from '@/lib/i18n'

interface LoginViewProps {
  onLoginSuccess: (
    user: UserProfile,
    officer?: OfficerProfile | null,
    psychiatrist?: PsychiatristProfile | null
  ) => void
  onCancel?: () => void
  initialLanguage?: string
  onLanguageChange?: (lang: string) => void
}

export function LoginView({
  onLoginSuccess,
  initialLanguage = 'en',
  onLanguageChange
}: LoginViewProps) {
  const [activeRoleTab, setActiveRoleTab] = useState<'victim' | 'officer' | 'psychiatrist'>('victim')
  const [selectedLang, setSelectedLang] = useState(initialLanguage)
  
  // Real officers & psychiatrists from database
  const [officersList, setOfficersList] = useState<OfficerProfile[]>(DEFAULT_OFFICERS)
  const [psychiatristsList, setPsychiatristsList] = useState<PsychiatristProfile[]>([])

  // Victim form state
  const [victimMode, setVictimMode] = useState<'signin' | 'signup' | 'anonymous' | 'case_track'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [victimDistrict, setVictimDistrict] = useState('Pune')
  const [victimState, setVictimState] = useState('Maharashtra')
  const [trackCaseId, setTrackCaseId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Officer form state
  const [officerBadgeId, setOfficerBadgeId] = useState('')
  const [officerPassword, setOfficerPassword] = useState('')
  const [selectedDemoOfficer, setSelectedDemoOfficer] = useState<OfficerProfile | null>(null)

  // Psychiatrist form state
  const [psychiatristId, setPsychiatristId] = useState('')
  const [psychiatristPassword, setPsychiatristPassword] = useState('')
  const [selectedDemoPsych, setSelectedDemoPsych] = useState<PsychiatristProfile | null>(null)

  // Load real officers & psychiatrists from Supabase
  useEffect(() => {
    fetchOfficersFromDb().then(officers => {
      if (officers && officers.length > 0) setOfficersList(officers)
    })
    fetchPsychiatristsFromDb().then(psychs => {
      if (psychs && psychs.length > 0) setPsychiatristsList(psychs)
    })
  }, [])

  const handleLanguageSelect = (lang: string) => {
    setSelectedLang(lang)
    if (onLanguageChange) onLanguageChange(lang)
  }

  // Finalize Victim Login
  const finalizeUserLogin = async (authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
    let profile = await fetchUserProfile(authUser.id, authUser.email)

    if (!profile) {
      const meta = authUser.user_metadata ?? {}
      const guessedName =
        fullName.trim() ||
        meta.full_name ||
        meta.name ||
        (authUser.email ? authUser.email.split('@')[0] : 'Citizen User')

      const initData: Partial<UserProfile> & { id: string } = {
        id: authUser.id,
        email: authUser.email ?? email,
        full_name: guessedName,
        phone: phone.trim() || meta.phone || '',
        preferred_language: selectedLang,
        district: victimDistrict,
        state: victimState,
        role: 'victim',
        is_profile_complete: false
      }

      const saveRes = await saveUserProfile(initData)
      profile = saveRes.data ?? {
        ...initData,
        avatar_initials: guessedName.slice(0, 2).toUpperCase(),
        created_at: new Date().toISOString()
      } as UserProfile
    }

    onLoginSuccess(profile, null, null)
  }

  // Handle Victim Email / Password Login & Sign Up
  const handleVictimAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (victimMode === 'signup') {
        if (!email || !password) {
          throw new Error('Please provide email and password.')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
              phone: phone.trim() || '',
              role: 'victim'
            }
          }
        })

        if (error) {
          if (error.message.includes('confirm') || error.message.includes('rate limit')) {
            setErrorMsg(`${error.message} (You can also sign in directly if registered).`)
          } else {
            setErrorMsg(error.message)
          }
          return
        }

        if (data.user) {
          setSuccessMsg('Account created successfully!')
          await finalizeUserLogin(data.user)
        }
      } else if (victimMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        })

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMsg('Invalid email or password. Please verify your credentials or register.')
          } else {
            setErrorMsg(error.message || 'Invalid email or password.')
          }
          return
        }

        if (data.user) {
          setSuccessMsg('Signed in successfully!')
          await finalizeUserLogin(data.user)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          scopes: 'openid email profile'
        }
      })
      if (error) {
        setErrorMsg(`Google login failed: ${error.message}`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google OAuth failed'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Anonymous Access
  const handleAnonymousAccess = () => {
    const anonUser: UserProfile = {
      id: `anon-${Date.now().toString().slice(-6)}`,
      full_name: 'Anonymous Citizen',
      role: 'victim',
      preferred_language: selectedLang,
      district: victimDistrict || 'Pune',
      state: victimState || 'Maharashtra',
      anonymous: true,
      is_profile_complete: true,
      avatar_initials: 'AC',
      created_at: new Date().toISOString()
    }
    onLoginSuccess(anonUser, null, null)
  }

  // Handle Case Tracking
  const handleTrackCase = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackCaseId.trim()) {
      setErrorMsg('Please enter a valid Case Reference ID (e.g. NHAA-2026-9041)')
      return
    }
    const trackingUser: UserProfile = {
      id: `track-${Date.now().toString().slice(-6)}`,
      full_name: `Case Inquirer (${trackCaseId.toUpperCase()})`,
      role: 'victim',
      preferred_language: selectedLang,
      is_profile_complete: true,
      avatar_initials: 'CI',
      created_at: new Date().toISOString()
    }
    onLoginSuccess(trackingUser, null, null)
  }

  // Handle Officer Login
  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const cleanInput = officerBadgeId.trim().toLowerCase()
    const targetOfficer = selectedDemoOfficer || officersList.find(
      o => o.officer_badge_id.toLowerCase() === cleanInput ||
           o.email.toLowerCase() === cleanInput ||
           o.full_name.toLowerCase().includes(cleanInput)
    ) || officersList[0]

    setTimeout(() => {
      const officerUser: UserProfile = {
        id: targetOfficer.id,
        email: targetOfficer.email,
        full_name: targetOfficer.full_name,
        role: 'officer',
        state: targetOfficer.assigned_state,
        district: targetOfficer.assigned_district,
        preferred_language: selectedLang,
        is_profile_complete: true,
        avatar_initials: targetOfficer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2),
        created_at: new Date().toISOString()
      }
      onLoginSuccess(officerUser, targetOfficer, null)
      setLoading(false)
    }, 400)
  }

  // Handle Psychiatrist Login
  const handlePsychiatristLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const cleanInput = psychiatristId.trim().toLowerCase()
    const targetPsych = selectedDemoPsych || psychiatristsList.find(
      p => p.id.toLowerCase() === cleanInput ||
           p.email.toLowerCase() === cleanInput ||
           p.full_name.toLowerCase().includes(cleanInput)
    ) || psychiatristsList[0] || {
      id: 'psych-01',
      full_name: 'Dr. Ramesh Chandra',
      title: 'Senior Clinical Psychiatrist',
      specialization: 'Trauma & Psychological Triage',
      hospital_clinic: 'NIMHANS / NHAA Tele-Care',
      assigned_state: 'National',
      assigned_district: 'HQ',
      email: 'dr.ramesh@nhaa.gov.in',
      phone: '+91 98101 23456',
      is_available: true
    }

    setTimeout(() => {
      const psychUser: UserProfile = {
        id: targetPsych.id,
        email: targetPsych.email,
        full_name: targetPsych.full_name,
        role: 'psychiatrist',
        state: targetPsych.assigned_state,
        district: targetPsych.assigned_district,
        preferred_language: selectedLang,
        is_profile_complete: true,
        avatar_initials: targetPsych.full_name.split(' ').map(n => n[0]).join('').slice(0, 2),
        created_at: new Date().toISOString()
      }
      onLoginSuccess(psychUser, null, targetPsych)
      setLoading(false)
    }, 400)
  }

  const selectDemoOfficer = (officer: OfficerProfile) => {
    setSelectedDemoOfficer(officer)
    setOfficerBadgeId(officer.officer_badge_id)
    setOfficerPassword('••••••••••••')
  }

  const selectDemoPsychiatrist = (psych: PsychiatristProfile) => {
    setSelectedDemoPsych(psych)
    setPsychiatristId(psych.full_name)
    setPsychiatristPassword('••••••••••••')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f6] via-[#f7fbf9] to-[#e8f4f0] flex flex-col justify-between p-4 sm:p-6 text-[#163a34]">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1d8272] to-[#12584d] text-white shadow-md shadow-[#1d8272]/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#163a34]">
              {t('app_title', selectedLang)}
            </h1>
            <p className="text-[11px] text-[#557b72] hidden sm:block">
              National Helpline Against Atrocities (PoA) Act Redressal
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2 rounded-2xl bg-white/90 border border-[#cfe3dc] px-3 py-1.5 shadow-sm">
          <Globe2 size={15} className="text-[#1d8272]" />
          <select
            value={selectedLang}
            onChange={e => handleLanguageSelect(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[#163a34] outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.label})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Card */}
      <div className="max-w-4xl w-full mx-auto my-6">
        <div className="rounded-3xl border border-[#cfe3dc] bg-white/95 shadow-xl shadow-[#1d8272]/5 backdrop-blur-md overflow-hidden">
          {/* Role Tabs Header (Citizen vs Police Officer vs Clinical Psychiatrist) */}
          <div className="grid grid-cols-3 border-b border-[#e2ebe7] bg-[#f8fbf9]">
            <button
              onClick={() => {
                setActiveRoleTab('victim')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeRoleTab === 'victim'
                  ? 'border-b-2 border-[#1d8272] bg-white text-[#1d8272]'
                  : 'text-[#64847d] hover:bg-[#f0f6f3]'
              }`}
            >
              <UserRound size={17} />
              <span>{t('role_victim', selectedLang)}</span>
            </button>

            <button
              onClick={() => {
                setActiveRoleTab('officer')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeRoleTab === 'officer'
                  ? 'border-b-2 border-[#dc2626] bg-white text-[#991b1b]'
                  : 'text-[#64847d] hover:bg-[#f0f6f3]'
              }`}
            >
              <ShieldCheck size={17} />
              <span>{t('role_officer', selectedLang)}</span>
            </button>

            <button
              onClick={() => {
                setActiveRoleTab('psychiatrist')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeRoleTab === 'psychiatrist'
                  ? 'border-b-2 border-[#3b82f6] bg-white text-[#1d4ed8]'
                  : 'text-[#64847d] hover:bg-[#f0f6f3]'
              }`}
            >
              <Brain size={17} />
              <span>Clinical Psychiatrist</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-[#fef2f2] border border-[#fecaca] p-3.5 text-xs text-[#991b1b]">
                <AlertCircle size={16} className="shrink-0 text-[#dc2626]" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] p-3.5 text-xs text-[#065f46]">
                <CheckCircle2 size={16} className="shrink-0 text-[#10b981]" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. CITIZEN / VICTIM PORTAL LOGIN */}
            {activeRoleTab === 'victim' && (
              <div className="space-y-6">
                {/* Victim Mode Sub-tabs */}
                <div className="flex flex-wrap gap-2 rounded-2xl bg-[#edf6f2] p-1.5 text-xs font-semibold">
                  <button
                    onClick={() => setVictimMode('signin')}
                    className={`flex-1 rounded-xl py-2 transition cursor-pointer ${
                      victimMode === 'signin' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#50766d]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setVictimMode('signup')}
                    className={`flex-1 rounded-xl py-2 transition cursor-pointer ${
                      victimMode === 'signup' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#50766d]'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => setVictimMode('anonymous')}
                    className={`flex-1 rounded-xl py-2 transition cursor-pointer ${
                      victimMode === 'anonymous' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#50766d]'
                    }`}
                  >
                    Quick Confidential
                  </button>
                  <button
                    onClick={() => setVictimMode('case_track')}
                    className={`flex-1 rounded-xl py-2 transition cursor-pointer ${
                      victimMode === 'case_track' ? 'bg-white text-[#1d8272] shadow-xs' : 'text-[#50766d]'
                    }`}
                  >
                    Track Case
                  </button>
                </div>

                {/* Email / Password Form */}
                {(victimMode === 'signin' || victimMode === 'signup') && (
                  <form onSubmit={handleVictimAuth} className="space-y-4">
                    {victimMode === 'signup' && (
                      <div>
                        <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                          {t('full_name', selectedLang)}
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Your Name (can be an alias)"
                          className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                        />
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                          {t('email_address', selectedLang)}
                        </label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-3 text-[#8ca8a0]" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] pl-10 pr-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <KeyRound size={15} className="absolute left-3.5 top-3 text-[#8ca8a0]" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] pl-10 pr-10 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-[#8ca8a0] hover:text-[#163a34]"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {victimMode === 'signup' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                            {t('district', selectedLang)} (For Nearest Protection Dispatch)
                          </label>
                          <input
                            type="text"
                            value={victimDistrict}
                            onChange={e => setVictimDistrict(e.target.value)}
                            placeholder="e.g. Pune, Khargone, Nagaur"
                            className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                            {t('state', selectedLang)}
                          </label>
                          <input
                            type="text"
                            value={victimState}
                            onChange={e => setVictimState(e.target.value)}
                            placeholder="e.g. Maharashtra, Madhya Pradesh"
                            className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1d8272] hover:bg-[#186f60] text-white py-3 text-xs font-bold shadow-md shadow-[#1d8272]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <span>{loading ? 'Authenticating with NHAA Database...' : victimMode === 'signin' ? 'Sign In to Safe Space' : 'Create Protected Account'}</span>
                      <ArrowRight size={15} />
                    </button>

                    {/* Google OAuth Option */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#cfe2db] bg-white hover:bg-[#f7fbf9] py-2.5 text-xs font-semibold text-[#163a34] transition shadow-xs cursor-pointer"
                      >
                        <svg className="size-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Anonymous Access */}
                {victimMode === 'anonymous' && (
                  <div className="rounded-2xl border border-[#cfe2db] bg-[#f7fbf9] p-6 text-center space-y-4">
                    <ShieldCheck size={36} className="mx-auto text-[#1d8272]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#163a34]">100% Confidential Quick Access</h3>
                      <p className="text-xs text-[#557b72] mt-1 max-w-md mx-auto">
                        No email or personal ID required. Submit your testimony, review AI trauma assessment, and access calming exercises safely.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAnonymousAccess}
                      className="rounded-2xl bg-[#1d8272] text-white px-6 py-2.5 text-xs font-bold shadow-md hover:bg-[#186f60] transition cursor-pointer"
                    >
                      Enter Safe Space Anonymously
                    </button>
                  </div>
                )}

                {/* Track Case */}
                {victimMode === 'case_track' && (
                  <form onSubmit={handleTrackCase} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                        Enter Case Reference Number
                      </label>
                      <input
                        type="text"
                        required
                        value={trackCaseId}
                        onChange={e => setTrackCaseId(e.target.value)}
                        placeholder="e.g. NHAA-2026-9041"
                        className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs font-mono text-[#163a34] outline-none focus:border-[#1d8272] focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-[#1d8272] text-white py-2.5 text-xs font-bold hover:bg-[#186f60] transition cursor-pointer"
                    >
                      Lookup Case Triage &amp; Support Status
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 2. POLICE / SAFETY OFFICER LOGIN */}
            {activeRoleTab === 'officer' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#fca5a5] bg-[#fffbfb] p-4 flex items-center gap-3 text-xs text-[#991b1b]">
                  <BadgeAlert size={20} className="shrink-0 text-[#dc2626]" />
                  <div>
                    <strong>Law Enforcement Liaison &amp; Patrol Console:</strong> Authorized access for designated nodal officers and SC/ST PoA special units.
                  </div>
                </div>

                <form onSubmit={handleOfficerLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                      Officer Badge ID or Official Email
                    </label>
                    <input
                      type="text"
                      required
                      value={officerBadgeId}
                      onChange={e => setOfficerBadgeId(e.target.value)}
                      placeholder="e.g. NHAA-MH-4421 or officer@police.gov.in"
                      className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#dc2626] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                      Security Passcode / Token
                    </label>
                    <input
                      type="password"
                      required
                      value={officerPassword}
                      onChange={e => setOfficerPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#dc2626] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] text-white py-3 text-xs font-bold shadow-md shadow-[#dc2626]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Verifying Credentials...' : 'Access Police Triage Console'}</span>
                    <ArrowRight size={15} />
                  </button>
                </form>

                {/* Quick Officer Demo Profiles */}
                <div className="pt-2 border-t border-[#e8f0ec]">
                  <p className="text-[11px] font-bold text-[#698881] uppercase mb-2">Available Nodal Officers in DB:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {officersList.slice(0, 4).map(off => (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => selectDemoOfficer(off)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          selectedDemoOfficer?.id === off.id
                            ? 'border-[#dc2626] bg-[#fef2f2]'
                            : 'border-[#cfe2db] bg-[#fbfdfc] hover:bg-[#f0f6f3]'
                        }`}
                      >
                        <div className="flex size-7 items-center justify-center rounded-xl bg-[#dc2626] text-white text-xs font-bold shrink-0">
                          {off.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#163a34] truncate">{off.full_name}</p>
                          <p className="text-[10px] text-[#557b72]">{off.assigned_district}, {off.assigned_state}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. CLINICAL PSYCHIATRIST LOGIN */}
            {activeRoleTab === 'psychiatrist' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#bfdbfe] bg-[#f8faff] p-4 flex items-center gap-3 text-xs text-[#1e40af]">
                  <Stethoscope size={20} className="shrink-0 text-[#2563eb]" />
                  <div>
                    <strong>Psychological Triage &amp; Clinical Redressal Portal:</strong> Authorized access for NIMHANS-trained psychiatrists, psychologists, and crisis responders.
                  </div>
                </div>

                <form onSubmit={handlePsychiatristLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                      Clinical Specialist ID or Hospital Email
                    </label>
                    <input
                      type="text"
                      required
                      value={psychiatristId}
                      onChange={e => setPsychiatristId(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Chandra or dr.ramesh@nhaa.gov.in"
                      className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#3b82f6] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#163a34] mb-1.5">
                      Clinical Passcode
                    </label>
                    <input
                      type="password"
                      required
                      value={psychiatristPassword}
                      onChange={e => setPsychiatristPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-2xl border border-[#cfe2db] bg-[#fbfdfc] px-4 py-2.5 text-xs text-[#163a34] outline-none focus:border-[#3b82f6] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 text-xs font-bold shadow-md shadow-[#2563eb]/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Accessing Clinical Records...' : 'Access Psychiatrist Dashboard'}</span>
                    <ArrowRight size={15} />
                  </button>
                </form>

                {/* Quick Psychiatrist Demo Profiles */}
                <div className="pt-2 border-t border-[#e8f0ec]">
                  <p className="text-[11px] font-bold text-[#698881] uppercase mb-2">Available Clinical Psychiatrists:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(psychiatristsList.length > 0 ? psychiatristsList : [
                      {
                        id: 'psych-01',
                        full_name: 'Dr. Ramesh Chandra',
                        title: 'Lead Clinical Psychiatrist',
                        specialization: 'Trauma Triage & Psychological First Aid',
                        hospital_clinic: 'NIMHANS / NHAA Tele-Care',
                        assigned_state: 'National',
                        assigned_district: 'HQ',
                        email: 'dr.ramesh@nhaa.gov.in',
                        phone: '+91 98101 23456',
                        is_available: true
                      }
                    ]).map(psych => (
                      <button
                        key={psych.id}
                        type="button"
                        onClick={() => selectDemoPsychiatrist(psych)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          selectedDemoPsych?.id === psych.id
                            ? 'border-[#2563eb] bg-[#eff6ff]'
                            : 'border-[#cfe2db] bg-[#fbfdfc] hover:bg-[#f0f6f3]'
                        }`}
                      >
                        <div className="flex size-7 items-center justify-center rounded-xl bg-[#2563eb] text-white text-xs font-bold shrink-0">
                          {psych.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#163a34] truncate">{psych.full_name}</p>
                          <p className="text-[10px] text-[#557b72]">{psych.specialization}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#6b8c84] py-2">
        National Helpline Against Atrocities (PoA) 14566 &bull; Ministry of Social Justice &amp; Empowerment
      </footer>
    </div>
  )
}
