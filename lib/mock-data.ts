import { CaseRecord, OfficerProfile, UserStory, TrustedContact, UserActivity, AppointmentRecord } from '@/types'

export const DEFAULT_OFFICERS: OfficerProfile[] = [
  {
    id: 'OFF-01',
    officer_badge_id: 'NHAA-DL-8092',
    full_name: 'Dr. Ramesh Chandra',
    department: 'Psychological Triage',
    role: 'counsellor',
    assigned_state: 'National HQ (New Delhi)',
    assigned_district: 'Central Delhi',
    active_cases_count: 8,
    email: 'dr.chandra@nhaa.gov.in',
    phone: '+91 98101 23456'
  },
  {
    id: 'OFF-02',
    officer_badge_id: 'NHAA-MH-4421',
    full_name: 'Insp. Vikram Pratap Singh',
    department: 'Law Enforcement Liaison',
    role: 'officer',
    assigned_state: 'Maharashtra',
    assigned_district: 'Pune',
    active_cases_count: 5,
    email: 'vikram.singh@mahapolice.gov.in',
    phone: '+91 94220 98765'
  },
  {
    id: 'OFF-03',
    officer_badge_id: 'NHAA-UP-3319',
    full_name: 'Adv. Radhika Nair',
    department: 'Legal Aid Cell (NALSA)',
    role: 'officer',
    assigned_state: 'Uttar Pradesh',
    assigned_district: 'Lucknow',
    active_cases_count: 11,
    email: 'radhika.nair@nalsa.gov.in',
    phone: '+91 97112 34567'
  },
  {
    id: 'OFF-04',
    officer_badge_id: 'NHAA-RJ-6712',
    full_name: 'Sunita Devi IAS',
    department: 'District Nodal Redressal',
    role: 'admin',
    assigned_state: 'Rajasthan',
    assigned_district: 'Jaipur',
    active_cases_count: 14,
    email: 'sunita.devi@rajasthan.gov.in',
    phone: '+91 94140 11223'
  }
]

