import { supabase } from '@/lib/supabase'
import { CaseRecord, OfficerProfile, RiskLevel, UserProfile, VoiceAnalysisMetrics } from '@/types'
import { INITIAL_CASES, DEFAULT_OFFICERS } from '@/lib/mock-data'

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
    let query = supabase.from('cases').select(`
      *,
      interactions (*),
      assessments (*),
      profiles:user_id (full_name, phone, preferred_language, email)
    `)

    if (filterOfficerId) {
      query = query.or(`assigned_officer_id.eq.${filterOfficerId},incident_location->>district.ilike.%${district || ''}%`)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error fetching cases from Supabase:', error.message)
      return INITIAL_CASES
    }

    if (!data || data.length === 0) return INITIAL_CASES

    // Sort by created_at or reported_at descending safely in memory
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = [...data].sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.reported_at || 0).getTime()
      const timeB = new Date(b.created_at || b.reported_at || 0).getTime()
      return timeB - timeA
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sorted.map((c: any) => {
      const latestInteraction = Array.isArray(c.interactions) && c.interactions.length > 0 ? c.interactions[0] : null
      const latestAssessment = Array.isArray(c.assessments) && c.assessments.length > 0 ? c.assessments[0] : null
      const victimName = c.profiles?.full_name || c.victim_name || 'Citizen User'
      
      const rawRisk = c.current_risk_level || (latestAssessment?.overall_distress > 0.75 ? 'Critical' : latestAssessment?.overall_distress > 0.5 ? 'High' : latestAssessment?.overall_distress > 0.25 ? 'Moderate' : 'Low')
      const riskLevel: RiskLevel = 
        rawRisk?.toUpperCase() === 'CRITICAL' ? 'Critical' :
        rawRisk?.toUpperCase() === 'HIGH' ? 'High' :
        rawRisk?.toUpperCase() === 'MODERATE' ? 'Moderate' : 'Low'

      const sviScore = c.current_svi ?? (latestAssessment ? Math.round((latestAssessment.overall_distress || 0) * 100) : 65)

      return {
        id: c.case_number || c.id,
        session_id: c.session_id,
        user_id: c.user_id,
        victim_name: victimName,
        initials: (victimName || 'CU').slice(0, 2).toUpperCase(),
        is_anonymous: false,
        contact_number: c.profiles?.phone || c.contact_number || '',
        incident_category: 'Caste-based Discrimination',
        incident_location: c.incident_location || {
          village_town_city: c.incident_city || '',
          district: c.incident_district || '',
          state: c.incident_state || '',
          pincode: c.incident_pincode || ''
        },
        channel: (c.channel?.toLowerCase() === 'mobile' ? 'mobile_app' : 'integrated_portal') as any,
        language: latestInteraction?.language || c.language || 'en',
        reported_at: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        narrative_text: latestInteraction?.text_content || c.narrative_text || '',
        voice_analysis: c.voice_analysis,
        stress_assessment: {
          id: latestAssessment?.id || `SA-${c.id.slice(0, 6)}`,
          case_id: c.case_number || c.id,
          svi_score: sviScore,
          risk_level: riskLevel,
          trauma_score: latestAssessment ? Math.round((latestAssessment.trauma_score || 0) * 100) : (riskLevel === 'High' || riskLevel === 'Critical' ? 82 : 55),
          fear_score: latestAssessment ? Math.round((latestAssessment.fear_score || 0) * 100) : (riskLevel === 'High' || riskLevel === 'Critical' ? 78 : 50),
          anxiety_score: latestAssessment ? Math.round((latestAssessment.anxiety_score || 0) * 100) : (riskLevel === 'High' || riskLevel === 'Critical' ? 85 : 62),
          depression_indicator: latestAssessment ? latestAssessment.depression_indicator === 1 : true,
          suicidal_ideation_flag: latestAssessment ? latestAssessment.suicidal_ideation_indicator === 1 : false,
          intimidation_flag: true,
          social_isolation_flag: latestAssessment ? (latestAssessment.isolation_score || 0) > 0.5 : true,
          speech_stress_detected: false,
          key_trauma_triggers: [c.primary_situation || latestAssessment?.situation || 'intimidation', 'isolation'].filter(Boolean),
          recommended_actions: [
            'Immediate Clinical Tele-Consultation',
            'District Anti-Discrimination Protection Notice'
          ],
          assessed_at: latestAssessment?.created_at || c.created_at || new Date().toISOString(),
          situation: latestAssessment?.situation || c.primary_situation || undefined,
          situation_confidence: latestAssessment?.situation_confidence ?? latestAssessment?.confidence ?? 0.88,
          confidence: latestAssessment?.confidence ?? 0.88,
          indicators: {
            stress: sviScore / 100,
            fear: latestAssessment?.fear_score ?? 0.75,
            anxiety: latestAssessment?.anxiety_score ?? 0.7,
            distress: sviScore / 100,
            trauma: latestAssessment?.trauma_score ?? 0.8,
            threat: latestAssessment?.threat_score ?? 0.85,
            violence: (latestAssessment?.violence_score ?? 0) / 100,
            immediate_danger: sviScore > 75 ? 0.9 : 0.4,
            isolation: latestAssessment?.isolation_score ?? 0.6,
            vulnerability: latestAssessment?.vulnerability_score ?? 0.7
          }
        },
        status: (c.status === 'RESOLVED' ? 'Resolved' : c.status === 'CLOSED' ? 'Resolved' : (riskLevel === 'High' || riskLevel === 'Critical' ? 'New Intake' : 'Under Triage')),
        assigned_officer: 'Insp. Vikram Pratap Singh',
        assigned_officer_id: c.assigned_officer_id || 'OFF-02',
        assigned_counsellor: 'Dr. Ramesh Chandra',
        assigned_counsellor_id: c.assigned_counsellor_id || 'OFF-01',
        proximity_routing: typeof c.proximity_routing === 'object' ? c.proximity_routing : {
          nearest_station: c.proximity_routing || 'District Special Redressal Unit',
          district: c.incident_district || 'Pune',
          state: c.incident_state || 'Maharashtra',
          routing_reason: 'Automated proximity routing to district jurisdiction',
          assigned_at: c.created_at || new Date().toISOString()
        },
        priority_tier: riskLevel === 'Critical' ? 1 : riskLevel === 'High' ? 2 : 3,
        notes: Array.isArray(c.notes) ? c.notes : [
          {
            id: `N-${c.id.slice(0, 6)}`,
            author: 'AI SVI Engine',
            role: 'Automated Assessment',
            timestamp: 'Intake',
            text: `Case registered with ${riskLevel} SVI (${sviScore}). Situation: ${c.primary_situation || 'Under Review'}.`
          }
        ],
        dispatched_actions: []
      }
    })
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
    const isUuid = (v?: string | null) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

    // Ensure dbCaseId is a valid UUID for Postgres primary key
    const dbCaseId = isUuid(caseRecord.id) ? caseRecord.id : crypto.randomUUID()
    const caseNumber = caseRecord.id && caseRecord.id.startsWith('NHAA-') 
      ? caseRecord.id 
      : `NHAA-2026-${Math.floor(1000 + Math.random() * 9000)}`

    // Resolve a valid user_id UUID from active session or fallback profile
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
        // Fallback to first existing profile in DB for guest/demo submission
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

    // ── Step 1: Insert into cases ────────────────────────────────────────────
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
        ? (caseRecord.proximity_routing.nearest_station || caseRecord.proximity_routing.routing_reason || null)
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

    // ── Step 2: Insert interaction (story text) ───────────────────────────────
    const { data: interactionData, error: interactionErr } = await supabase
      .from('interactions')
      .insert({
        case_id: dbCaseId,
        user_id: safeUserId,
        interaction_type: caseRecord.voice_analysis ? 'VOICE' : 'CHAT',
        channel: toDbChannel(caseRecord.channel),
        language: caseRecord.language || 'en',
        text_content: caseRecord.narrative_text || ''
      })
      .select('id')
      .single()

    if (interactionErr || !interactionData?.id) {
      console.warn('Supabase createInteraction error:', interactionErr?.message)
      return { success: true, data: { ...caseRecord, id: caseNumber } }
    }

    const interactionId = interactionData.id

    // ── Step 3: Insert assessment ─────────────────────────────────────────────
    const { data: assessmentData, error: assessmentErr } = await supabase
      .from('assessments')
      .insert({
        interaction_id: interactionId,
        case_id: dbCaseId,
        model_name: 'NHAA-NLP-v2',
        model_version: '2.0',
        situation: sa?.situation || null,
        situation_confidence: norm(sa?.situation_confidence ?? sa?.confidence),
        overall_distress: norm(sa?.svi_score),
        fear_score: norm(sa?.fear_score),
        anxiety_score: norm(sa?.anxiety_score),
        trauma_score: norm(sa?.trauma_score),
        threat_score: norm((sa?.indicators as unknown as Record<string, number>)?.threat),
        violence_score: Math.round(norm((sa?.indicators as unknown as Record<string, number>)?.violence) * 100),
        isolation_score: norm((sa?.indicators as unknown as Record<string, number>)?.social_isolation ?? (sa?.indicators as unknown as Record<string, number>)?.isolation),
        vulnerability_score: norm((sa?.indicators as unknown as Record<string, number>)?.vulnerability),
        depression_indicator: sa?.depression_indicator ? 1 : 0,
        suicidal_ideation_indicator: sa?.suicidal_ideation_flag ? 1 : 0,
        confidence: norm(sa?.situation_confidence ?? sa?.confidence)
      })
      .select('id')
      .single()

    if (assessmentErr || !assessmentData?.id) {
      console.warn('Supabase createAssessment error:', assessmentErr?.message)
      return { success: true, data: { ...caseRecord, id: caseNumber } }
    }

    const assessmentId = assessmentData.id

    // ── Step 4: Insert SVI score ──────────────────────────────────────────────
    const { error: sviErr } = await supabase.from('svi_scores').insert({
      assessment_id: assessmentId,
      case_id: dbCaseId,
      score: sa?.svi_score ?? 0,
      risk_level: toDbRiskLevel(sa?.risk_level),
      model_version: '2.0',
      confidence: norm(sa?.situation_confidence ?? sa?.confidence),
      calculation_method: sa?.safety_escalation_applied ? 'ESCALATED' : 'STANDARD'
    })
    if (sviErr) console.warn('Supabase createSVI error:', sviErr.message)

    // ── Step 5: Insert risk indicators ───────────────────────────────────────
    const indicators = sa?.contributing_factors || sa?.key_trauma_triggers || []
    if (indicators.length > 0) {
      const indicatorRows = indicators.slice(0, 10).map((ind: unknown) => {
        const indObj = typeof ind === 'object' && ind !== null ? ind as Record<string, unknown> : null
        const indFactor = indObj ? String(indObj.factor || indObj.indicator || '') : String(ind)
        const indScore = indObj ? Number(indObj.score || indObj.contribution || 0) : 0
        const indEvidence = indObj ? String(indObj.evidence || `Detected: ${indFactor}`) : `Detected: ${ind}`
        return {
          assessment_id: assessmentId,
          indicator_type: indFactor,
          severity: toDbRiskLevel(sa?.risk_level),
          confidence: norm(indScore) || norm(sa?.situation_confidence),
          evidence: indEvidence,
          source: 'nlp_engine'
        }
      })
      const { error: riskErr } = await supabase.from('risk_indicators').insert(indicatorRows)
      if (riskErr) console.warn('Supabase createRiskIndicators error:', riskErr.message)
    }

    return { success: true, data: { ...caseRecord, id: caseNumber } }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create case'
    console.error('createCaseInDb exception:', msg)
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

// ─── Assessments (legacy stub — real saves happen inside createCaseInDb) ──────

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

