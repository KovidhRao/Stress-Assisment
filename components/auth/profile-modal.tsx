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
  X,
  Building,
  Mail,
  BadgeAlert
} from 'lucide-react'
import { OfficerProfile, UserProfile } from '@/types'
import { saveOfficerProfile, saveUserProfile } from '@/lib/supabase-service'
import { SUPPORTED_LANGUAGES, t } from '@/lib/i18n'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi NCR', 'Jammu & Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh'
]

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile
  officer?: OfficerProfile | null
  currentLanguage: string
  onProfileUpdated: (updatedUser: UserProfile, updatedOfficer?: OfficerProfile | null) => void
}

export function ProfileModal({
  isOpen,
  onClose,
  user,
  officer,
  currentLanguage,
  onProfileUpdated
}: ProfileModalProps) {
  const isOfficer = user.role === 'officer' || user.role === 'counsellor' || user.role === 'admin'

  // User fields
  const [fullName, setFullName] = useState(user.full_name || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [email, setEmail] = useState(user.email || '')
  const [preferredLang, setPreferredLang] = useState(user.preferred_language || currentLanguage || 'en')

  // Address fields
  const [addressLine1, setAddressLine1] = useState(user.address_line1 || '')
  const [addressLine2, setAddressLine2] = useState(user.address_line2 || '')
  const [villageTownCity, setVillageTownCity] = useState(user.village_town_city || '')
  const [district, setDistrict] = useState(user.district || (officer?.assigned_district ?? ''))
  const [state, setState] = useState(user.state || (officer?.assigned_state ?? 'Delhi NCR'))
  const [pincode, setPincode] = useState(user.pincode || '')

  // Officer specific fields
  const [officerBadgeId, setOfficerBadgeId] = useState(officer?.officer_badge_id || '')
  const [stationName, setStationName] = useState(officer?.station_name || '')
  const [department, setDepartment] = useState(officer?.department || 'Psychological Triage')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (isOfficer && officer) {
        // Save Officer Profile
        const officerPayload: Partial<OfficerProfile> & { id: string } = {
          id: officer.id,
          officer_badge_id: officerBadgeId.trim() || officer.officer_badge_id,
          full_name: fullName.trim() || officer.full_name,
          department: department as OfficerProfile['department'],
          role: officer.role,
          assigned_state: state,
          assigned_district: district,
          station_name: stationName.trim() || officer.station_name,
          email: email.trim() || officer.email,
          phone: phone.trim() || officer.phone
        }

        const officerRes = await saveOfficerProfile(officerPayload)
        const updatedOfficer = officerRes.data || { ...officer, ...officerPayload }

        const updatedUser: UserProfile = {
          ...user,
          full_name: fullName.trim() || user.full_name,
          email: email.trim() || user.email,
          phone: phone.trim() || user.phone,
          preferred_language: preferredLang,
          state,
          district
        }

        onProfileUpdated(updatedUser, updatedOfficer)
        setSuccessMsg(t('profile_saved_success', preferredLang))
      } else {
        // Save Citizen / Victim Profile
        const userPayload: Partial<UserProfile> & { id: string } = {
          id: user.id,
          email: email.trim() || user.email,
          full_name: fullName.trim() || user.full_name,
          phone: phone.trim() || user.phone,
          preferred_language: preferredLang,
          role: 'victim',
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim(),
          village_town_city: villageTownCity.trim(),
          district: district.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          is_profile_complete: true
        }

        const res = await saveUserProfile(userPayload)
        const updatedUser = res.data || ({ ...user, ...userPayload } as UserProfile)

        onProfileUpdated(updatedUser, null)
        setSuccessMsg(t('profile_saved_success', preferredLang))
      }

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full bg-[#f0f4f2] text-[#4f6e66] transition-colors hover:bg-[#e2ebe7] hover:text-[#163a34]"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex size-12 items-center justify-center rounded-2xl ${isOfficer ? 'bg-[#e0e7ff] text-[#4338ca]' : 'bg-[#e4f4ef] text-[#1d8272]'}`}>
            {isOfficer ? <Building size={24} /> : <User size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#163a34]">{t('profile_title', preferredLang)}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isOfficer ? 'bg-[#e0e7ff] text-[#4338ca]' : 'bg-[#e4f4ef] text-[#1d8272]'}`}>
                {isOfficer ? (officer?.department || 'Authority Officer') : t('role_victim', preferredLang)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#68857e]">
              {t('profile_desc', preferredLang)}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#fff0ef] p-3.5 text-xs text-[#c94b48]">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#ecfdf5] p-3.5 text-xs text-[#065f46]">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="mt-6 space-y-4 text-sm">
          {/* Identity details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#30534b]">
                {t('full_name', preferredLang)} *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] placeholder-[#8ea8a1] outline-none transition focus:border-[#1d8272] focus:bg-white focus:ring-2 focus:ring-[#1d8272]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#30534b]">
                {t('phone_number', preferredLang)}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1.5 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] placeholder-[#8ea8a1] outline-none transition focus:border-[#1d8272] focus:bg-white focus:ring-2 focus:ring-[#1d8272]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#30534b]">
                {t('email_address', preferredLang)}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="citizen@example.com"
                className="mt-1.5 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] placeholder-[#8ea8a1] outline-none transition focus:border-[#1d8272] focus:bg-white focus:ring-2 focus:ring-[#1d8272]/20"
              />
            </div>

            {/* Language Preference */}
            <div>
              <label className="block text-xs font-semibold text-[#30534b]">
                {t('pref_language', preferredLang)}
              </label>
              <select
                value={preferredLang}
                onChange={e => setPreferredLang(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3.5 py-2.5 text-xs text-[#163a34] outline-none transition focus:border-[#1d8272] focus:bg-white focus:ring-2 focus:ring-[#1d8272]/20"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Officer specific station fields */}
          {isOfficer && (
            <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#334155]">
                <BadgeAlert size={15} className="text-[#6366f1]" />
                <span>Official Authority Details &amp; Station</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569]">
                    Officer Badge ID
                  </label>
                  <input
                    type="text"
                    value={officerBadgeId}
                    onChange={e => setOfficerBadgeId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs text-[#1e293b]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569]">
                    Station / Department Name
                  </label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={e => setStationName(e.target.value)}
                    placeholder="e.g. Pune Central Atrocity Cell"
                    className="mt-1 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs text-[#1e293b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Address / Jurisdiction Section */}
          <div className="pt-2">
            <div className="flex items-center gap-2 border-b border-[#e2ebe7] pb-2 text-xs font-bold text-[#163a34]">
              <MapPin size={15} className="text-[#1d8272]" />
              <span>{isOfficer ? 'Assigned Jurisdiction (For Proximity Routing)' : 'Residential Address (For Immediate Police / Medical Dispatch)'}</span>
            </div>

            {!isOfficer && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#30534b]">
                    {t('address_line1', preferredLang)}
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                    placeholder="House / Flat No., Street, Colony"
                    className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#30534b]">
                    {t('address_line2', preferredLang)}
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={e => setAddressLine2(e.target.value)}
                    placeholder="Nearby Landmark"
                    className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                  />
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {!isOfficer && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#30534b]">
                    {t('city_village', preferredLang)}
                  </label>
                  <input
                    type="text"
                    value={villageTownCity}
                    onChange={e => setVillageTownCity(e.target.value)}
                    placeholder="e.g. Khandwa / Shivajinagar"
                    className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#30534b]">
                  {t('district', preferredLang)} *
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="e.g. Pune, Lucknow, Jaipur"
                  required
                  className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#30534b]">
                  {t('state', preferredLang)} *
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#30534b]">
                  {t('pincode', preferredLang)}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  placeholder="e.g. 411001"
                  className="mt-1 w-full rounded-xl border border-[#d3e5df] bg-[#f9fbfa] px-3 py-2 text-xs text-[#163a34]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#e2ebe7]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#d3e5df] bg-[#f0f4f2] px-4 py-2.5 text-xs font-semibold text-[#4f6e66] transition hover:bg-[#e2ebe7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1d8272] to-[#166558] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:from-[#176d5f] hover:to-[#125247] disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? 'Saving to Database...' : t('save_profile', preferredLang)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