export const INITIAL_CASES: CaseRecord[] = [
  {
    id: 'NHAA-2026-9041',
    victim_name: 'Suresh Kumar Valmiki',
    initials: 'SK',
    is_anonymous: false,
    contact_number: '+91 98765 43210',
    incident_category: 'Social Boycott & Ostracization',
    incident_location: {
      village_town_city: 'Khandwa Gram',
      district: 'Khargone',
      state: 'Madhya Pradesh',
      pincode: '451001'
    },
    channel: 'helpline_14566',
    language: 'Hindi',
    reported_at: '10 minutes ago',
    narrative_text: 'Gram panchayat ke pradhan aur logon ne hamare parivar ka social boycott kar diya hai. Handpump se paani lene par rok laga di hai aur dukano se rashan band hai. Kal raat ghar par patthar feke gaye aur jaan se marne ki dhamki di gayi. Hum bohot dare hue hain, bachhe raat bhar ro rahe hain.',
    voice_analysis: {
      duration_seconds: 48,
      transcript: 'Hamare parivar ka pani band kar diya hai, raat ko ghar par patthar mar rahe hain. Hum bachhe lekar kahan jayein, hume mar denge agar police ko bataya.',
      language: 'Hindi',
      speech_rate_wpm: 82, // abnormally low / choked
      average_pitch_hz: 215,
      pitch_variation_hz: 48, // high jitter
      energy_level: 28,
      pause_duration_ratio: 0.42,
      acoustic_distress_score: 89,
      mfcc_indicators: ['tremor_frequency_high', 'respiratory_irregularity', 'choked_phonation']
    },
    stress_assessment: {
      id: 'SA-9041',
      case_id: 'NHAA-2026-9041',
      svi_score: 92,
      risk_level: 'Critical',
      trauma_score: 88,
      fear_score: 95,
      anxiety_score: 90,
      depression_indicator: true,
      suicidal_ideation_flag: false,
      intimidation_flag: true,
      social_isolation_flag: true,
      speech_stress_detected: true,
      key_trauma_triggers: ['social boycott', 'pani band', 'jaan se marne', 'dhamki', 'bachhe ro rahe hain'],
      recommended_actions: [
        'Immediate Emergency Police Escort & Protection Dispatch',
        'District Magistrate (DM) Special Investigation Directive',
        'Urgent Mental Health Crisis Support within 15 min',
        'Restoration of Essential Water & Food Supplies by Local Tehsildar'
      ],
      assessed_at: '2026-08-25T17:15:00Z'
    },
    status: 'New Intake',
    assigned_officer: 'Dr. Ramesh Chandra',
    priority_tier: 1,
    notes: [
      {
        id: 'N-1',
        author: 'AI Triage Engine',
        role: 'Automated Diagnostic',
        timestamp: '10 min ago',
        text: 'Critical SVI (92) triggered due to active threats to life, village ostracization, and acoustic distress patterns in voice recording.'
      }
    ],
    dispatched_actions: []
  },
  {
    id: 'NHAA-2026-8984',
    victim_name: 'Pooja Rani Meghwal',
    initials: 'PR',
    is_anonymous: false,
    contact_number: '+91 98290 87654',
    incident_category: 'Atrocity & Physical Violence',
    incident_location: {
      village_town_city: 'Deedwana',
      district: 'Nagaur',
      state: 'Rajasthan',
      pincode: '341303'
    },
    channel: 'integrated_portal',
    language: 'Hindi / Rajasthani',
    reported_at: '35 minutes ago',
    narrative_text: 'My brother was assaulted while returning from college by upper caste youth after he drank water from a public utensil. He suffered head injuries and bleeding. Local police station initially refused to lodge SC/ST PoA Act FIR.',
    stress_assessment: {
      id: 'SA-8984',
      case_id: 'NHAA-2026-8984',
      svi_score: 78,
      risk_level: 'Critical',
      trauma_score: 82,
      fear_score: 75,
      anxiety_score: 80,
      depression_indicator: false,
      suicidal_ideation_flag: false,
      intimidation_flag: true,
      social_isolation_flag: false,
      speech_stress_detected: false,
      key_trauma_triggers: ['assaulted', 'head injuries', 'bleeding', 'refused fir', 'upper caste'],
      recommended_actions: [
        'Mandatory SC/ST PoA FIR Registration Notice to SP Nagaur',
        'NALSA Free Legal Aid Counsel Assignment',
        'Immediate Medical Evaluation & Medicolegal Report'
      ],
      assessed_at: '2026-08-25T16:50:00Z'
    },
    status: 'Under Triage',
    assigned_officer: 'Insp. Vikram Pratap Singh',
    priority_tier: 1,
    notes: [
      {
        id: 'N-2',
        author: 'Insp. Vikram Pratap Singh',
        role: 'Law Enforcement Liaison',
        timestamp: '20 min ago',
        text: 'Contacted Nagaur SP office. Zero FIR directed to be registered under Sec 3(1)(r)(s) & 3(2)(va) SC/ST Prevention of Atrocities Act.'
      }
    ],
    dispatched_actions: [
      {
        id: 'DA-101',
        action_type: 'Police Protection',
        status: 'Dispatched',
        dispatched_at: '20 min ago',
        reference_id: 'POL-RJ-992'
      }
    ]
  },
  {
    id: 'NHAA-2026-8921',
    victim_name: 'Ananya S. Gond',
    initials: 'AS',
    is_anonymous: false,
    contact_number: '+91 97551 12345',
    incident_category: 'Caste-based Discrimination',
    incident_location: {
      village_town_city: 'Dindori',
      district: 'Dindori',
      state: 'Madhya Pradesh',
      pincode: '481880'
    },
    channel: 'mobile_app',
    language: 'English / Hindi',
    reported_at: '1 hour ago',
    narrative_text: 'Facing continuous casteist remarks and systematic isolation in hostel by senior batchmates. I feel constantly anxious, unable to concentrate on studies, and having severe sleep disturbances and panic attacks.',
    voice_analysis: {
      duration_seconds: 35,
      transcript: 'I feel very isolated in the college hostel. Every day they pass humiliating comments and I cannot sleep at night.',
      language: 'English',
      speech_rate_wpm: 104,
      average_pitch_hz: 240,
      pitch_variation_hz: 32,
      energy_level: 42,
      pause_duration_ratio: 0.28,
      acoustic_distress_score: 62,
      mfcc_indicators: ['vocal_fatigue', 'moderate_acoustic_tension']
    },
    stress_assessment: {
      id: 'SA-8921',
      case_id: 'NHAA-2026-8921',
      svi_score: 64,
      risk_level: 'High',
      trauma_score: 60,
      fear_score: 55,
      anxiety_score: 78,
      depression_indicator: true,
      suicidal_ideation_flag: false,
      intimidation_flag: true,
      social_isolation_flag: true,
      speech_stress_detected: true,
      key_trauma_triggers: ['casteist remarks', 'isolation', 'panic attacks', 'cannot sleep'],
      recommended_actions: [
        'Schedule Dedicated Tele-Counsellor (Clinical Psychologist)',
        'Anti-Discrimination Cell (Equal Opportunity Cell) University Notice',
        'Follow-up Grounding & Resilience Modules'
      ],
      assessed_at: '2026-08-25T16:20:00Z'
    },
    status: 'Counselling Active',
    assigned_counsellor: 'Dr. Ramesh Chandra',
    priority_tier: 2,
    notes: [
      {
        id: 'N-3',
        author: 'Dr. Ramesh Chandra',
        role: 'Psychological Triage',
        timestamp: '30 min ago',
        text: 'Initial 15-minute grounding session completed. Scheduled weekly cognitive emotional processing.'
      }
    ],
    dispatched_actions: [
      {
        id: 'DA-102',
        action_type: 'Mental Health Counsellor',
        status: 'Acknowledged',
        dispatched_at: '45 min ago',
        reference_id: 'MH-DEL-410'
      }
    ]
  },
  {
    id: 'NHAA-2026-8860',
    victim_name: 'Muthuvelan K.',
    initials: 'MK',
    is_anonymous: false,
    contact_number: '+91 94433 22110',
    incident_category: 'Land/Property Displacement',
    incident_location: {
      village_town_city: 'Tirunelveli Rural',
      district: 'Tirunelveli',
      state: 'Tamil Nadu',
      pincode: '627001'
    },
    channel: 'ivrs',
    language: 'Tamil',
    reported_at: '3 hours ago',
    narrative_text: 'Encroachment and destruction of agricultural fencing on assigned Panchami land by local influential landlords. Seeking legal assistance and revenue department boundary survey verification.',
    stress_assessment: {
      id: 'SA-8860',
      case_id: 'NHAA-2026-8860',
      svi_score: 42,
      risk_level: 'Moderate',
      trauma_score: 35,
      fear_score: 45,
      anxiety_score: 48,
      depression_indicator: false,
      suicidal_ideation_flag: false,
      intimidation_flag: true,
      social_isolation_flag: false,
      speech_stress_detected: false,
      key_trauma_triggers: ['encroachment', 'panchami land', 'destruction'],
      recommended_actions: [
        'SLSA Free Legal Advocate Allotment for Land Title Protection',
        'Revenue Divisional Officer (RDO) Inquiry Request',
        '48-Hour Safety Check-in'
      ],
      assessed_at: '2026-08-25T14:10:00Z'
    },
    status: 'Action Dispatched',
    assigned_officer: 'Adv. Radhika Nair',
    priority_tier: 3,
    notes: [],
    dispatched_actions: [
      {
        id: 'DA-103',
        action_type: 'Legal Aid (NALSA)',
        status: 'Dispatched',
        dispatched_at: '2 hours ago',
        reference_id: 'NALSA-TN-552'
      }
    ]
  }
]

