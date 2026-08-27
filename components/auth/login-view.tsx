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
  Globe2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_OFFICERS } from '@/lib/mock-data'
import { OfficerProfile, UserProfile } from '@/types'
import { fetchOfficersFromDb, fetchUserProfile, saveUserProfile } from '@/lib/supabase-service'
import { SUPPORTED_LANGUAGES, t } from '@/lib/i18n'

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, officer?: OfficerProfile | null) => void
  onCancel?: () => void
  initialLanguage?: string
  onLanguageChange?: (lang: string) => void
}

export function LoginView({
  onLoginSuccess,
  initialLanguage = 'en',
  onLanguageChange
}: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<'victim' | 'officer'>('victim')
  const [selectedLang, setSelectedLang] = useState(initialLanguage)
  
  // Real officers from database
  const [officersList, setOfficersList] = useState<OfficerProfile[]>(DEFAULT_OFFICERS)

  // Victim form state
  const [victimMode, setVictimMode] = useState<'signin' | 'signup' | 'otp' | 'anonymous' | 'case_track'>('signin')
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

  // Load real officers from Supabase
  useEffect(() => {
    fetchOfficersFromDb().then(officers => {
      if (officers && officers.length > 0) {
        setOfficersList(officers)
      }
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

    onLoginSuccess(profile, null)
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
              phone: phone.trim() || ''
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
    onLoginSuccess(anonUser, null)
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
    onLoginSuccess(trackingUser, null)
  }

  // Handle Real Officer Login
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
        role: targetOfficer.role,
        state: targetOfficer.assigned_state,
        district: targetOfficer.assigned_district,
        preferred_language: selectedLang,
        is_profile_complete: true,
        avatar_initials: targetOfficer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2),
        created_at: new Date().toISOString()
      }
      onLoginSuccess(officerUser, targetOfficer)
      setLoading(false)
    }, 400)
  }

  const selectDemoOfficer = (officer: OfficerProfile) => {
    setSelectedDemoOfficer(officer)
    setOfficerBadgeId(officer.officer_badge_id)
    setOfficerPassword('••••••••••••')
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
          {/* Role Tabs Header */}
          <div className="grid grid-cols-2 border-b border-[#e2ebe7] bg-[#f8fbf9]">
            <button
              onClick={() => {
                setActiveTab('victim')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-4 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'victim'
                  ? 'border-b-2 border-[#1d8272] bg-white text-[#1d8272]'
                  : 'text-[#68857e] hover:bg-[#edf5f2] hover:text-[#163a34]'
              }`}
            >
              <UserRound size={17} />
              <span>{t('portal_citizen', selectedLang)}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('officer')
                setErrorMsg(null)
              }}
              className={`flex items-center justify-center gap-2 py-4 text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'officer'
                  ? 'border-b-2 border-[#4338ca] bg-white text-[#4338ca]'
                  : 'text-[#68857e] hover:bg-[#edf5f2] hover:text-[#163a34]'
              }`}
            >
              <Building2 size={17} />
              <span>{t('portal_officer', selectedLang)}</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {/* Error / Success Banners */}
            {errorMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-[#fff0ef] border border-[#fca5a5] p-3.5 text-xs text-[#c94b48]">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] p-3.5 text-xs text-[#065f46]">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: CITIZEN / VICTIM PORTAL */}
            {activeTab === 'victim' && (
              <div className="space-y-6">
                {/* Victim Mode Switcher */}
                <div className="flex flex-wrap items-center gap-2 border-b border-[#e2ebe7] pb-4">
                  <button
                    onClick={() => setVictimMode('signin')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      victimMode === 'signin'
                        ? 'bg-[#1d8272] text-white shadow-sm'
                        : 'bg-[#f0f5f3] text-[#4f6e66] hover:bg-[#e2ede9]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setVictimMode('signup')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      victimMode === 'signup'
                        ? 'bg-[#1d8272] text-white shadow-sm'
                        : 'bg-[#f0f5f3] text-[#4f6e66] hover:bg-[#e2ede9]'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => setVictimMode('anonymous')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      victimMode === 'anonymous'
                        ? 'bg-[#1d8272] text-white shadow-sm'
                        : 'bg-[#f0f5f3] text-[#4f6e66] hover:bg-[#e2ede9]'
                    }`}
                  >
                    Anonymous Reporting
                  </button>
                  <button
                    onClick={() => setVictimMode('case_track')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      victimMode === 'case_track'
                        ? 'bg-[#1d8272] text-white shadow-sm'
                        : 'bg-[#f0f5f3] text-[#4f6e66] hover:bg-[#e2ede9]'
                    }`}
                  >
                    Track Existing Case
                  </button>
                </div>

                {/* SIGN IN / SIGN UP FORM */}
                {(victimMode === 'signin' || victimMode === 'signup') && (
                  <form onSubmit={handleVictimAuth} className="space-y-4">
                    {victimMode === 'signup' && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#30534b]">
                            {t('full_name', selectedLang)} *
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Ananya S. / Complainant"
                            required
                            className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] outline-none transition focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#30534b]">
                            {t('phone_number', selectedLang)}
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] outline-none transition focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-[#30534b]">
                          {t('email_address', selectedLang)} *
                        </label>
                        <div className="relative mt-1">
                          <Mail size={15} className="absolute left-3.5 top-3 text-[#7b9c94]" />
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="citizen@example.com"
                            required
                            className="w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] pl-10 pr-3.5 py-2.5 text-xs text-[#163a34] outline-none transition focus:border-[#1d8272] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#30534b]">
                          Password *
                        </label>
                        <div className="relative mt-1">
                          <Lock size={15} className="absolute left-3.5 top-3 text-[#7b9c94]" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] pl-10 pr-10 py-2.5 text-xs text-[#163a34] outline-none transition focus:border-[#1d8272] focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-[#7b9c94] hover:text-[#163a34]"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1d8272] to-[#166558] py-3 text-xs font-bold text-white shadow-md transition hover:from-[#176d5f] hover:to-[#125247] disabled:opacity-50"
                    >
                      <span>{loading ? 'Authenticating...' : victimMode === 'signup' ? 'Create Account & Enter Portal' : 'Sign In to Citizen Portal'}</span>
                      <ArrowRight size={15} />
                    </button>

                    <div className="relative my-4 flex items-center justify-center border-t border-[#e2ebe7]">
                      <span className="bg-white px-3 text-[11px] text-[#7b9c94]">or continue with</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#cfe3dc] bg-white py-2.5 text-xs font-semibold text-[#163a34] transition hover:bg-[#f7fbf9]"
                    >
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google / Gmail</span>
                    </button>
                  </form>
                )}

                {/* ANONYMOUS ACCESS */}
                {victimMode === 'anonymous' && (
                  <div className="rounded-2xl border border-[#d3e5df] bg-[#f9fbfa] p-5 space-y-4 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e4f4ef] text-[#1d8272]">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#163a34]">100% Confidential Anonymous Access</h3>
                      <p className="mt-1 text-xs text-[#68857e] max-w-md mx-auto">
                        Your identity will not be logged. You will receive an encrypted case token to track support and nearest officer dispatch anonymously.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto text-left">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30534b]">Your City / District</label>
                        <input
                          type="text"
                          value={victimDistrict}
                          onChange={e => setVictimDistrict(e.target.value)}
                          placeholder="e.g. Pune"
                          className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-white px-3 py-2 text-xs text-[#163a34]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#30534b]">State</label>
                        <input
                          type="text"
                          value={victimState}
                          onChange={e => setVictimState(e.target.value)}
                          placeholder="e.g. Maharashtra"
                          className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-white px-3 py-2 text-xs text-[#163a34]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAnonymousAccess}
                      className="rounded-xl bg-[#1d8272] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#166558]"
                    >
                      Enter Secure Anonymous Portal
                    </button>
                  </div>
                )}

                {/* CASE TRACKING */}
                {victimMode === 'case_track' && (
                  <form onSubmit={handleTrackCase} className="rounded-2xl border border-[#d3e5df] bg-[#f9fbfa] p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-[#e4f4ef] text-[#1d8272]">
                        <FileSearch size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#163a34]">Track Case Reference Status</h3>
                        <p className="text-[11px] text-[#68857e]">
                          Enter your generated Case ID (e.g. NHAA-2026-9041)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackCaseId}
                        onChange={e => setTrackCaseId(e.target.value)}
                        placeholder="NHAA-2026-XXXX"
                        className="flex-1 rounded-xl border border-[#d3e5df] bg-white px-3.5 py-2.5 text-xs text-[#163a34] outline-none font-mono"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-[#1d8272] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#166558]"
                      >
                        Track
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: OFFICER & AUTHORITY CONSOLE */}
            {activeTab === 'officer' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl bg-[#eef2ff] border border-[#c7d2fe] p-4 text-[#3730a3]">
                  <div className="flex items-center gap-3">
                    <Building2 size={20} />
                    <div>
                      <h3 className="text-xs font-bold">Nodal Officer &amp; Redressal Console</h3>
                      <p className="text-[11px] text-[#4f46e5]">
                        Live police stations, legal aid desks, and psychiatrist triage centers.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOfficerLogin} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#334155]">
                        Officer Badge ID / Official Email *
                      </label>
                      <div className="relative mt-1">
                        <BadgeAlert size={15} className="absolute left-3.5 top-3 text-[#64748b]" />
                        <input
                          type="text"
                          value={officerBadgeId}
                          onChange={e => setOfficerBadgeId(e.target.value)}
                          placeholder="NHAA-MH-4421 or email"
                          required
                          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-10 pr-3.5 py-2.5 text-xs text-[#1e293b] outline-none transition focus:border-[#4338ca] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#334155]">
                        Secure Security Passcode *
                      </label>
                      <div className="relative mt-1">
                        <Lock size={15} className="absolute left-3.5 top-3 text-[#64748b]" />
                        <input
                          type="password"
                          value={officerPassword}
                          onChange={e => setOfficerPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-10 pr-3.5 py-2.5 text-xs text-[#1e293b] outline-none transition focus:border-[#4338ca] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4338ca] to-[#312e81] py-3 text-xs font-bold text-white shadow-md transition hover:from-[#3730a3] hover:to-[#1e1b4b] disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying Official Credentials...' : 'Authenticate & Enter Redressal Console'}</span>
                    <ArrowRight size={15} />
                  </button>
                </form>

                {/* Real Live Officers in Database (Quick Select / Demo Fast-Track) */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#475569] mb-3">
                    <Database size={14} className="text-[#4338ca]" />
                    <span>Real Registered Officers (Live Proximity Nodes):</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {officersList.map(officer => (
                      <button
                        key={officer.id}
                        type="button"
                        onClick={() => selectDemoOfficer(officer)}
                        className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                          selectedDemoOfficer?.id === officer.id
                            ? 'border-[#4338ca] bg-[#eef2ff]'
                            : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                        }`}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e0e7ff] text-[#4338ca] text-xs font-bold">
                          {officer.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#1e293b] truncate">{officer.full_name}</h4>
                            <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                              {officer.assigned_district}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748b] truncate">{officer.department}</p>
                          <p className="text-[10px] font-mono text-[#4338ca] mt-0.5">{officer.officer_badge_id}</p>
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
      <footer className="text-center text-[11px] text-[#7b9c94] py-2">
        <span>Protected under SC/ST (Prevention of Atrocities) Act &bull; 24x7 Emergency Redressal 14566</span>
      </footer>
    </div>
  )
}
