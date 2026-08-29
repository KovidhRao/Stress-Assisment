import { supabase } from '@/lib/supabase'
import {
  CaseRecord,
  OfficerProfile,
  PsychiatristProfile,
  RiskLevel,
  UserProfile,
  VoiceAnalysisMetrics
} from '@/types'
import { INITIAL_CASES, DEFAULT_OFFICERS, DEFAULT_PSYCHIATRISTS } from '@/lib/mock-data'
import { CaseService } from './services/case-service'
import { AssignmentService } from './services/assignment-service'
import { AnalysisService } from './services/analysis-service'
import { AppointmentService } from './services/appointment-service'
import { WellbeingService } from './services/wellbeing-service'

// Re-export services for convenience
export { CaseService, AssignmentService, AnalysisService, AppointmentService, WellbeingService }

// ─── Real DB Enum Mappers ────────────────────────────────────────────────────
/** Map app risk level (Title case) → DB enum (ALL CAPS) */
function toDbRiskLevel(level?: string): string {
  const m: Record<string, string> = {
    Low: 'LOW', Moderate: 'MODERATE', High: 'HIGH', Critical: 'CRITICAL',
    low: 'LOW', moderate: 'MODERATE', high: 'HIGH', critical: 'CRITICAL',
    LOW: 'LOW', MODERATE: 'MODERATE', HIGH: 'HIGH', CRITICAL: 'CRITICAL'
  }
  return m[level ?? 'LOW'] ?? 'LOW'
}

/** Map app channel string → DB case_channel enum */
function toDbChannel(channel?: string): string {
  const m: Record<string, string> = {
    mobile_app: 'MOBILE', mobile: 'MOBILE',
    chatbot: 'CHATBOT', ivrs: 'IVRS', voice: 'VOICE',
    web: 'WEB', integrated_portal: 'WEB', portal: 'WEB', online: 'WEB'
  }
  return m[(channel ?? 'web').toLowerCase()] ?? 'WEB'
}

/** Map app case status → DB case_status enum */
function toDbCaseStatus(status?: string): string {
  const m: Record<string, string> = {
    'New Intake': 'OPEN', 'Under Triage': 'OPEN', 'In Progress': 'OPEN',
    'Pending': 'OPEN', 'Resolved': 'RESOLVED', 'Closed': 'CLOSED',
    OPEN: 'OPEN', RESOLVED: 'RESOLVED', CLOSED: 'CLOSED'
  }
  return m[status ?? 'New Intake'] ?? 'OPEN'
}

/** Normalize 0-100 SVI subscores to 0.0-1.0 for DB assessments table */
function norm(v?: number): number {
  if (v == null) return 0
  return v > 1 ? parseFloat((v / 100).toFixed(4)) : v
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDbRole(role?: string): string {
  const map: Record<string, string> = {
    victim: 'VICTIM',
    officer: 'OFFICER',
    counsellor: 'COUNSELLOR',
    psychiatrist: 'PSYCHIATRIST',
    admin: 'ADMIN'
  }
  return map[role?.toLowerCase() ?? 'victim'] ?? 'VICTIM'
}

function fromDbRole(dbRole?: string): UserProfile['role'] {
  const map: Record<string, UserProfile['role']> = {
    VICTIM: 'victim',
    OFFICER: 'officer',
    COUNSELLOR: 'counsellor',
    PSYCHIATRIST: 'psychiatrist',
    ADMIN: 'admin'
  }
  return map[dbRole ?? 'VICTIM'] ?? 'victim'
}

function toLangCode(lang?: string): string {
  const map: Record<string, string> = {
    English: 'en', Hindi: 'hi', Bengali: 'bn', Telugu: 'te',
    Marathi: 'mr', Tamil: 'ta', Urdu: 'ur', Gujarati: 'gu',
    Kannada: 'kn', Odia: 'or', Malayalam: 'ml', Punjabi: 'pa', Assamese: 'as'
  }
  if (lang && lang.length <= 3) return lang
  return map[lang ?? 'English'] ?? 'en'
}

function fromLangCode(code?: string): string {
  const map: Record<string, string> = {
    en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu',
    mr: 'Marathi', ta: 'Tamil', ur: 'Urdu', gu: 'Gujarati',
    kn: 'Kannada', or: 'Odia', ml: 'Malayalam', pa: 'Punjabi', as: 'Assamese'
  }
  return map[code ?? 'en'] ?? 'English'
}

// ─── Connection Check ────────────────────────────────────────────────────────

export async function checkSupabaseConnection(): Promise<{ ok: boolean; hasTables: boolean; message: string }> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) {
      return {
        ok: false,
        hasTables: false,
        message: error.message || 'Supabase tables not initialized. Run schema.sql in Supabase SQL editor.'
      }
    }
    return { ok: true, hasTables: true, message: 'Connected to Supabase successfully' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown connection error'
    return { ok: false, hasTables: false, message: msg }
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function fetchUserProfile(
  userId: string,
  callerEmail?: string
): Promise<UserProfile | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, preferred_language, role, is_profile_complete, is_active, created_at, updated_at, avatar_url')
      .eq('id', userId)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') return null
      console.warn('Could not fetch user profile:', profileError.message)
      return null
    }

    const { data: addressData } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return {
      id: profileData.id,
      email: callerEmail ?? '',
      full_name: profileData.full_name ?? '',
      phone: profileData.phone ?? '',
      role: fromDbRole(profileData.role),
      preferred_language: fromLangCode(profileData.preferred_language),
      is_profile_complete: !!profileData.is_profile_complete,
      state: addressData?.state ?? '',
      district: addressData?.district ?? '',
      address_line1: addressData?.address_line1 ?? '',
      address_line2: addressData?.address_line2 ?? '',
      village_town_city: addressData?.village_town_city ?? '',
      pincode: addressData?.pincode ?? '',
      avatar_url: profileData.avatar_url ?? undefined,
      avatar_initials: ((profileData.full_name || callerEmail || 'US') as string).slice(0, 2).toUpperCase(),
      created_at: profileData.created_at,
      updated_at: profileData.updated_at
    }
  } catch (err) {
    console.error('Error fetching user profile:', err)
    return null
  }
}

