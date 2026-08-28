export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export type ChannelType = 'helpline_14566' | 'integrated_portal' | 'chatbot' | 'ivrs' | 'mobile_app'

export type SupportedLanguage = 
  | 'en' // English
  | 'hi' // Hindi
  | 'kn' // Kannada
  | 'te' // Telugu
  | 'ta' // Tamil
  | 'mr' // Marathi
  | 'bn' // Bengali
  | 'gu' // Gujarati

export type IncidentCategory = 
  | 'Caste-based Discrimination'
  | 'Atrocity & Physical Violence'
  | 'Verbal Abuse & Intimidation'
  | 'Social Boycott & Ostracization'
  | 'Land/Property Displacement'
  | 'Sexual Harassment & Assault'
  | 'Denial of Basic Rights & Services'
  | 'Other Grievance'

export interface UserProfile {
  id: string
  email?: string
  full_name: string
  phone?: string
  role: 'victim' | 'officer' | 'counsellor' | 'admin'
  preferred_language?: string
  address_line1?: string
  address_line2?: string
  village_town_city?: string
  district?: string
  state?: string
  pincode?: string
  is_profile_complete?: boolean
  avatar_url?: string
  anonymous?: boolean
  avatar_initials?: string
  created_at: string
  updated_at?: string
}

export interface OfficerProfile {
  id: string
  officer_badge_id: string
  full_name: string
  department: 'Psychological Triage' | 'Law Enforcement Liaison' | 'Legal Aid Cell (NALSA)' | 'District Nodal Redressal' | 'Medical & Emergency'
  role: 'officer' | 'counsellor' | 'admin'
  assigned_state: string
  assigned_district: string
  station_name?: string
  jurisdiction_pincodes?: string[]
  active_cases_count: number
  email: string
  phone: string
  is_available?: boolean
  avatar_url?: string
}

export interface ConsentRecord {
  id: string
  case_id: string
  user_id: string
  consent_type: 'audio_analysis' | 'ai_trauma_screening' | 'emergency_escalation' | 'data_confidentiality'
  consent_given: boolean
  consent_version: string
  given_at: string
  withdrawn_at?: string | null
}

export interface VoiceAnalysisMetrics {
  id?: string
  duration_seconds: number
  transcript: string
  language: string
  speech_rate_wpm: number // words per min (normal: 120-150, distressed: <90 or >180)
  average_pitch_hz: number // normal: 100-240 Hz
  pitch_variation_hz: number // high jitter indicates distress
  energy_level: number // 0 - 100
  pause_duration_ratio: number // ratio of pauses to speech (elevated in trauma)
  acoustic_distress_score: number // 0 - 100
  mfcc_indicators?: string[]
}

export interface NLPIndicators {
  stress: number
  fear: number
  anxiety: number
  distress: number
  trauma: number
  threat: number
  violence: number
  immediate_danger: number
  isolation: number
  vulnerability: number
}

export interface ContributingFactor {
  indicator: string
  contribution: number
}

export interface StressAssessment {
  id: string
  case_id: string
  svi_score: number // 0 to 100
  risk_level: RiskLevel
  trauma_score: number // 0-100
  fear_score: number // 0-100
  anxiety_score: number // 0-100
  depression_indicator: boolean
  suicidal_ideation_flag: boolean
  intimidation_flag: boolean
  social_isolation_flag: boolean
  speech_stress_detected: boolean
  key_trauma_triggers: string[]
  recommended_actions: string[]
  assessed_at: string
  // NHAA NLP Extensions
  situation?: string
  situation_confidence?: number
  indicators?: NLPIndicators
  confidence?: number
  contributing_factors?: ContributingFactor[]
  detected_language?: string
  romanized?: boolean
  safety_escalation_applied?: boolean
}

export interface CaseRecord {
  id: string // e.g. NHAA-2026-8891
  session_id?: string
  user_id?: string
  victim_name: string
  initials: string
  is_anonymous: boolean
  contact_number?: string
  incident_category: IncidentCategory
  incident_location: {
    village_town_city: string
    district: string
    state: string
    pincode?: string
  }
  channel: ChannelType
  language: string
  reported_at: string
  narrative_text: string
  voice_analysis?: VoiceAnalysisMetrics
  stress_assessment: StressAssessment
  status: 'New Intake' | 'Under Triage' | 'Action Dispatched' | 'Counselling Active' | 'Resolved'
  assigned_officer?: string
  assigned_officer_id?: string
  assigned_counsellor?: string
  assigned_counsellor_id?: string
  proximity_routing?: {
    nearest_station: string
    district: string
    state: string
    routing_reason: string
    assigned_at: string
  }
  priority_tier: 1 | 2 | 3 | 4 // 1 is highest / critical
  notes: Array<{
    id: string
    author: string
    role: string
    timestamp: string
    text: string
  }>
  dispatched_actions: Array<{
    id: string
    action_type: 'Police Protection' | 'Legal Aid (NALSA)' | 'Mental Health Counsellor' | 'Medical Hospitalization' | 'Witness Protection' | 'District Collector Notice'
    status: 'Pending' | 'Dispatched' | 'Acknowledged' | 'Completed'
    dispatched_at: string
    reference_id?: string
  }>
}

export interface UserStory {
  id: string
  session_id?: string
  case_id?: string
  title?: string
  narrative_text: string
  audio_url?: string | null
  audio_duration_seconds?: number
  transcript?: string
  language?: string
  created_at: string
  formatted_time: string
  status: 'Shared' | 'Under Review' | 'Support Plan Available' | 'Urgent Review'
  risk_level: RiskLevel
  svi_score: number
  key_triggers?: string[]
  situation?: string
  situation_confidence?: number
  indicators?: NLPIndicators
  confidence?: number
  contributing_factors?: ContributingFactor[]
  assigned_officer_name?: string
  assigned_officer_id?: string
  nearest_station?: string
}

export interface AppointmentRecord {
  id: string
  case_id?: string
  doctor_name: string
  doctor_title: string
  doctor_specialization: string
  slot_time: string
  date: string
  status: 'Confirmed' | 'Completed' | 'Pending'
  meeting_mode: 'Secure Video Call' | 'Telephonic Audio' | 'In-Person Safe Clinic'
  notes?: string
}

export interface TrustedContact {
  id: string
  name: string
  relationship: string
  phone: string
  category: 'professional' | 'trusted' | 'emergency'
  avatar_color?: string
  is_verified?: boolean
  description?: string
  availability?: string
}

export interface UserActivity {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'story' | 'mood' | 'exercise' | 'appointment' | 'support'
}


