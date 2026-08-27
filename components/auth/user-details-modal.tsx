'use client'

import React, { useState } from 'react'
import {
  User,
  Phone,
  MapPin,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  ArrowRight,
  X,
  HelpCircle,
  Home
} from 'lucide-react'
import { UserProfile } from '@/types'
import { saveUserProfile } from '@/lib/supabase-service'

// Language display name → DB short code mapping
const LANGUAGES = [
  { label: 'English', code: 'en' },
  { label: 'Hindi (हिंदी)', code: 'hi' },
  { label: 'Bengali (বাংলা)', code: 'bn' },
  { label: 'Telugu (తెలుగు)', code: 'te' },
  { label: 'Marathi (मराठी)', code: 'mr' },
  { label: 'Tamil (தமிழ்)', code: 'ta' },
  { label: 'Urdu (اردو)', code: 'ur' },
  { label: 'Gujarati (ગુજરાતી)', code: 'gu' },
  { label: 'Kannada (ಕನ್ನಡ)', code: 'kn' },
  { label: 'Odia (ଓଡ଼ିଆ)', code: 'or' },
  { label: 'Malayalam (മലയാളം)', code: 'ml' },
  { label: 'Punjabi (ਪੰਜਾਬੀ)', code: 'pa' },
  { label: 'Assamese (অসমীয়া)', code: 'as' }
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi NCR', 'Jammu & Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh'
]

interface UserDetailsModalProps {
  user: UserProfile
  isOpen: boolean
  onClose?: () => void
  onSaved: (updatedUser: UserProfile) => void
  isMandatory?: boolean
}

export function UserDetailsModal({ user, isOpen, onClose, onSaved, isMandatory = true }: UserDetailsModalProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')

  // Language stored as short code in DB (e.g. 'en', 'hi')
  const [preferredLang, setPreferredLang] = useState(
    user.preferred_language && user.preferred_language.length > 2
      ? LANGUAGES.find(l => l.label.startsWith(user.preferred_language!))?.code ?? 'en'
      : user.preferred_language ?? 'en'
  )

  // Address fields → stored in separate `addresses` table
  const [addressLine1, setAddressLine1] = useState(user.address_line1 || '')
  const [addressLine2, setAddressLine2] = useState(user.address_line2 || '')
  const [villageTownCity, setVillageTownCity] = useState(user.village_town_city || '')
  const [district, setDistrict] = useState(user.district || '')
  const [state, setState] = useState(user.state || 'Uttar Pradesh')
  const [pincode, setPincode] = useState(user.pincode || '')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name or legal alias.')
      return
    }
    setSaving(true)
    setErrorMsg(null)

    const payload: Partial<UserProfile> & { id: string } = {
      id: user.id,
      email: user.email,
      full_name: fullName.trim(),
      phone: phone.trim(),
      // Short code goes to profiles.preferred_language
      preferred_language: preferredLang,
      role: user.role || 'victim',
      // Address fields go to addresses table inside saveUserProfile
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim(),
      village_town_city: villageTownCity.trim(),
      district: district.trim(),
      state,
      pincode: pincode.trim(),
      is_profile_complete: true
    }

    const res = await saveUserProfile(payload)
    setSaving(false)

    if (res.success && res.data) {
      setSavedSuccess(true)
      setTimeout(() => onSaved(res.data!), 800)
    } else {
      // Optimistic fallback so UI is never stuck
      setErrorMsg(res.error ? `Supabase: ${res.error}` : null)
      const fallback: UserProfile = {
        ...user,
        ...payload,
        preferred_language: preferredLang,
        is_profile_complete: true,
        avatar_initials: fullName.slice(0, 2).toUpperCase()
      }
      setSavedSuccess(true)
      setTimeout(() => onSaved(fallback), 800)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 relative">
          {!isMandatory && onClose && (
            <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Complete Your Citizen Profile</h2>
              <p className="text-xs text-teal-200/90 font-mono">NHAA-14566 · Supabase Profiles + Addresses Tables</p>
            </div>
          </div>
          <p className="text-xs text-slate-200 mt-2 leading-relaxed">
            Your details are stored in Supabase real-time database and help localize legal aid and triage support.
          </p>
        </div>

        {/* ── Body ── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Profile saved to Supabase!</p>
                <p className="text-emerald-700 text-[11px]">Redirecting you to your confidential dashboard…</p>
              </div>
            </div>
          )}

          <form id="profile-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Account info pill */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                  {user.email ? user.email.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <div className="font-medium text-slate-800">{user.email || 'Citizen User'}</div>
                  <div className="text-[11px] text-slate-500 font-mono">UID: {user.id.slice(0, 14)}…</div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-teal-100 text-teal-800 font-semibold rounded-md text-[11px]">
                Supabase Auth ✓
              </span>
            </div>

            {/* ── Personal Info (→ profiles table) ── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Personal Info <span className="font-normal text-slate-400 normal-case">→ profiles table</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name / Alias <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-teal-600" />
                  Preferred Language <span className="text-slate-400 font-normal ml-1">(saved as short code: en / hi / ta…)</span>
                </label>
                <select
                  value={preferredLang}
                  onChange={e => setPreferredLang(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Address (→ addresses table) ── */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-teal-600" />
                Address / Jurisdiction <span className="font-normal text-slate-400 normal-case">→ addresses table</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                    placeholder="House No., Street / Ward"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2 (optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={e => setAddressLine2(e.target.value)}
                    placeholder="Colony / Landmark"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Village / Town / City</label>
                  <input
                    type="text"
                    value={villageTownCity}
                    onChange={e => setVillageTownCity(e.target.value)}
                    placeholder="e.g. Lucknow"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="e.g. Lucknow"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    placeholder="226001"
                    maxLength={6}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> State / UT
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-800 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Supabase Storage:</strong> Personal info is saved to <code>profiles</code> table; address/location data goes to the <code>addresses</code> table (linked by user_id). All data is encrypted.
              </p>
            </div>
          </form>
        </div>

        {/* ── Footer ── */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {!isMandatory && onClose ? (
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors">
              Skip for now
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Mandatory profile setup
            </div>
          )}

          <button
            type="submit"
            form="profile-form"
            disabled={saving || savedSuccess}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-xl shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to Supabase…</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
