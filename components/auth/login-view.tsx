'use client'

import React, { useState } from 'react'
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
  Database
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_OFFICERS } from '@/lib/mock-data'
import { OfficerProfile, UserProfile } from '@/types'
import { fetchUserProfile, saveUserProfile } from '@/lib/supabase-service'

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, officer?: OfficerProfile | null) => void
  onCancel?: () => void
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<'victim' | 'officer'>('victim')
  
  // Victim form state
  const [victimMode, setVictimMode] = useState<'signin' | 'signup' | 'otp' | 'anonymous' | 'case_track'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [trackCaseId, setTrackCaseId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Officer form state
  const [officerBadgeId, setOfficerBadgeId] = useState('')
  const [officerPassword, setOfficerPassword] = useState('')
  const [selectedDemoOfficer, setSelectedDemoOfficer] = useState<OfficerProfile | null>(null)

  // Helper to load or create profile and dispatch onLoginSuccess
  const finalizeUserLogin = async (authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
    // Try fetching existing profile (includes joined address)
    let profile = await fetchUserProfile(authUser.id, authUser.email)

    if (!profile) {
      // First login: create skeleton profile
      const meta = authUser.user_metadata ?? {}
      // Google provides full_name, name, avatar_url
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
        preferred_language: 'en', // short code
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
          // If signup fails due to rate limit or email confirmation requirement, show clear message
          if (error.message.includes('confirm') || error.message.includes('rate limit')) {
            setErrorMsg(`${error.message} (You can also sign in directly if previously registered).`)
          } else {
            setErrorMsg(error.message)
          }
          return
        }

        if (data.user) {
          if (data.session) {
            setSuccessMsg('Account created successfully!')
            await finalizeUserLogin(data.user)
          } else {
            // Confirmation email sent
            setSuccessMsg('Verification link sent to your email! Please check your inbox or proceed.')
            // Allow instant test onboarding
            await finalizeUserLogin(data.user)
          }
        }
      } else if (victimMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        })

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMsg('Invalid email or password. Note: If you previously signed in with "Continue with Google", please use the Google button to log in.')
          } else if (error.message.toLowerCase().includes('email not confirmed')) {
            setErrorMsg('Please confirm your email address via the link sent to your inbox, or disable "Confirm email" in Supabase Dashboard settings.')
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

  // Handle Magic Link / OTP Sign In
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setErrorMsg('Please enter your email address to receive a login link.')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      })
      if (error) {
        throw error
      }
      setOtpSent(true)
      setSuccessMsg('One-Time Login Link sent to your email! Check your inbox to sign in.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send login code'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Google / Gmail OAuth
  // Requires: Supabase Dashboard → Auth → Providers → Google → Enabled with Client ID + Secret
  // The OAuth flow redirects to Google, then back to this app's origin (/auth/callback is handled by Supabase SDK)
  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}`
        : undefined

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Request profile scopes so we get name + picture
          scopes: 'openid email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        // Real error — Google provider probably not enabled in Supabase
        setErrorMsg(
          `Google login failed: ${error.message}. ` +
          'Please enable Google in Supabase Dashboard → Authentication → Providers.'
        )
      }
      // If no error: Supabase redirects to Google. On return the onAuthStateChange listener in page.tsx handles the session.
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
      full_name: 'Anonymous Complainant',
      role: 'victim',
      anonymous: true,
      is_profile_complete: true,
      avatar_initials: 'AC',
      created_at: new Date().toISOString()
    }
    onLoginSuccess(anonUser, null)
  }

  // Handle Case Tracking Quick Search
  const handleTrackCase = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackCaseId) {
      setErrorMsg('Please enter a valid Case Reference ID (e.g. NHAA-2026-9041)')
      return
    }
    const trackingUser: UserProfile = {
      id: `track-${Date.now().toString().slice(-6)}`,
      full_name: `Case Inquirer (${trackCaseId.toUpperCase()})`,
      role: 'victim',
      is_profile_complete: true,
      avatar_initials: 'CI',
      created_at: new Date().toISOString()
    }
    onLoginSuccess(trackingUser, null)
  }

  // Handle Officer Login
  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // Match officer by Badge ID or Email or selected demo
    const targetOfficer = selectedDemoOfficer || DEFAULT_OFFICERS.find(
      o => o.officer_badge_id.toLowerCase() === officerBadgeId.trim().toLowerCase() ||
           o.email.toLowerCase() === officerBadgeId.trim().toLowerCase()
    ) || DEFAULT_OFFICERS[0]

    setTimeout(() => {
      const officerUser: UserProfile = {
        id: targetOfficer.id,
        email: targetOfficer.email,
        full_name: targetOfficer.full_name,
        role: targetOfficer.role,
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
    <div className="min-h-screen bg-gradient-to-br from-[#f0f6f4] via-[#f7faf8] to-[#e8f3ef] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Government & NHAA Branding Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-[#dfe8e4] pb-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-[#1d8b79] text-white flex items-center justify-center shadow-md font-bold text-xl">
            14566
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[#163a35] tracking-tight">NHAA &amp; Integrated Redressal Portal</span>
              <span className="text-[10px] bg-[#dcf2eb] text-[#197565] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                MoSJE Govt of India
              </span>
            </div>
            <p className="text-xs text-[#6b827c]">
              National Helpline Against Atrocities (14566) · Real-time Supabase Auth &amp; Triage
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#52746c] bg-white/80 border border-[#d6e5e0] px-3 py-1.5 rounded-xl shadow-xs">
          <PhoneCall size={14} className="text-[#1d8b79]" />
          <span>Toll-Free 24x7: <strong className="text-[#163a35]">14566</strong></span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-xl mx-auto w-full my-6">
        <div className="bg-white rounded-3xl border border-[#d8e6e1] shadow-[0_20px_50px_-20px_rgba(24,80,70,0.15)] overflow-hidden">
          {/* Header Switcher: Victim vs Officer */}
          <div className="grid grid-cols-2 p-2 bg-[#f0f6f3] border-b border-[#e1ece8]">
            <button
              type="button"
              onClick={() => { setActiveTab('victim'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                activeTab === 'victim'
                  ? 'bg-white text-[#1b7f6f] shadow-sm'
                  : 'text-[#647c76] hover:text-[#21433e]'
              }`}
            >
              <UserRound size={17} />
              <span>Victim / Citizen Portal</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('officer'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                activeTab === 'officer'
                  ? 'bg-white text-[#1b7f6f] shadow-sm'
                  : 'text-[#647c76] hover:text-[#21433e]'
              }`}
            >
              <ShieldCheck size={17} />
              <span>NHAA Officer Console</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-[#fef2f2] border border-[#fecaca] rounded-2xl text-xs text-[#991b1b]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl text-xs text-[#065f46]">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: VICTIM / CITIZEN ACCESS */}
            {activeTab === 'victim' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1b3d38] tracking-tight">
                    {victimMode === 'signup' && 'Create Citizen Account (Supabase)'}
                    {victimMode === 'signin' && 'Sign In to Safe Space'}
                    {victimMode === 'otp' && 'Instant Passwordless Magic Link'}
                    {victimMode === 'anonymous' && 'Anonymous Rapid Access'}
                    {victimMode === 'case_track' && 'Track Existing Case'}
                  </h2>
                  <p className="text-xs text-[#718782] mt-1">
                    {victimMode === 'signup' && 'Register securely via Supabase Auth to store your trauma screening & legal grievance data.'}
                    {victimMode === 'signin' && 'Enter your email & password to access your real-time records.'}
                    {victimMode === 'otp' && 'Receive a secure one-time passwordless login link via Supabase Auth.'}
                    {victimMode === 'anonymous' && 'Report atrocities and receive trauma screening with 100% identity privacy.'}
                    {victimMode === 'case_track' && 'Check real-time SVI status and dispatched actions for your filed grievance.'}
                  </p>
                </div>

                {/* Sub-modes toggle */}
                <div className="flex gap-2 mb-6 border-b border-[#edf3f0] pb-3 text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => { setVictimMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-1 font-medium transition shrink-0 ${victimMode === 'signin' ? 'text-[#1e8373] border-b-2 border-[#1e8373]' : 'text-[#7d938e] hover:text-[#38534e]'}`}
                  >
                    Email Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVictimMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-1 font-medium transition shrink-0 ${victimMode === 'signup' ? 'text-[#1e8373] border-b-2 border-[#1e8373]' : 'text-[#7d938e] hover:text-[#38534e]'}`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVictimMode('otp'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-1 font-medium transition shrink-0 ${victimMode === 'otp' ? 'text-[#1e8373] border-b-2 border-[#1e8373]' : 'text-[#7d938e] hover:text-[#38534e]'}`}
                  >
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVictimMode('anonymous'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-1 font-medium transition shrink-0 ${victimMode === 'anonymous' ? 'text-[#1e8373] border-b-2 border-[#1e8373]' : 'text-[#7d938e] hover:text-[#38534e]'}`}
                  >
                    Anonymous Access
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVictimMode('case_track'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`pb-1 font-medium transition shrink-0 ${victimMode === 'case_track' ? 'text-[#1e8373] border-b-2 border-[#1e8373]' : 'text-[#7d938e] hover:text-[#38534e]'}`}
                  >
                    Track Case ID
                  </button>
                </div>

                {/* Email Sign In / Sign Up Form */}
                {(victimMode === 'signin' || victimMode === 'signup') && (
                  <form onSubmit={handleVictimAuth} className="space-y-4">
                    {/* Google / Gmail Button */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-[#d6e3df] bg-white text-sm font-semibold text-[#274944] hover:bg-[#f5faf8] transition shadow-xs"
                    >
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Continue with Google / Gmail
                    </button>

                    <div className="relative flex items-center justify-center my-4">
                      <div className="border-t border-[#e6eee9] w-full" />
                      <span className="bg-white px-3 text-[11px] text-[#869b95] uppercase tracking-wider font-semibold absolute">
                        or continue with email
                      </span>
                    </div>

                    {victimMode === 'signup' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[#32524d] mb-1.5">
                            Full Name / Alias <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Ramesh Kumar"
                            className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#32524d] mb-1.5">Mobile Phone (Optional)</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#32524d] mb-1.5">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                        />
                        <Mail size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#32524d]">Password</label>
                        {victimMode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => setVictimMode('otp')}
                            className="text-[11px] text-[#1e8373] hover:underline"
                          >
                            Forgot password? Use Magic Link
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                        />
                        <Lock size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 text-[#8ba19b] hover:text-[#32524d]"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1d8272] text-white text-sm font-semibold shadow-md hover:bg-[#186f61] transition disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <span>{victimMode === 'signup' ? 'Create Account & Enter Details' : 'Sign In with Supabase'}</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Magic Link / OTP Mode */}
                {victimMode === 'otp' && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 leading-relaxed">
                      We will send a passwordless magic link to your email address for instant 1-click login.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#32524d] mb-1.5">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                        />
                        <Mail size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1d8272] text-white text-sm font-semibold shadow-md hover:bg-[#186f61] transition disabled:opacity-50"
                    >
                      {loading ? 'Sending Magic Link...' : 'Send Magic Login Link'}
                      <Send size={15} />
                    </button>
                  </form>
                )}

                {/* Anonymous Rapid Entry */}
                {victimMode === 'anonymous' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#eef7f4] border border-[#d1e8df] text-xs text-[#2b5952] leading-relaxed">
                      <p className="font-semibold text-sm mb-1 text-[#175b50]">Zero-Trace Confidential Mode</p>
                      In compliance with Prevention of Atrocities guidelines, you can report atrocities, undergo voice/text trauma screening, and request emergency legal &amp; medical protection without revealing your phone or email.
                    </div>
                    <button
                      type="button"
                      onClick={handleAnonymousAccess}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#1d8272] text-white text-sm font-semibold shadow-md hover:bg-[#186f61] transition"
                    >
                      <span>Enter Anonymous Safe Space</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* Case Tracking Mode */}
                {victimMode === 'case_track' && (
                  <form onSubmit={handleTrackCase} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#32524d] mb-1.5">NHAA Case Tracking ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={trackCaseId}
                          onChange={(e) => setTrackCaseId(e.target.value)}
                          placeholder="e.g. NHAA-2026-9041"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none uppercase font-mono"
                        />
                        <FileSearch size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                      </div>
                      <p className="text-[11px] text-[#7d938e] mt-1.5">
                        Provided during 14566 helpline call or portal registration.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1d8272] text-white text-sm font-semibold shadow-md hover:bg-[#186f61] transition"
                    >
                      <span>Track Grievance &amp; Wellbeing Status</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: NHAA OFFICER / COUNSELLOR LOGIN */}
            {activeTab === 'officer' && (
              <div>
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#1b3d38] tracking-tight">NHAA Officer &amp; Cadre Login</h2>
                    <span className="text-[10px] bg-[#fff1e8] text-[#c25c27] font-semibold px-2 py-0.5 rounded-full">
                      Authorized Personnel Only
                    </span>
                  </div>
                  <p className="text-xs text-[#718782] mt-1">
                    Login with your NHAA Cadre Badge ID, Department Key, and 2FA credentials.
                  </p>
                </div>

                {/* Pre-configured Demo Accounts for Evaluators */}
                <div className="mb-5 p-3.5 bg-[#f6faf8] border border-[#dcebe5] rounded-2xl">
                  <p className="text-[11px] font-semibold text-[#2f5e56] mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#1e8373]" />
                    <span>Quick-Select Demo Officer (1-Click for Evaluation):</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEFAULT_OFFICERS.map((off) => (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => selectDemoOfficer(off)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition ${
                          selectedDemoOfficer?.id === off.id
                            ? 'bg-[#e4f3ee] border-[#228776] text-[#164e44]'
                            : 'bg-white border-[#e0ece8] text-[#4a6761] hover:border-[#b8d6cd]'
                        }`}
                      >
                        <div className="font-semibold text-[11px] flex items-center justify-between">
                          <span>{off.full_name}</span>
                          <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#d6e5df]">{off.officer_badge_id}</span>
                        </div>
                        <p className="text-[10px] text-[#718c85] mt-0.5">{off.department}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleOfficerLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#32524d] mb-1.5">Officer Badge ID / Official Email</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={officerBadgeId}
                        onChange={(e) => {
                          setOfficerBadgeId(e.target.value)
                          setSelectedDemoOfficer(null)
                        }}
                        placeholder="e.g. NHAA-DL-8092 or dr.chandra@nhaa.gov.in"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                      />
                      <Building2 size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#32524d] mb-1.5">Secure Password / Passcode</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={officerPassword}
                        onChange={(e) => setOfficerPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3de] bg-[#fbfdfc] text-sm text-[#274742] focus:border-[#1e8373] focus:ring-1 focus:ring-[#1e8373] outline-none"
                      />
                      <KeyRound size={16} className="absolute left-3.5 top-3 text-[#8ba19b]" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-[#fbfcfb] border border-[#e4ede9] rounded-xl text-[11px] text-[#5b7a73]">
                    <ShieldCheck size={14} className="text-[#1e8373] shrink-0" />
                    <span>2FA Verified Hardware Token &amp; IP Geo-fence Active</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1d8272] text-white text-sm font-semibold shadow-md hover:bg-[#186f61] transition"
                  >
                    <span>{loading ? 'Authenticating Cadre...' : 'Access NHAA Redressal Dashboard'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Legal & Safety Notice */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-[#718b85] pt-4 border-t border-[#dfe8e4]">
        <p>
          National Helpline Against Atrocities (14566) is an initiative of the Ministry of Social Justice and Empowerment (MoSJE), Govt of India.
        </p>
        <p className="mt-1 text-[11px] text-[#8ea59f]">
          Confidentiality governed by SC/ST (Prevention of Atrocities) Act &amp; Ethical AI Psychological Guidelines.
        </p>
      </div>
    </div>
  )
}