export const INITIAL_STORIES: UserStory[] = [
  {
    id: 'STORY-01',
    title: 'Hostel isolation & discriminatory remarks',
    narrative_text: 'Facing continuous casteist remarks and systematic isolation in hostel by senior batchmates. I feel constantly anxious, unable to concentrate on studies, and having severe sleep disturbances and panic attacks.',
    audio_url: null,
    audio_duration_seconds: 35,
    transcript: 'I feel very isolated in the college hostel. Every day they pass humiliating comments and I cannot sleep at night.',
    language: 'English',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    formatted_time: 'Today, 1 hour ago',
    status: 'Support Plan Available',
    risk_level: 'High',
    svi_score: 64,
    key_triggers: ['casteist remarks', 'isolation', 'panic attacks', 'cannot sleep']
  },
  {
    id: 'STORY-02',
    title: 'First incident during seminar lab',
    narrative_text: 'Two weeks ago during lab allocation, they deliberately refused to share equipment and passed derogatory slurs about reserved category admissions. I reported to the warden but no action was taken.',
    audio_url: null,
    audio_duration_seconds: 22,
    transcript: 'Warden refused to accept my written letter and told me to adjust with other girls.',
    language: 'Hindi',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    formatted_time: '2 days ago',
    status: 'Under Review',
    risk_level: 'Moderate',
    svi_score: 52,
    key_triggers: ['derogatory slurs', 'warden ignored', 'lab equipment']
  }
]