export async function saveUserProfile(
  profile: Partial<UserProfile> & { id: string }
): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const profilePayload: Record<string, unknown> = {
      full_name: profile.full_name ?? null,
      phone: profile.phone ?? null,
      preferred_language: toLangCode(profile.preferred_language),
      role: profile.role ?? 'victim',
      is_profile_complete: profile.is_profile_complete !== undefined ? profile.is_profile_complete : true,
      is_active: true,
      updated_at: new Date().toISOString()
    }

    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', profile.id)
      .select()
      .maybeSingle()

    let profileData = updateData

    if (!updateData && !updateError) {
      const insertPayload: Record<string, unknown> = {
        ...profilePayload,
        id: profile.id,
        created_at: new Date().toISOString()
      }
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert(insertPayload)
        .select()
        .single()

      if (insertError) {
        console.error('Supabase saveUserProfile insert error:', insertError.message)
        return {
          success: false,
          error: insertError.message,
          data: {
            id: profile.id,
            email: profile.email ?? '',
            full_name: profile.full_name ?? '',
            phone: profile.phone ?? '',
            role: profile.role ?? 'victim',
            preferred_language: toLangCode(profile.preferred_language),
            state: profile.state ?? '',
            district: profile.district ?? '',
            address_line1: profile.address_line1 ?? '',
            address_line2: profile.address_line2 ?? '',
            village_town_city: profile.village_town_city ?? '',
            pincode: profile.pincode ?? '',
            is_profile_complete: true,
            avatar_initials: (profile.full_name || profile.email || 'US').slice(0, 2).toUpperCase(),
            created_at: new Date().toISOString()
          } as UserProfile
        }
      }
      profileData = insertData
    } else if (updateError) {
      console.error('Supabase saveUserProfile update error:', updateError.message)
      return { success: false, error: updateError.message }
    }

    const hasAddress =
      profile.state || profile.district || profile.village_town_city || profile.address_line1

    if (hasAddress) {
      await saveUserAddress(profile.id, {
        address_line1: profile.address_line1 ?? '',
        address_line2: profile.address_line2 ?? '',
        village_town_city: profile.village_town_city ?? '',
        district: profile.district ?? '',
        state: profile.state ?? '',
        pincode: profile.pincode ?? ''
      })
    }

    const updatedProfile: UserProfile = {
      id: profileData?.id ?? profile.id,
      email: profileData?.email ?? profile.email ?? '',
      full_name: profileData?.full_name ?? profile.full_name ?? '',
      phone: profileData?.phone ?? profile.phone ?? '',
      role: fromDbRole(profileData?.role ?? profile.role),
      preferred_language: fromLangCode(profileData?.preferred_language),
      state: profile.state ?? '',
      district: profile.district ?? '',
      address_line1: profile.address_line1 ?? '',
      address_line2: profile.address_line2 ?? '',
      village_town_city: profile.village_town_city ?? '',
      pincode: profile.pincode ?? '',
      is_profile_complete: !!(profileData?.is_profile_complete ?? profile.is_profile_complete),
      avatar_initials: (
        (profileData?.full_name || profile.full_name || profileData?.email || profile.email || 'US') as string
      ).slice(0, 2).toUpperCase(),
      created_at: profileData?.created_at ?? new Date().toISOString(),
      updated_at: profileData?.updated_at ?? new Date().toISOString()
    }

    return { success: true, data: updatedProfile }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to save profile'
    return { success: false, error: errorMsg }
  }
}

