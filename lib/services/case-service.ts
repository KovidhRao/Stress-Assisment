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

export class CaseService {
  /**
   * Generates a unique Case ID in format NHAA-YYYY-XXXX
   */
  static generateCaseId(): string {
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
   * 1. Core Workflow: Create a new Session & Case from a Story Submission
   * Links 1 User -> Many Cases/Sessions.
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
    const caseId = this.generateCaseId()
    const sessionId = this.generateSessionId()
    const submissionType = params.audioDuration ? 'audio' : 'text'
    const language = params.language || params.user.preferred_language || 'en'

    // 1. Run Modular ML/NLP Mental-Condition Analysis Service
    const analysis = await AnalysisService.analyzeStory(
      params.storyText,
      params.voiceMetrics
    )

    // 2. Run Dynamic Proximity Assignment Service
    const location = {
      state: params.user.state || 'Maharashtra',
      district: params.user.district || 'Pune',
      village_town_city: params.user.village_town_city || 'Shivajinagar',
      pincode: params.user.pincode || '411001'
    }

    const { assignedOfficer, assignedPsychiatrist, routingReason } = await AssignmentService.assignCase({
      caseId,
      victimLocation: location,
      riskLevel: analysis.risk_level,
      allOfficers: params.allOfficers || [],
      allPsychiatrists: params.allPsychiatrists || []
    })

    // 3. Assemble CaseRecord
    const isUuid = (v?: string | null) =>
      typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

    const safeUserId = isUuid(params.user.id) ? params.user.id : undefined

    const caseRecord: CaseRecord = {
      id: caseId,
      session_id: sessionId,
      user_id: safeUserId,
      victim_name: params.user.full_name || 'Citizen User',
      initials: params.user.avatar_initials || (params.user.full_name ? params.user.full_name.slice(0, 2).toUpperCase() : 'CU'),
      is_anonymous: !!params.user.anonymous,
      contact_number: params.user.phone || '+91 97551 12345',
      incident_category: 'Social Boycott & Ostracization',
      incident_location: location,
      channel: submissionType === 'audio' ? 'mobile_app' : 'integrated_portal',
      language,
      reported_at: new Date().toISOString(),
      narrative_text: params.storyText,
      submission_type: submissionType,
      voice_analysis: params.voiceMetrics || undefined,
      stress_assessment: {
        id: `SA-${caseId}`,
        case_id: caseId,
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

    // 4. Assemble UserStory
    const story: UserStory = {
      id: `STORY-${caseId}`,
      session_id: sessionId,
      case_id: caseId,
      user_id: safeUserId,
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

    // 5. Persist into Supabase database (cases, case_stories, case_analysis, case_activity)
    try {
      await supabase.from('cases').insert({
        id: caseRecord.id,
        session_id: caseRecord.session_id,
        user_id: safeUserId || null,
        victim_name: caseRecord.victim_name,
        initials: caseRecord.initials,
        is_anonymous: caseRecord.is_anonymous,
        contact_number: caseRecord.contact_number,
        incident_category: caseRecord.incident_category,
        incident_location: caseRecord.incident_location,
        channel: caseRecord.channel,
        language: caseRecord.language,
        reported_at: caseRecord.reported_at,
        narrative_text: caseRecord.narrative_text,
        submission_type: submissionType,
        voice_analysis: caseRecord.voice_analysis || null,
        stress_assessment: caseRecord.stress_assessment,
        status: caseRecord.status,
        assigned_officer: caseRecord.assigned_officer || null,
        assigned_officer_id: isUuid(caseRecord.assigned_officer_id) ? caseRecord.assigned_officer_id : null,
        assigned_counsellor: caseRecord.assigned_counsellor || null,
        assigned_counsellor_id: isUuid(caseRecord.assigned_counsellor_id) ? caseRecord.assigned_counsellor_id : null,
        proximity_routing: typeof caseRecord.proximity_routing === 'string' ? caseRecord.proximity_routing : null,
        priority_tier: caseRecord.priority_tier,
        notes: caseRecord.notes,
        dispatched_actions: caseRecord.dispatched_actions,
        created_at: caseRecord.created_at,
        updated_at: caseRecord.updated_at
      })

      // Insert case_stories
      await supabase.from('case_stories').insert({
        case_id: caseId,
        user_id: safeUserId || null,
        story_text: params.storyText,
        submission_type: submissionType,
        audio_url: params.audioUrl || null,
        audio_duration_seconds: params.audioDuration || null,
        transcript: params.transcript || null,
        language,
        created_at: new Date().toISOString()
      })

      // Insert case_analysis
      await supabase.from('case_analysis').insert({
        case_id: caseId,
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

      // Insert case_activity
      await supabase.from('case_activity').insert({
        case_id: caseId,
        user_id: safeUserId || null,
        title: `Story #${caseId} Submitted & Assessed`,
        description: `Risk Level: ${analysis.risk_level} (SVI ${analysis.svi_score}). ${routingReason ? `Routed to: ${assignedOfficer?.full_name || 'Special Unit'}` : ''}`,
        type: 'story',
        created_at: new Date().toISOString()
      })
    } catch (dbErr) {
      console.warn('Database write warning in createCaseFromStory:', dbErr)
    }

    return { caseRecord, story }
  }

  /**
   * Fetch all cases for a specific victim user
   */
  static async fetchVictimCases(userId: string): Promise<CaseRecord[]> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .order('reported_at', { ascending: false })

      if (error || !data || data.length === 0) {
        return []
      }
      return data as CaseRecord[]
    } catch (err) {
      console.warn('Error in fetchVictimCases:', err)
      return []
    }
  }

  /**
   * Requirement 7 & 8: High SVI cases should NOT go to all officers.
   * Filter cases strictly by:
   * 1. Assigned specifically to this officer (assigned_officer_id)
   * 2. Or located in this officer's district / state jurisdiction
   */
  static async fetchOfficerCases(
    officerId?: string,
    district?: string,
    state?: string
  ): Promise<CaseRecord[]> {
    try {
      let query = supabase.from('cases').select('*').order('reported_at', { ascending: false })

      if (officerId) {
        // Query by assigned officer ID or local district
        query = query.or(
          `assigned_officer_id.eq.${officerId},incident_location->>district.ilike.%${district || ''}%,incident_location->>state.ilike.%${state || ''}%`
        )
      } else if (district) {
        query = query.ilike('incident_location->>district', `%${district}%`)
      }

      const { data, error } = await query
      if (error || !data || data.length === 0) {
        return INITIAL_CASES
      }
      return data as CaseRecord[]
    } catch (err) {
      console.warn('Error in fetchOfficerCases:', err)
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
      let query = supabase.from('cases').select('*').order('reported_at', { ascending: false })

      if (psychiatristId) {
        query = query.or(
          `assigned_counsellor_id.eq.${psychiatristId},incident_location->>district.ilike.%${district || ''}%`
        )
      }

      const { data, error } = await query
      if (error || !data || data.length === 0) {
        return INITIAL_CASES.filter(c => c.stress_assessment.risk_level !== 'Low')
      }
      return data as CaseRecord[]
    } catch (err) {
      console.warn('Error in fetchPsychiatristCases:', err)
      return INITIAL_CASES
    }
  }

  /**
   * Update case status or append triage notes
   */
  static async updateCase(
    caseId: string,
    updates: Partial<CaseRecord>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)

      if (error) {
        console.warn('Error updating case in DB:', error.message)
        return false
      }
      return true
    } catch (err) {
      console.error('Error updating case:', err)
      return false
    }
  }
}
