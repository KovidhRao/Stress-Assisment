import { supabase } from '@/lib/supabase'
import { CaseRecord, OfficerProfile, UserProfile, VoiceAnalysisMetrics } from '@/types'
import { INITIAL_CASES, DEFAULT_OFFICERS } from '@/lib/mock-data'

/**
 * Service to manage Supabase database operations with fallback resilience.
 *
 * Real schema (from Supabase dashboard):
 *   profiles: id, full_name, phone, preferred_language, role(user_role enum → 'VICTIM'|'OFFICER'|'COUNSELLOR'|'ADMIN'),
 *             is_active, phonenumber, is_profile_complete, created_at, updated_at
 *   addresses: id, user_id(FK→profiles.id), address_line1, address_line2,
 *              village_town_city, district, state, pincode (+ possibly more)
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert our lowercase role to the DB user_role enum (uppercase) */
function toDbRole(role?: string): string {
  const map: Record<string, string> = {
    victim: 'VICTIM',
    officer: 'OFFICER',
    counsellor: 'COUNSELLOR',
    admin: 'ADMIN'
  }
  return map[role?.toLowerCase() ?? 'victim'] ?? 'VICTIM'
}

/** Convert DB enum value back to our app lowercase role */
function fromDbRole(dbRole?: string): UserProfile['role'] {
  const map: Record<string, UserProfile['role']> = {
    VICTIM: 'victim',
    OFFICER: 'officer',
    COUNSELLOR: 'counsellor',
    ADMIN: 'admin'
  }
  return map[dbRole ?? 'VICTIM'] ?? 'victim'
}

/** Convert language name to short code (e.g. "English" → "en") */
function toLangCode(lang?: string): string {
  const map: Record<string, string> = {
    English: 'en', Hindi: 'hi', Bengali: 'bn', Telugu: 'te',
    Marathi: 'mr', Tamil: 'ta', Urdu: 'ur', Gujarati: 'gu',
    Kannada: 'kn', Odia: 'or', Malayalam: 'ml', Punjabi: 'pa', Assamese: 'as'
  }
  // If already a short code, return as-is
  if (lang && lang.length <= 3) return lang
  return map[lang ?? 'English'] ?? 'en'
}

/** Convert lang code to display name */
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
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
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

/**
 * Fetch user profile + their address from Supabase.
 * Profile fields are in `profiles`; location data is in `addresses` (joined by user_id).
 * NOTE: email is NOT a column in profiles table — it lives in auth.users.
 *       Pass callerEmail from the auth session to include it.
 */
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

    // Fetch address row (may be empty for new users)
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
      // Address fields from addresses table
      state: addressData?.state ?? '',
      district: addressData?.district ?? '',
      address_line1: addressData?.address_line1 ?? '',
      address_line2: addressData?.address_line2 ?? '',
      village_town_city: addressData?.village_town_city ?? '',
      pincode: addressData?.pincode ?? '',
      // Avatar helper
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