export const INITIAL_CONTACTS: TrustedContact[] = [
  {
    id: 'TC-01',
    name: 'Dr. Ramesh Chandra',
    relationship: 'Assigned Senior Psychiatrist',
    phone: '+91 98101 23456',
    category: 'professional',
    avatar_color: '#1d8272',
    is_verified: true,
    description: 'Lead Clinical Triage · NIMHANS Trained · NHAA Tele-Care',
    availability: 'Available Today (10 AM - 7 PM)'
  },
  {
    id: 'TC-02',
    name: 'Adv. Radhika Nair',
    relationship: 'NALSA Legal Aid Counsel',
    phone: '+91 97112 34567',
    category: 'professional',
    avatar_color: '#3b82f6',
    is_verified: true,
    description: 'PoA Act Specialist · State Legal Services Authority',
    availability: 'On Duty'
  },
  {
    id: 'TC-03',
    name: 'Insp. Vikram Pratap Singh',
    relationship: 'Police Law Enforcement Liaison',
    phone: '+91 94220 98765',
    category: 'emergency',
    avatar_color: '#dc2626',
    is_verified: true,
    description: 'Special Atrocities Protection Unit · Rapid Response',
    availability: '24x7 Emergency Patrol'
  },
  {
    id: 'TC-04',
    name: 'Pooja Sharma',
    relationship: 'Sister / Trusted Family',
    phone: '+91 98765 11223',
    category: 'trusted',
    avatar_color: '#8b5cf6',
    is_verified: false,
    description: 'Primary Emergency Contact · Bhopal',
    availability: 'Always Reachable'
  },
  {
    id: 'TC-05',
    name: 'Aditi Verma',
    relationship: 'College Friend',
    phone: '+91 98234 56789',
    category: 'trusted',
    avatar_color: '#ec4899',
    is_verified: false,
    description: 'Campus Peer Ally · Block B Hostel',
    availability: 'On Campus'
  },
  {
    id: 'TC-06',
    name: 'National Helpline 14566',
    relationship: 'Ministry of Social Justice 24x7 Hotline',
    phone: '14566',
    category: 'emergency',
    avatar_color: '#1e8574',
    is_verified: true,
    description: 'Toll-Free National Atrocities Helpline · Multilingual',
    availability: '24x7 Live Desk'
  },
  {
    id: 'TC-07',
    name: 'National Emergency 112',
    relationship: 'All-India Police & Disaster Dispatch',
    phone: '112',
    category: 'emergency',
    avatar_color: '#b91c1c',
    is_verified: true,
    description: 'Immediate Police & PCR Van Dispatch',
    availability: '24x7 Immediate'
  }
]

export const INITIAL_ACTIVITIES: UserActivity[] = [
  {
    id: 'ACT-01',
    title: 'Story safely submitted & analyzed',
    description: 'AI Stress Vulnerability assessment completed with high accuracy.',
    timestamp: '1 hour ago',
    type: 'story'
  },
  {
    id: 'ACT-02',
    title: 'Daily mood recorded: Stressed',
    description: 'Grounding recommendations customized for emotional relief.',
    timestamp: '3 hours ago',
    type: 'mood'
  },
  {
    id: 'ACT-03',
    title: 'Box Breathing session completed',
    description: 'Completed 4 full cycles of 4-4-4 rhythm to stabilize heart rate.',
    timestamp: 'Yesterday',
    type: 'exercise'
  },
  {
    id: 'ACT-04',
    title: 'Psychiatrist assigned to your profile',
    description: 'Dr. Ramesh Chandra received your support dossier.',
    timestamp: '2 days ago',
    type: 'support'
  }
]

export const AVAILABLE_APPOINTMENT_SLOTS = [
  { id: 'slot-1', date: 'Today', time: '4:00 PM', period: 'Evening' },
  { id: 'slot-2', date: 'Today', time: '6:30 PM', period: 'Evening' },
  { id: 'slot-3', date: 'Tomorrow', time: '10:00 AM', period: 'Morning' },
  { id: 'slot-4', date: 'Tomorrow', time: '3:00 PM', period: 'Afternoon' },
  { id: 'slot-5', date: 'Day After Tomorrow', time: '11:30 AM', period: 'Morning' }
]