export async function saveUserAddress(
  userId: string,
  address: {
    address_line1?: string
    address_line2?: string
    village_town_city?: string
    district?: string
    state?: string
    pincode?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('addresses')
        .update({
          address_line1: address.address_line1 ?? '',
          address_line2: address.address_line2 ?? '',
          village_town_city: address.village_town_city ?? '',
          district: address.district ?? '',
          state: address.state ?? '',
          ...(address.pincode ? { pincode: address.pincode } : {})
        })
        .eq('id', existing.id)

      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from('addresses').insert({
        user_id: userId,
        address_line1: address.address_line1 ?? '',
        address_line2: address.address_line2 ?? '',
        village_town_city: address.village_town_city ?? '',
        district: address.district ?? '',
        state: address.state ?? '',
        ...(address.pincode ? { pincode: address.pincode } : {})
      })

      if (error) return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save address'
    return { success: false, error: msg }
  }
}

// ─── Officers ─────────────────────────────────────────────────────────────────

export async function fetchOfficersFromDb(): Promise<OfficerProfile[]> {
  try {
    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .order('active_cases_count', { ascending: true })

    if (error || !data || data.length === 0) {
      return DEFAULT_OFFICERS
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((o: any) => ({
      id: o.id,
      user_id: o.user_id,
      officer_badge_id: o.officer_badge_id,
      full_name: o.full_name,
      department: o.department,
      role: o.role || 'officer',
      assigned_state: o.assigned_state,
      assigned_district: o.assigned_district,
      station_name: o.station_name || `${o.assigned_district} Redressal Unit`,
      jurisdiction_pincodes: Array.isArray(o.jurisdiction_pincodes) ? o.jurisdiction_pincodes : [],
      active_cases_count: o.active_cases_count || 0,
      email: o.email,
      phone: o.phone,
      is_available: o.is_available !== false,
      avatar_url: o.avatar_url
    }))
  } catch (err) {
    console.error('Error in fetchOfficersFromDb:', err)
    return DEFAULT_OFFICERS
  }
}

export async function saveOfficerProfile(
  officer: Partial<OfficerProfile> & { id: string }
): Promise<{ success: boolean; data?: OfficerProfile; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('officers')
      .upsert({
        id: officer.id,
        officer_badge_id: officer.officer_badge_id,
        full_name: officer.full_name,
        department: officer.department,
        role: officer.role || 'officer',
        assigned_state: officer.assigned_state,
        assigned_district: officer.assigned_district,
        station_name: officer.station_name,
        email: officer.email,
        phone: officer.phone,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.warn('Supabase saveOfficerProfile error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as OfficerProfile }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save officer profile'
    return { success: false, error: msg }
  }
}

export async function fetchPsychiatristsFromDb(): Promise<PsychiatristProfile[]> {
  try {
    const { data, error } = await supabase
      .from('psychiatrists')
      .select('*')
      .order('active_patients_count', { ascending: true })

    if (error || !data || data.length === 0) {
      return DEFAULT_PSYCHIATRISTS
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      title: p.title || 'Senior Clinical Psychiatrist',
      specialization: p.specialization || 'Trauma Triage',
      hospital_clinic: p.hospital_clinic || 'NHAA Tele-Care',
      assigned_state: p.assigned_state || 'National',
      assigned_district: p.assigned_district || 'All Jurisdictions',
      email: p.email || '',
      phone: p.phone || '',
      is_available: p.is_available !== false,
      avatar_url: p.avatar_url,
      active_patients_count: p.active_patients_count || 0
    }))
  } catch (err) {
    console.warn('Error fetching psychiatrists:', err)
    return DEFAULT_PSYCHIATRISTS
  }
}

// ─── Cases (Forwarded to CaseService) ─────────────────────────────────────────

export async function fetchCasesFromDb(filterOfficerId?: string, district?: string): Promise<CaseRecord[]> {
  return CaseService.fetchOfficerCases(filterOfficerId, district)
}

export async function createCaseInDb(
  caseRecord: CaseRecord,
  userId?: string
): Promise<{ success: boolean; data?: CaseRecord; error?: string }> {
  try {
    const isUuid = (v?: string | null) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

    const dbCaseId = isUuid(caseRecord.id) ? caseRecord.id : crypto.randomUUID()
    const caseNumber = caseRecord.id && caseRecord.id.startsWith('NHAA-') 
      ? caseRecord.id 
      : `NHAA-2026-${Math.floor(1000 + Math.random() * 9000)}`

    let safeUserId: string | null = null
    if (isUuid(userId)) {
      safeUserId = userId!
    } else if (isUuid(caseRecord.user_id)) {
      safeUserId = caseRecord.user_id!
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id && isUuid(session.user.id)) {
        safeUserId = session.user.id
      } else {
        const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
        if (firstProfile?.id) {
          safeUserId = firstProfile.id
        }
      }
    }

    if (!safeUserId) {
      console.warn('createCaseInDb: no valid profile user_id available — skipping DB insert')
      return { success: false, error: 'No authenticated user ID or fallback profile', data: caseRecord }
    }

    const sa = caseRecord.stress_assessment
    const loc = caseRecord.incident_location || {}

    const casePayload = {
      id: dbCaseId,
      case_number: caseNumber,
      user_id: safeUserId,
      session_id: caseRecord.session_id || `SESS-${Date.now().toString().slice(-6)}`,
      channel: toDbChannel(caseRecord.channel),
      status: toDbCaseStatus(caseRecord.status),
      incident_location: loc,
      incident_district: (loc as Record<string, string>).district || null,
      incident_state: (loc as Record<string, string>).state || null,
      incident_city: (loc as Record<string, string>).village_town_city || null,
      incident_pincode: (loc as Record<string, string>).pincode || null,
      assigned_officer_id: isUuid(caseRecord.assigned_officer_id) ? caseRecord.assigned_officer_id : null,
      assigned_counsellor_id: isUuid(caseRecord.assigned_counsellor_id) ? caseRecord.assigned_counsellor_id : null,
      proximity_routing: typeof caseRecord.proximity_routing === 'object'
        ? ((caseRecord.proximity_routing as any)?.nearest_station || (caseRecord.proximity_routing as any)?.routing_reason || null)
        : (caseRecord.proximity_routing || null),
      primary_situation: sa?.situation || null,
      current_risk_level: toDbRiskLevel(sa?.risk_level),
      current_svi: sa?.svi_score ?? null
    }

    const { error: caseErr } = await supabase.from('cases').insert(casePayload)
    if (caseErr) {
      console.warn('Supabase createCase error:', caseErr.message)
      return { success: false, error: caseErr.message, data: caseRecord }
    }

    return { success: true, data: { ...caseRecord, id: caseNumber } }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create case'
    console.error('createCaseInDb exception:', msg)
    return { success: false, error: msg, data: caseRecord }
  }
}

export async function updateCaseInDb(caseId: string, updates: Partial<CaseRecord>): Promise<boolean> {
  return CaseService.updateCase(caseId, updates)
}

export async function saveAssessmentInDb(params: {
  userId?: string
  caseId?: string
  narrativeText: string
  sviScore: number
  riskLevel: string
  fearScore?: number
  traumaScore?: number
  anxietyScore?: number
  voiceMetrics?: VoiceAnalysisMetrics | null
  indicators?: string[]
  recommendations?: string[]
}): Promise<boolean> {
  console.log('saveAssessmentInDb: handled by createCaseInDb pipeline (caseId:', params.caseId, 'svi:', params.sviScore, 'risk:', params.riskLevel, ')')
  return true
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToRealtimeCases(
  onInsert: (newCase: CaseRecord) => void,
  onUpdate: (updatedCase: CaseRecord) => void
) {
  const channel = supabase
    .channel('realtime_cases_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cases' }, async () => {
      const freshCases = await fetchCasesFromDb()
      if (freshCases && freshCases.length > 0) {
        onInsert(freshCases[0])
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cases' }, async () => {
      const freshCases = await fetchCasesFromDb()
      if (freshCases && freshCases.length > 0) {
        onUpdate(freshCases[0])
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
