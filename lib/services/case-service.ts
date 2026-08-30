import { supabase } from '@/lib/supabase'
import {
  CaseRecord,
  OfficerProfile,
  PsychiatristProfile,
  UserProfile,
  UserStory,
  VoiceAnalysisMetrics
} from '@/types'
import { AnalysisService } from './analysis-service'
import { AssignmentService } from './assignment-service'
import { INITIAL_CASES, INITIAL_STORIES } from '@/lib/mock-data'

/** Check if a value is a valid UUID */
function isUuid(v?: string | null): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export class CaseService {
  /**
   * Generates a unique Case Number in format NHAA-YYYY-XXXX (display ID)
   */
  static generateCaseNumber(): string {
    const year = new Date().getFullYear()
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `NHAA-${year}-${rand}`
  }

  /**
   * Generates a unique Session ID
   */
  static generateSessionId(): string {
    return `SESS-${Date.now().toString().slice(-6)}`
  }

  /**
   * Core Workflow: Create a new Session & Case from a Story Submission.
   *
   * The database uses UUID for cases.id (primary key) and has a separate
   * case_number column for the NHAA-YYYY-XXXX display format.
   *
   * 1. Run NLP/SVI analysis
   * 2. Assign nearest officer & psychiatrist
   * 3. Persist to Supabase (cases, case_stories, case_analysis, case_activity)
   * 4. Return caseRecord + story for UI
   */
  static async createCaseFromStory(params: {
    user: UserProfile
    storyText: string
    audioUrl?: string | null
    audioDuration?: number
    transcript?: string
    language?: string
    voiceMetrics?: VoiceAnalysisMetrics | null
    allOfficers?: OfficerProfile[]
    allPsychiatrists?: PsychiatristProfile[]
  }): Promise<{
    caseRecord: CaseRecord
    story: UserStory
  }> {
    const caseNumber = this.generateCaseNumber()
    const sessionId = this.generateSessionId()
    const submissionType = params.audioDuration ? 'audio' : 'text'
    const language = params.language || params.user.preferred_language || 'en'

    // 1. Run NLP/SVI Analysis
    const analysis = await AnalysisService.analyzeStory(
      params.storyText,
      params.voiceMetrics
    )

    // 2. Run Proximity Assignment
    const location = {
      state: params.user.state || 'Maharashtra',
      district: params.user.district || 'Pune',
      village_town_city: params.user.village_town_city || 'Shivajinagar',
      pincode: params.user.pincode || '411001'
    }

    const { assignedOfficer, assignedPsychiatrist, routingReason } = await AssignmentService.assignCase({
      caseId: caseNumber,
      victimLocation: location,
      riskLevel: analysis.risk_level,
      allOfficers: params.allOfficers || [],
      allPsychiatrists: params.allPsychiatrists || []
    })

    // Determine safe user_id (must be valid UUID for FK)
    const safeUserId = isUuid(params.user.id) ? params.user.id : null

    // 3. Insert into Supabase cases table
    //    The DB auto-generates UUID for id; we store NHAA number in case_number
    let dbCaseId: string | null = null

    try {
      const { data: insertedCase, error: caseErr } = await supabase
        .from('cases')
        .insert({
          case_number: caseNumber,
          user_id: safeUserId,
          session_id: sessionId,
          victim_name: params.user.full_name || 'Citizen User',
          initials: params.user.avatar_initials || (params.user.full_name ? params.user.full_name.slice(0, 2).toUpperCase() : 'CU'),
          is_anonymous: !!params.user.anonymous,
          contact_number: params.user.phone || null,
          incident_category: 'Social Boycott & Ostracization',
          incident_location: location,
          incident_district: location.district || null,
          incident_state: location.state || null,
          incident_city: location.village_town_city || null,
          incident_pincode: location.pincode || null,
          channel: submissionType === 'audio' ? 'MOBILE' : 'WEB',
          language,
          narrative_text: params.storyText,
          submission_type: submissionType,
          voice_analysis: params.voiceMetrics || null,
          stress_assessment: {
            svi_score: analysis.svi_score,
            risk_level: analysis.risk_level,
            trauma_score: analysis.trauma_score || 50,
            fear_score: analysis.fear_score || 50,
            anxiety_score: analysis.anxiety_score || 50,
            key_triggers: analysis.key_triggers,
            recommended_actions: analysis.recommendations
          },
          status: 'OPEN',
          assigned_officer: assignedOfficer?.full_name || null,
          assigned_officer_id: isUuid(assignedOfficer?.id) ? assignedOfficer?.id : null,
          assigned_counsellor: assignedPsychiatrist?.full_name || null,
          assigned_counsellor_id: assignedPsychiatrist?.id || null,
          proximity_routing: routingReason || null,
          primary_situation: analysis.svi_score >= 50 ? 'HIGH_RISK' : 'GENERAL',
          current_risk_level: analysis.risk_level,
          current_svi: analysis.svi_score,
          priority_tier: analysis.risk_level === 'Critical' ? 1 : analysis.risk_level === 'High' ? 2 : 3,
          notes: [{
            id: `N-${Date.now()}`,
            author: 'AI SVI & Proximity Engine',
            role: 'Automated Redressal Triage',
            timestamp: 'Just now',
            text: `SVI (${analysis.svi_score}) classified as ${analysis.risk_level}. ${routingReason ? `Routing: ${routingReason}` : ''}`
          }],
          dispatched_actions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (caseErr) {
        console.error('[CaseService] cases insert failed:', caseErr.message, caseErr)
      } else {
        dbCaseId = insertedCase?.id || null
        console.log(`[CaseService] Case ${caseNumber} created with DB id: ${dbCaseId}`)
      }
    } catch (e) {
      console.error('[CaseService] cases insert exception:', e instanceof Error ? e.message : String(e))
    }

    // Use DB UUID as the caseRecord.id (all FK references need this)
    const caseRecordId = dbCaseId || crypto.randomUUID()

    // 4. Assemble CaseRecord (for UI consumption)
    const caseRecord: CaseRecord = {
      id: caseNumber, // Use NHAA number as display ID in the UI
      session_id: sessionId,
      user_id: safeUserId || undefined,
      victim_name: params.user.full_name || 'Citizen User',
      initials: params.user.avatar_initials || (params.user.full_name ? params.user.full_name.slice(0, 2).toUpperCase() : 'CU'),
      is_anonymous: !!params.user.anonymous,
      contact_number: params.user.phone || '',
      incident_category: 'Social Boycott & Ostracization',
      incident_location: location,
      channel: submissionType === 'audio' ? 'mobile_app' : 'integrated_portal',
      language,
      reported_at: new Date().toISOString(),
      narrative_text: params.storyText,
      submission_type: submissionType,
      voice_analysis: params.voiceMetrics || undefined,
      stress_assessment: {
        id: `SA-${caseNumber}`,
        case_id: caseNumber,
        svi_score: analysis.svi_score,
        risk_level: analysis.risk_level,
        trauma_score: analysis.trauma_score || 50,
        fear_score: analysis.fear_score || 50,
        anxiety_score: analysis.anxiety_score || 50,
        depression_indicator: analysis.svi_score > 55,
        suicidal_ideation_flag: analysis.risk_level === 'Critical',
        intimidation_flag: analysis.risk_level === 'High' || analysis.risk_level === 'Critical',
        social_isolation_flag: true,
        speech_stress_detected: !!params.voiceMetrics,
        key_trauma_triggers: analysis.key_triggers,
        recommended_actions: analysis.recommendations,
        assessed_at: analysis.analyzed_at
      },
      status: analysis.risk_level === 'Critical' || analysis.risk_level === 'High' ? 'New Intake' : 'Under Triage',
      assigned_officer: assignedOfficer?.full_name,
      assigned_officer_id: assignedOfficer?.id,
      assigned_counsellor: assignedPsychiatrist?.full_name,
      assigned_counsellor_id: assignedPsychiatrist?.id,
      proximity_routing: routingReason || undefined,
      priority_tier: analysis.risk_level === 'Critical' ? 1 : analysis.risk_level === 'High' ? 2 : 3,
      notes: [
        {
          id: `N-${Date.now()}`,
          author: 'AI SVI & Proximity Engine',
          role: 'Automated Redressal Triage',
          timestamp: 'Just now',
          text: `SVI (${analysis.svi_score}) classified as ${analysis.risk_level}. ${routingReason ? `Routing: ${routingReason}` : ''}`
        }
      ],
      dispatched_actions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 5. Assemble UserStory
    const story: UserStory = {
      id: `STORY-${caseNumber}`,
      session_id: sessionId,
      case_id: caseNumber,
      user_id: safeUserId || undefined,
      title: params.storyText.slice(0, 48) + (params.storyText.length > 48 ? '...' : ''),
      narrative_text: params.storyText,
      audio_url: params.audioUrl || (submissionType === 'audio' ? 'simulated_audio.webm' : null),
      audio_duration_seconds: params.audioDuration,
      transcript: params.transcript || (submissionType === 'audio' ? params.storyText : undefined),
      language,
      created_at: new Date().toISOString(),
      formatted_time: 'Just now',
      status: analysis.risk_level === 'Critical' || analysis.risk_level === 'High' ? 'Support Plan Available' : 'Under Review',
      risk_level: analysis.risk_level,
      svi_score: analysis.svi_score,
      key_triggers: analysis.key_triggers,
      assigned_officer_name: assignedOfficer?.full_name,
      assigned_officer_id: assignedOfficer?.id,
      assigned_psychiatrist_name: assignedPsychiatrist?.full_name,
      assigned_psychiatrist_id: assignedPsychiatrist?.id,
      nearest_station: assignedOfficer?.station_name || `${location.district} Unit`
    }

    // 6. Persist related data (use DB UUID for case_id FK references)
    if (dbCaseId) {
      const dbErrors: string[] = []

      try {
        const { error } = await supabase.from('case_stories').insert({
          case_id: dbCaseId,
          user_id: safeUserId,
          story_text: params.storyText,
          submission_type: submissionType,
          audio_url: params.audioUrl || null,
          audio_duration_seconds: params.audioDuration || null,
          transcript: params.transcript || null,
          language,
          created_at: new Date().toISOString()
        })
        if (error) dbErrors.push(`case_stories: ${error.message}`)
      } catch (e) {
        dbErrors.push(`case_stories: ${e instanceof Error ? e.message : String(e)}`)
      }

      try {
        const { error } = await supabase.from('case_analysis').insert({
          case_id: dbCaseId,
          svi_score: analysis.svi_score,
          risk_level: analysis.risk_level,
          detected_conditions: analysis.detected_conditions,
          confidence: analysis.confidence,
          fear_score: analysis.fear_score || 0,
          trauma_score: analysis.trauma_score || 0,
          anxiety_score: analysis.anxiety_score || 0,
          key_triggers: analysis.key_triggers,
          recommendations: analysis.recommendations,
          model_version: analysis.model_version,
          analyzed_at: analysis.analyzed_at
        })
        if (error) dbErrors.push(`case_analysis: ${error.message}`)
      } catch (e) {
        dbErrors.push(`case_analysis: ${e instanceof Error ? e.message : String(e)}`)
      }

      try {
        const { error } = await supabase.from('case_activity').insert({
          case_id: dbCaseId,
          user_id: safeUserId,
          title: `Story #${caseNumber} Submitted & Assessed`,
          description: `Risk Level: ${analysis.risk_level} (SVI ${analysis.svi_score}). ${routingReason ? `Routed to: ${assignedOfficer?.full_name || 'Special Unit'}` : ''}`,
          type: 'story',
          timestamp: 'Just now',
          created_at: new Date().toISOString()
        })
        if (error) dbErrors.push(`case_activity: ${error.message}`)
      } catch (e) {
        dbErrors.push(`case_activity: ${e instanceof Error ? e.message : String(e)}`)
      }

      if (dbErrors.length > 0) {
        console.warn(`[CaseService] ${caseNumber}: ${dbErrors.length} related table(s) failed:`, dbErrors)
      } else {
        console.log(`[CaseService] ${caseNumber}: all 4 tables written successfully.`)
      }
    } else {
      console.warn(`[CaseService] ${caseNumber}: case created in-memory only (DB insert failed).`)
    }

    return { caseRecord, story }
  }

  /**
   * Fetch all cases for a specific victim user
   */
  /**
   * Fetch a single case by its UUID id.
   */
  static async fetchCaseById(caseId: string): Promise<CaseRecord | null> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (error || !data) return null
      return this.dbRowToCaseRecord(data as Record<string, unknown>)
    } catch {
      return null
    }
  }

  static async fetchVictimCases(userId: string): Promise<CaseRecord[]> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[CaseService] fetchVictimCases error:', error.message)
        return []
      }
      if (!data || data.length === 0) {
        return []
      }
      // Map DB rows to CaseRecord format
      return data.map((row: Record<string, unknown>) => this.dbRowToCaseRecord(row))
    } catch (err) {
      console.warn('[CaseService] fetchVictimCases exception:', err)
      return []
    }
  }

  /**
   * Fetch all stories for a victim user, joined with case + analysis data.
   * Returns UserStory[] for the My Stories view.
   */
  static async fetchVictimStories(userId: string): Promise<UserStory[]> {
    try {
      // 1. Fetch case_stories for this user, with case + analysis data
      const { data: storiesData, error: storiesError } = await supabase
        .from('case_stories')
        .select('*, cases!inner(*), case_analysis(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (storiesError) {
        console.warn('[CaseService] fetchVictimStories stories error:', storiesError.message)
      }

      // 2. If stories query fails or returns nothing, try fetching from cases directly
      //    (some stories might be stored only in cases.narrative_text)
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*, case_analysis(*), case_stories(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (casesError) {
        console.warn('[CaseService] fetchVictimStories cases error:', casesError.message)
      }

      const stories: UserStory[] = []
      const seenCaseIds = new Set<string>()

      // Process case_stories first (these have the actual story text)
      if (storiesData && storiesData.length > 0) {
        for (const row of storiesData) {
          const caseRow = row.cases as Record<string, unknown> | null
          const analysisArr = row.case_analysis as Record<string, unknown>[] | null
          const analysis = analysisArr && analysisArr.length > 0 ? analysisArr[0] : null

          const caseId = (caseRow?.id as string) || (row.case_id as string) || ''
          seenCaseIds.add(caseId)

          stories.push({
            id: `STORY-${row.id}`,
            case_id: caseId,
            user_id: userId,
            title: (caseRow?.primary_situation as string) || (caseRow?.victim_name as string) || 'Personal Experience Statement',
            narrative_text: (row.story_text as string) || '',
            audio_url: (row.audio_url as string) || null,
            audio_duration_seconds: (row.audio_duration_seconds as number) || 0,
            transcript: (row.transcript as string) || '',
            language: (row.language as string) || 'English',
            created_at: (row.created_at as string) || new Date().toISOString(),
            formatted_time: this.formatRelativeTime(row.created_at as string),
            status: this.mapCaseStatusToStoryStatus(caseRow?.status as string),
            risk_level: (analysis?.risk_level as UserStory['risk_level']) || 'Low',
            svi_score: (analysis?.svi_score as number) || 0,
            key_triggers: (analysis?.key_triggers as string[]) || []
          })
        }
      }

      // Process cases that don't have separate case_stories rows
      // (story text is in cases.narrative_text directly)
      if (casesData && casesData.length > 0) {
        for (const caseRow of casesData) {
          const caseId = caseRow.id as string
          if (seenCaseIds.has(caseId)) continue

          const analysisArr = caseRow.case_analysis as Record<string, unknown>[] | null
          const caseStoriesArr = caseRow.case_stories as Record<string, unknown>[] | null
          const analysis = analysisArr && analysisArr.length > 0 ? analysisArr[0] : null
          const firstStory = caseStoriesArr && caseStoriesArr.length > 0 ? caseStoriesArr[0] : null

          seenCaseIds.add(caseId)

          const narrative = (firstStory?.story_text as string) || (caseRow.narrative_text as string) || ''
          if (!narrative) continue // skip cases with no story text

          stories.push({
            id: firstStory ? `STORY-${firstStory.id}` : `STORY-${caseId}`,
            case_id: caseId,
            user_id: userId,
            title: (caseRow.primary_situation as string) || (caseRow.victim_name as string) || 'Personal Experience Statement',
            narrative_text: narrative,
            audio_url: (firstStory?.audio_url as string) || null,
            audio_duration_seconds: (firstStory?.audio_duration_seconds as number) || 0,
            transcript: (firstStory?.transcript as string) || '',
            language: (firstStory?.language as string) || (caseRow.language as string) || 'English',
            created_at: (caseRow.created_at as string) || new Date().toISOString(),
            formatted_time: this.formatRelativeTime(caseRow.created_at as string),
            status: this.mapCaseStatusToStoryStatus(caseRow.status as string),
            risk_level: (analysis?.risk_level as UserStory['risk_level']) || 'Low',
            svi_score: (analysis?.svi_score as number) || 0,
            key_triggers: (analysis?.key_triggers as string[]) || []
          })
        }
      }

      console.log(`[CaseService] Fetched ${stories.length} stories for user ${userId}`)
      return stories
    } catch (err) {
      console.warn('[CaseService] fetchVictimStories exception:', err)
      return []
    }
  }

  /** Format ISO timestamp to relative time string */
  private static formatRelativeTime(isoStr?: string): string {
    if (!isoStr) return 'Unknown'
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Today, ${hrs} hour${hrs === 1 ? '' : 's'} ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
    return new Date(isoStr).toLocaleDateString()
  }

  /** Map DB case status to story status badge */
  private static mapCaseStatusToStoryStatus(dbStatus?: string): UserStory['status'] {
    const s = (dbStatus || '').toLowerCase()
    if (s === 'closed' || s === 'resolved') return 'Support Plan Available'
    if (s === 'open' || s === 'new_intake') return 'Under Review'
    if (s === 'active' || s === 'in_progress') return 'Shared'
    if (s === 'escalated' || s === 'urgent') return 'Urgent Review'
    return 'Shared'
  }

  /**
   * Fetch cases assigned to a specific officer (or their district/state jurisdiction).
   */
  static async fetchOfficerCases(
    officerId?: string,
    district?: string,
    state?: string
  ): Promise<CaseRecord[]> {
    try {
      let query = supabase.from('cases').select('*').order('created_at', { ascending: false })

      if (officerId) {
        const filters: string[] = [`assigned_officer_id.eq.${officerId}`]
        if (district) filters.push(`incident_district.ilike.%${district}%`)
        if (state) filters.push(`incident_state.ilike.%${state}%`)
        query = query.or(filters.join(','))
      } else if (district) {
        query = query.ilike('incident_district', `%${district}%`)
      }

      const { data, error } = await query
      if (error) {
        console.warn('[CaseService] fetchOfficerCases error:', error.message)
        return INITIAL_CASES
      }
      if (!data || data.length === 0) {
        return INITIAL_CASES
      }
      return data.map((row: Record<string, unknown>) => this.dbRowToCaseRecord(row))
    } catch (err) {
      console.warn('[CaseService] fetchOfficerCases exception:', err)
      return INITIAL_CASES
    }
  }

  /**
   * Fetch cases assigned to a specific psychiatrist
   */
  static async fetchPsychiatristCases(
    psychiatristId?: string,
    district?: string
  ): Promise<CaseRecord[]> {
    try {
      let query = supabase.from('cases').select('*').order('created_at', { ascending: false })

      if (psychiatristId) {
        const filters: string[] = [`assigned_counsellor_id.eq.${psychiatristId}`]
        if (district) filters.push(`incident_district.ilike.%${district}%`)
        query = query.or(filters.join(','))
      }

      const { data, error } = await query
      if (error) {
        console.warn('[CaseService] fetchPsychiatristCases error:', error.message)
        return INITIAL_CASES.filter(c => c.stress_assessment.risk_level !== 'Low')
      }
      if (!data || data.length === 0) {
        return INITIAL_CASES.filter(c => c.stress_assessment.risk_level !== 'Low')
      }
      return data.map((row: Record<string, unknown>) => this.dbRowToCaseRecord(row))
    } catch (err) {
      console.warn('[CaseService] fetchPsychiatristCases exception:', err)
      return INITIAL_CASES
    }
  }

  /**
   * Update case status or append triage notes
   */
  /** Columns that actually exist in the DB cases table */
  private static readonly DB_CASE_COLUMNS = new Set([
    'id', 'case_number', 'user_id', 'session_id', 'victim_name', 'initials',
    'is_anonymous', 'contact_number', 'incident_category', 'incident_location',
    'incident_district', 'incident_state', 'incident_city', 'incident_pincode',
    'incident_latitude', 'incident_longitude',
    'channel', 'language', 'narrative_text', 'submission_type',
    'voice_analysis', 'stress_assessment', 'status',
    'assigned_officer', 'assigned_officer_id',
    'assigned_counsellor', 'assigned_counsellor_id',
    'proximity_routing', 'primary_situation', 'current_risk_level', 'current_svi',
    'priority_tier', 'notes', 'dispatched_actions',
    'created_at', 'updated_at', 'closed_at'
  ])

  static async updateCase(
    caseId: string,
    updates: Partial<CaseRecord>
  ): Promise<boolean> {
    try {
      // If caseId is an NHAA number, find the UUID first
      let dbId = caseId
      if (caseId.startsWith('NHAA-')) {
        const { data } = await supabase
          .from('cases')
          .select('id')
          .eq('case_number', caseId)
          .single()
        if (data?.id) dbId = data.id
      }

      // Build update object with ONLY columns that exist in the DB
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const [key, value] of Object.entries(updates)) {
        if (this.DB_CASE_COLUMNS.has(key) && key !== 'id' && value !== undefined) {
          dbUpdates[key] = value
        }
      }

      if (Object.keys(dbUpdates).length <= 1) {
        // Only updated_at — nothing meaningful to update
        return true
      }

      const { error } = await supabase
        .from('cases')
        .update(dbUpdates)
        .eq('id', dbId)

      if (error) {
        console.error('[CaseService] updateCase error:', error.message)
        return false
      }

      // Log status change to case_activity audit trail
      if (dbUpdates.status && typeof dbUpdates.status === 'string') {
        try {
          await supabase.from('case_activity').insert({
            case_id: dbId,
            title: `Case Status Updated: ${dbUpdates.status}`,
            description: `Status changed to "${dbUpdates.status}" by authorized officer.`,
            type: 'status_change',
            timestamp: 'Just now',
            created_at: new Date().toISOString()
          })
        } catch (actErr) {
          console.warn('[CaseService] activity insert on updateCase error:', actErr)
        }
      }

      return true
    } catch (err) {
      console.error('[CaseService] updateCase exception:', err)
      return false
    }
  }

  /**
   * Convert a DB row to the CaseRecord type used by the UI
   */
  private static dbRowToCaseRecord(row: Record<string, unknown>): CaseRecord {
    const sa = (row.stress_assessment as Record<string, unknown>) || {}
    const loc = (row.incident_location as Record<string, string>) || {
      village_town_city: (row.incident_city as string) || '',
      district: (row.incident_district as string) || '',
      state: (row.incident_state as string) || '',
      pincode: (row.incident_pincode as string) || ''
    }

    // Cast DB string values to the strict union types the UI expects
    const riskLevel = (sa.risk_level as string) || (row.current_risk_level as string) || 'Low'
    const validRiskLevels = ['Low', 'Moderate', 'High', 'Critical']
    const typedRisk = validRiskLevels.includes(riskLevel) ? riskLevel as CaseRecord['stress_assessment']['risk_level'] : 'Low'

    const caseStatus = (row.status as string) || 'New Intake'
    const validStatuses = ['New Intake', 'Under Triage', 'Action Dispatched', 'Counselling Active', 'Resolved']
    const typedStatus = validStatuses.includes(caseStatus) ? caseStatus as CaseRecord['status'] : 'New Intake'

    const channel = (row.channel as string) || 'integrated_portal'
    const validChannels = ['helpline_14566', 'integrated_portal', 'chatbot', 'ivrs', 'mobile_app']
    const typedChannel = validChannels.includes(channel) ? channel as CaseRecord['channel'] : 'integrated_portal'

    const category = (row.incident_category as string) || 'Caste-based Discrimination'
    const validCategories = ['Caste-based Discrimination', 'Atrocity & Physical Violence', 'Verbal Abuse & Intimidation', 'Social Boycott & Ostracization', 'Land/Property Displacement', 'Sexual Harassment & Assault', 'Denial of Basic Rights & Services', 'Other Grievance']
    const typedCategory = validCategories.includes(category) ? category as CaseRecord['incident_category'] : 'Caste-based Discrimination'

    return {
      id: (row.case_number as string) || (row.id as string) || 'UNKNOWN',
      session_id: (row.session_id as string) || undefined,
      user_id: (row.user_id as string) || undefined,
      victim_name: (row.victim_name as string) || 'Citizen',
      initials: (row.initials as string) || 'CU',
      is_anonymous: (row.is_anonymous as boolean) || false,
      contact_number: (row.contact_number as string) || '',
      incident_category: typedCategory,
      incident_location: loc as CaseRecord['incident_location'],
      channel: typedChannel,
      language: (row.language as string) || 'en',
      reported_at: (row.created_at as string) || new Date().toISOString(),
      narrative_text: (row.narrative_text as string) || '',
      submission_type: (row.submission_type as 'text' | 'audio') || 'text',
      voice_analysis: row.voice_analysis as CaseRecord['voice_analysis'],
      stress_assessment: {
        id: `SA-${row.case_number || row.id}`,
        case_id: (row.case_number as string) || (row.id as string) || '',
        svi_score: (sa.svi_score as number) || (row.current_svi as number) || 0,
        risk_level: typedRisk,
        trauma_score: (sa.trauma_score as number) || 0,
        fear_score: (sa.fear_score as number) || 0,
        anxiety_score: (sa.anxiety_score as number) || 0,
        depression_indicator: false,
        suicidal_ideation_flag: false,
        intimidation_flag: false,
        social_isolation_flag: false,
        speech_stress_detected: false,
        key_trauma_triggers: (sa.key_triggers as string[]) || [],
        recommended_actions: (sa.recommended_actions as string[]) || [],
        assessed_at: (row.created_at as string) || new Date().toISOString()
      },
      status: typedStatus,
      assigned_officer: (row.assigned_officer as string) || undefined,
      assigned_officer_id: (row.assigned_officer_id as string) || undefined,
      assigned_counsellor: (row.assigned_counsellor as string) || undefined,
      assigned_counsellor_id: (row.assigned_counsellor_id as string) || undefined,
      proximity_routing: (row.proximity_routing as string) || undefined,
      priority_tier: (row.priority_tier as 1 | 2 | 3 | 4) || 3,
      notes: Array.isArray(row.notes) ? row.notes : [],
      dispatched_actions: Array.isArray(row.dispatched_actions) ? row.dispatched_actions : [],
      follow_up_required: (row.follow_up_required as boolean) || false,
      created_at: (row.created_at as string) || undefined,
      updated_at: (row.updated_at as string) || undefined
    }
  }

  // ─── Case Notes (persisted to Supabase `case_notes` table) ──────────────

  static async addNote(params: {
    caseId: string
    author: string
    role: string
    text: string
  }): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('case_notes')
        .insert({
          case_id: params.caseId,
          author: params.author,
          role: params.role,
          note_text: params.text,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        console.warn('[CaseService] addNote error:', error.message)
        return null
      }

      // Also record activity event
      try {
        await supabase.from('case_activity').insert({
          case_id: params.caseId,
          title: `Note Added by ${params.author}`,
          description: params.text.length > 80 ? params.text.slice(0, 77) + '...' : params.text,
          type: 'note',
          timestamp: 'Just now',
          created_at: new Date().toISOString()
        })
      } catch (actErr) {
        console.warn('[CaseService] activity insert note error:', actErr)
      }

      return data ? { id: data.id } : null
    } catch (err) {
      console.error('[CaseService] addNote exception:', err)
      return null
    }
  }

  static async fetchNotes(caseId: string): Promise<Array<{
    id: string
    author: string
    role: string
    text: string
    timestamp: string
  }>> {
    try {
      const { data, error } = await supabase
        .from('case_notes')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })

      if (error || !data) return []

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        author: (row.author as string) || 'Unknown',
        role: (row.role as string) || 'officer',
        text: (row.note_text as string) || '',
        timestamp: (row.created_at as string) || new Date().toISOString()
      }))
    } catch {
      return []
    }
  }

  static async deleteNote(noteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('case_notes')
        .delete()
        .eq('id', noteId)
      return !error
    } catch {
      return false
    }
  }

  // ─── Follow-Up Tracking ────────────────────────────────────────────────

  static async setFollowUpRequired(caseId: string, required: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ follow_up_required: required })
        .eq('id', caseId)
      return !error
    } catch {
      return false
    }
  }

  static async createFollowUp(params: {
    caseId: string
    assignedTo: string
    assignedRole: string
    followUpType: string
    scheduledAt: string
    notes?: string
  }): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({
          case_id: params.caseId,
          assigned_to: params.assignedTo,
          assigned_role: params.assignedRole,
          follow_up_type: params.followUpType,
          scheduled_at: params.scheduledAt,
          notes: params.notes || null,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        console.warn('[CaseService] createFollowUp error:', error.message)
        return null
      }

      // Log activity event
      try {
        await supabase.from('case_activity').insert({
          case_id: params.caseId,
          title: `Follow-Up Scheduled (${params.followUpType.replace('_', ' ')})`,
          description: `Assigned to ${params.assignedTo} for ${new Date(params.scheduledAt).toLocaleString()}${params.notes ? ` — ${params.notes}` : ''}`,
          type: 'followup',
          timestamp: 'Just now',
          created_at: new Date().toISOString()
        })
      } catch {}

      return data ? { id: data.id } : null
    } catch {
      return null
    }
  }

  static async fetchFollowUps(caseId: string): Promise<Array<{
    id: string
    caseId: string
    assignedTo: string
    followUpType: string
    scheduledAt: string
    completedAt: string | null
    status: string
    notes: string | null
  }>> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('case_id', caseId)
        .order('scheduled_at', { ascending: true })

      if (error || !data) return []

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        caseId: (row.case_id as string) || '',
        assignedTo: (row.assigned_to as string) || '',
        followUpType: (row.follow_up_type as string) || 'check_in',
        scheduledAt: (row.scheduled_at as string) || '',
        completedAt: (row.completed_at as string) || null,
        status: (row.status as string) || 'pending',
        notes: (row.notes as string) || null
      }))
    } catch {
      return []
    }
  }

  /**
   * Fetch all follow-ups across cases for officer / psychiatrist dashboards
   */
  static async fetchAllFollowUps(filter?: {
    assignedTo?: string
    role?: string
    status?: string
  }): Promise<Array<{
    id: string
    caseId: string
    victimName?: string
    assignedTo: string
    assignedRole: string
    followUpType: string
    scheduledAt: string
    completedAt: string | null
    status: string
    notes: string | null
    district?: string
    state?: string
    contactNumber?: string
  }>> {
    try {
      let query = supabase
        .from('follow_ups')
        .select(`
          id,
          case_id,
          assigned_to,
          assigned_role,
          follow_up_type,
          scheduled_at,
          completed_at,
          status,
          notes,
          cases (
            victim_name,
            incident_district,
            incident_state,
            contact_number
          )
        `)
        .order('scheduled_at', { ascending: true })

      if (filter?.status) {
        query = query.eq('status', filter.status)
      }

      const { data, error } = await query

      if (error || !data) return []

      return data.map((row: any) => {
        const c = Array.isArray(row.cases) ? row.cases[0] : row.cases
        return {
          id: row.id as string,
          caseId: row.case_id as string,
          assignedTo: row.assigned_to || '',
          assignedRole: row.assigned_role || 'officer',
          followUpType: row.follow_up_type || 'check_in',
          scheduledAt: row.scheduled_at || '',
          completedAt: row.completed_at || null,
          status: row.status || 'pending',
          notes: row.notes || null,
          victimName: c?.victim_name || 'Complainant',
          district: c?.incident_district || '',
          state: c?.incident_state || '',
          contactNumber: c?.contact_number || ''
        }
      })
    } catch {
      return []
    }
  }

  static async updateFollowUpStatus(followUpId: string, status: string, caseId?: string): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
      const { error } = await supabase
        .from('follow_ups')
        .update(updateData)
        .eq('id', followUpId)

      if (caseId && !error) {
        try {
          await supabase.from('case_activity').insert({
            case_id: caseId,
            title: `Follow-Up Status Updated to ${status.toUpperCase()}`,
            description: `Welfare check-in marked as ${status}`,
            type: 'followup',
            timestamp: 'Just now',
            created_at: new Date().toISOString()
          })
        } catch {}
      }

      return !error
    } catch {
      return false
    }
  }

  // ─── Case Activity & Audit Log ──────────────────────────────────────────

  /**
   * Fetch all chronological activity & audit events for a case
   */
  static async fetchActivities(caseId: string): Promise<Array<{
    id: string
    case_id: string
    title: string
    description: string
    type: string
    timestamp: string
    created_at: string
  }>> {
    try {
      const { data, error } = await supabase
        .from('case_activity')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

      if (error || !data) return []

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        case_id: (row.case_id as string) || caseId,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        type: (row.type as string) || 'triage',
        timestamp: (row.timestamp as string) || 'Just now',
        created_at: (row.created_at as string) || new Date().toISOString()
      }))
    } catch {
      return []
    }
  }

  /**
   * Add a custom audit activity log for a case
   */
  static async addActivity(params: {
    caseId: string
    title: string
    description: string
    type?: 'intake' | 'triage' | 'dispatch' | 'note' | 'review' | 'escalation' | 'followup' | 'survey' | 'status_change'
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('case_activity')
        .insert({
          case_id: params.caseId,
          title: params.title,
          description: params.description,
          type: params.type || 'triage',
          timestamp: 'Just now',
          created_at: new Date().toISOString()
        })
      return !error
    } catch {
      return false
    }
  }

  // ─── Case Actions Dispatch ─────────────────────────────────────────────

  /**
   * Dispatch an official emergency/support action and record audit log
   */
  static async dispatchAction(params: {
    caseId: string
    actionType: 'Police Protection' | 'Legal Aid (NALSA)' | 'Mental Health Counsellor' | 'Medical Hospitalization' | 'Witness Protection' | 'District Collector Notice'
    referenceId: string
    officerName?: string
  }): Promise<boolean> {
    try {
      // 1. Fetch current dispatched_actions
      const { data: caseRow } = await supabase
        .from('cases')
        .select('dispatched_actions')
        .eq('id', params.caseId)
        .single()

      const currentDispatches = Array.isArray(caseRow?.dispatched_actions) ? caseRow.dispatched_actions : []
      const newDispatch = {
        id: `DA-${Date.now().toString().slice(-4)}`,
        action_type: params.actionType,
        status: 'Dispatched',
        dispatched_at: new Date().toISOString(),
        reference_id: params.referenceId
      }

      // 2. Update case table
      await supabase
        .from('cases')
        .update({
          status: 'Action Dispatched',
          dispatched_actions: [...currentDispatches, newDispatch]
        })
        .eq('id', params.caseId)

      // 3. Record in case_activity
      await supabase.from('case_activity').insert({
        case_id: params.caseId,
        title: `Action Dispatched: ${params.actionType}`,
        description: `Official redressal action dispatched with Reference ${params.referenceId} by ${params.officerName || 'Authorized Officer'}.`,
        type: 'dispatch',
        timestamp: 'Just now',
        created_at: new Date().toISOString()
      })

      return true
    } catch {
      return false
    }
  }

  // ─── Case Review & Escalation ──────────────────────────────────────────

  /**
   * Mark a case as Reviewed by an officer/psychiatrist.
   */
  static async markCaseReviewed(caseId: string, officerName?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: 'Reviewed' })
        .eq('id', caseId)

      if (!error) {
        try {
          await supabase.from('case_activity').insert({
            case_id: caseId,
            title: `Case Marked Reviewed`,
            description: `Case reviewed and validated by ${officerName || 'Assigned Officer'}.`,
            type: 'review',
            timestamp: 'Just now',
            created_at: new Date().toISOString()
          })
        } catch {}
      }

      return !error
    } catch {
      return false
    }
  }

  /**
   * Escalate a case to senior officials. Sets status to 'Escalated',
   * increments priority tier, and logs to case_activity.
   */
  static async escalateCase(caseId: string, escalatedBy: string, reason: string): Promise<boolean> {
    try {
      // 1. Update case status + priority
      const { error: updateErr } = await supabase
        .from('cases')
        .update({
          status: 'Escalated',
          priority_tier: 1 // Highest priority
        })
        .eq('id', caseId)

      if (updateErr) {
        console.warn('[CaseService] escalateCase update error:', updateErr.message)
        return false
      }

      // 2. Log escalation activity
      await supabase.from('case_activity').insert({
        case_id: caseId,
        title: `Case Escalated to Senior Officials (Tier 1)`,
        description: `Escalated by ${escalatedBy}. Reason: ${reason}`,
        type: 'escalation',
        timestamp: 'Just now',
        created_at: new Date().toISOString()
      })

      return true
    } catch {
      return false
    }
  }

  /**
   * Fetch all escalated cases for the escalation queue.
   */
  static async fetchEscalatedCases(): Promise<CaseRecord[]> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('status', 'Escalated')
        .order('created_at', { ascending: false })

      if (error || !data) return []
      return data.map((row: Record<string, unknown>) => this.dbRowToCaseRecord(row))
    } catch {
      return []
    }
  }

  // ─── Pre/Post Distress Survey ──────────────────────────────────────────

  static async submitDistressSurvey(params: {
    caseId: string
    userId: string
    surveyType: 'pre_intervention' | 'post_intervention'
    stressLevel: number
    anxietyLevel?: number
    safetyFeeling?: number
    notes?: string
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('distress_surveys')
        .insert({
          case_id: params.caseId,
          user_id: params.userId,
          survey_type: params.surveyType,
          stress_level: params.stressLevel,
          anxiety_level: params.anxietyLevel || null,
          safety_feeling: params.safetyFeeling || null,
          notes: params.notes || null,
          created_at: new Date().toISOString()
        })

      if (!error) {
        try {
          await supabase.from('case_activity').insert({
            case_id: params.caseId,
            title: `${params.surveyType === 'pre_intervention' ? 'Pre-Intervention' : 'Post-Intervention'} Distress Survey Logged`,
            description: `Stress Level: ${params.stressLevel}/10, Anxiety: ${params.anxietyLevel ?? 'N/A'}/10, Safety Sense: ${params.safetyFeeling ?? 'N/A'}/10`,
            type: 'survey',
            timestamp: 'Just now',
            created_at: new Date().toISOString()
          })
        } catch {}
      }

      return !error
    } catch {
      return false
    }
  }

  static async fetchDistressSurveys(caseId: string): Promise<Array<{
    id: string
    surveyType: string
    stressLevel: number
    anxietyLevel: number | null
    safetyFeeling: number | null
    notes: string | null
    createdAt: string
  }>> {
    try {
      const { data, error } = await supabase
        .from('distress_surveys')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })

      if (error || !data) return []

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        surveyType: (row.survey_type as string) || '',
        stressLevel: (row.stress_level as number) || 0,
        anxietyLevel: (row.anxiety_level as number) || null,
        safetyFeeling: (row.safety_feeling as number) || null,
        notes: (row.notes as string) || null,
        createdAt: (row.created_at as string) || new Date().toISOString()
      }))
    } catch {
      return []
    }
  }
}