/**
 * Save profile fields to `profiles` table.
 * Strategy: always UPDATE first (trigger creates the row on signup),
 * INSERT only if UPDATE affects 0 rows (very first login race condition).
 * Then upsert address to `addresses` table.
 */
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

    // Step 1: Try UPDATE (row should already exist from auth trigger)
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', profile.id)
      .select()
      .maybeSingle()

    let profileData = updateData

    // Step 2: If no row was found, fall back to INSERT
    // NOTE: email column may not exist in profiles table (lives in auth.users)
    if (!updateData && !updateError) {
      const insertPayload: Record<string, unknown> = {
        ...profilePayload,
        id: profile.id,
        created_at: new Date().toISOString()
        // email deliberately excluded — not a column in this schema
      }
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert(insertPayload)
        .select()
        .single()

      if (insertError) {
        console.error('Supabase saveUserProfile insert error:', insertError.message)
        // Don't hard-fail — return optimistic data so the UI still works
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

    // Step 3: Save address if any location field provided
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

/**
 * Upsert address row in the `addresses` table.
 * Uses user_id to find and update existing row, or inserts if missing.
 */
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
    // Check if an address already exists for this user
    const { data: existing } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing?.id) {
      // Update existing row
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
      // Insert new row
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

// ─── Cases ───────────────────────────────────────────────────────────────────

// ─── Officers ─────────────────────────────────────────────────────────────────

export async function fetchOfficersFromDb(): Promise<OfficerProfile[]> {
  try {
    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .order('active_cases_count', { ascending: true })

    if (error || !data || data.length === 0) {
      console.warn('Could not fetch officers from Supabase, using defaults:', error?.message)
      return DEFAULT_OFFICERS
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((o: any) => ({
      id: o.id,
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

// ─── Cases ───────────────────────────────────────────────────────────────────

export async function fetchCasesFromDb(filterOfficerId?: string, district?: string): Promise<CaseRecord[]> {
  try {
    let query = supabase.from('cases').select('*')

    if (filterOfficerId) {
      query = query.or(`assigned_officer_id.eq.${filterOfficerId},incident_location->>district.ilike.%${district || ''}%`)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching cases from Supabase:', error.message)
      return INITIAL_CASES
    }

    if (!data || data.length === 0) return INITIAL_CASES

    // Sort by reported_at or created_at descending safely in memory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = [...data].sort((a: any, b: any) => {
      const timeA = new Date(a.reported_at || a.created_at || 0).getTime()
      const timeB = new Date(b.reported_at || b.created_at || 0).getTime()
      return timeB - timeA
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sorted.map((c: any) => ({
      id: c.id,
      session_id: c.session_id,
      user_id: c.user_id,
      victim_name: c.victim_name,
      initials: c.initials || (c.victim_name ? c.victim_name.slice(0, 2).toUpperCase() : 'AN'),
      is_anonymous: !!c.is_anonymous,
      contact_number: c.contact_number,
      incident_category: c.incident_category,
      incident_location: c.incident_location || { village_town_city: '', district: '', state: '', pincode: '' },
      channel: c.channel || 'integrated_portal',
      language: c.language || 'en',
      reported_at: c.reported_at,
      narrative_text: c.narrative_text,
      voice_analysis: c.voice_analysis,
      stress_assessment: c.stress_assessment,
      status: c.status || 'New Intake',
      assigned_officer: c.assigned_officer,
      assigned_officer_id: c.assigned_officer_id,
      assigned_counsellor: c.assigned_counsellor,
      assigned_counsellor_id: c.assigned_counsellor_id,
      proximity_routing: c.proximity_routing,
      priority_tier: c.priority_tier || 3,
      notes: Array.isArray(c.notes) ? c.notes : [],
      dispatched_actions: Array.isArray(c.dispatched_actions) ? c.dispatched_actions : []
    }))
  } catch (err) {
    console.error('Failed to query cases:', err)
    return INITIAL_CASES
  }
}

export async function createCaseInDb(
  caseRecord: CaseRecord,
  userId?: string
): Promise<{ success: boolean; data?: CaseRecord; error?: string }> {
  try {
    // Helper: only pass a value as FK if it looks like a real UUID
    const isUuid = (v?: string | null) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

    // user_id must also be a real UUID from auth
    const safeUserId = isUuid(userId || caseRecord.user_id)
      ? (userId || caseRecord.user_id)
      : null

    const payload = {
      id: caseRecord.id,
      session_id: caseRecord.session_id || `SESS-${Date.now().toString().slice(-6)}`,
      user_id: safeUserId,
      victim_name: caseRecord.victim_name,
      initials: caseRecord.initials,
      is_anonymous: caseRecord.is_anonymous,
      contact_number: caseRecord.contact_number,
      incident_category: caseRecord.incident_category,
      incident_location: caseRecord.incident_location,
      channel: caseRecord.channel,
      language: caseRecord.language,
      reported_at: new Date().toISOString(),
      narrative_text: caseRecord.narrative_text,
      voice_analysis: caseRecord.voice_analysis || null,
      stress_assessment: caseRecord.stress_assessment,
      status: caseRecord.status,
      assigned_officer: caseRecord.assigned_officer || null,
      // Only send UUID officer FK if it's a real UUID; otherwise store name-only
      assigned_officer_id: isUuid(caseRecord.assigned_officer_id) ? caseRecord.assigned_officer_id : null,
      assigned_counsellor: caseRecord.assigned_counsellor || null,
      assigned_counsellor_id: isUuid(caseRecord.assigned_counsellor_id) ? caseRecord.assigned_counsellor_id : null,
      proximity_routing: caseRecord.proximity_routing || null,
      priority_tier: caseRecord.priority_tier,
      notes: caseRecord.notes || [],
      dispatched_actions: caseRecord.dispatched_actions || [],
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('cases').insert(payload)

    if (error) {
      console.warn('Supabase createCase error:', error.message)
      return { success: false, error: error.message, data: caseRecord }
    }

    return { success: true, data: caseRecord }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create case'
    return { success: false, error: msg, data: caseRecord }
  }
}


export async function updateCaseInDb(caseId: string, updates: Partial<CaseRecord>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', caseId)

    if (error) {
      console.warn('Supabase updateCase error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Error updating case:', err)
    return false
  }
}

// ─── Assessments ─────────────────────────────────────────────────────────────

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
  try {
    const { error } = await supabase.from('assessments').insert({
      user_id: params.userId || null,
      case_id: params.caseId || null,
      narrative_text: params.narrativeText,
      svi_score: params.sviScore,
      risk_level: params.riskLevel,
      fear_score: params.fearScore || 0,
      trauma_score: params.traumaScore || 0,
      anxiety_score: params.anxietyScore || 0,
      voice_metrics: params.voiceMetrics || null,
      indicators: params.indicators || [],
      recommendations: params.recommendations || []
    })

    if (error) {
      console.warn('Supabase saveAssessment error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Error saving assessment:', err)
    return false
  }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToRealtimeCases(
  onInsert: (newCase: CaseRecord) => void,
  onUpdate: (updatedCase: CaseRecord) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatCase = (c: any): CaseRecord => ({
    id: c.id,
    session_id: c.session_id,
    user_id: c.user_id,
    victim_name: c.victim_name,
    initials: c.initials || (c.victim_name ? c.victim_name.slice(0, 2).toUpperCase() : 'AN'),
    is_anonymous: !!c.is_anonymous,
    contact_number: c.contact_number,
    incident_category: c.incident_category,
    incident_location: c.incident_location || { village_town_city: '', district: '', state: '', pincode: '' },
    channel: c.channel || 'integrated_portal',
    language: c.language || 'en',
    reported_at: c.reported_at,
    narrative_text: c.narrative_text,
    voice_analysis: c.voice_analysis,
    stress_assessment: c.stress_assessment,
    status: c.status || 'New Intake',
    assigned_officer: c.assigned_officer,
    assigned_officer_id: c.assigned_officer_id,
    assigned_counsellor: c.assigned_counsellor,
    assigned_counsellor_id: c.assigned_counsellor_id,
    proximity_routing: c.proximity_routing,
    priority_tier: c.priority_tier || 3,
    notes: Array.isArray(c.notes) ? c.notes : [],
    dispatched_actions: Array.isArray(c.dispatched_actions) ? c.dispatched_actions : []
  })

  const channel = supabase
    .channel('realtime_cases_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cases' }, (payload) => {
      if (payload.new) onInsert(formatCase(payload.new))
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cases' }, (payload) => {
      if (payload.new) onUpdate(formatCase(payload.new))
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

