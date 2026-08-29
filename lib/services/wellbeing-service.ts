import { CaseRecord, RiskLevel } from '@/types'

export interface WellbeingStep {
  id: string
  title: string
  subtitle: string
  status: 'Completed' | 'In Progress' | 'Upcoming' | 'Dispatched'
  category: 'clinical' | 'safety' | 'grounding' | 'legal'
  timeframe: string
}

export interface WellbeingJourneyData {
  caseId: string
  sviScore: number
  riskLevel: RiskLevel
  stageTitle: string
  resilienceScore: number
  keyFocus: string
  steps: WellbeingStep[]
  assignedPsychiatrist?: string
  assignedOfficer?: string
  stationName?: string
}

export class WellbeingService {
  /**
   * Dynamically constructs the Wellbeing Journey for any specific Case Record
   */
  static getJourneyForCase(caseRecord?: CaseRecord | null): WellbeingJourneyData {
    const svi = caseRecord?.stress_assessment?.svi_score ?? 24
    const risk = caseRecord?.stress_assessment?.risk_level ?? 'Low'
    const caseId = caseRecord?.id ?? 'CASE-ACTIVE'
    const assignedPsychiatrist = caseRecord?.assigned_counsellor || 'Dr. P. Srikanth Reddy'
    const assignedOfficer = caseRecord?.assigned_officer || 'Insp. K. Venkatesh Naidu'
    const stationName = typeof caseRecord?.proximity_routing === 'object'
      ? caseRecord.proximity_routing.nearest_station
      : (caseRecord?.incident_location?.district ? `${caseRecord.incident_location.district} Special PoA Unit` : 'Guntur Urban Special PoA Police Station')

    if (risk === 'Critical') {
      return {
        caseId,
        sviScore: svi,
        riskLevel: 'Critical',
        stageTitle: 'Immediate Crisis De-escalation & Emergency Safe Harbor',
        resilienceScore: Math.max(15, 100 - svi),
        keyFocus: 'Priority police escort dispatched, urgent clinical trauma de-escalation, and verified family safety.',
        assignedPsychiatrist,
        assignedOfficer,
        stationName,
        steps: [
          {
            id: 'step-1',
            title: 'Emergency Escort & Safety Patrol',
            subtitle: `Assigned unit: ${assignedOfficer} (${stationName})`,
            status: 'Dispatched',
            category: 'safety',
            timeframe: 'Immediate Patrol Active'
          },
          {
            id: 'step-2',
            title: 'Urgent Clinical Trauma Intake',
            subtitle: `Assigned Specialist: ${assignedPsychiatrist}`,
            status: 'In Progress',
            category: 'clinical',
            timeframe: 'Within 15 minutes'
          },
          {
            id: 'step-3',
            title: 'District Magistrate PoA Notice & Zero-FIR',
            subtitle: 'Mandatory SC/ST Prevention of Atrocities statutory filing',
            status: 'In Progress',
            category: 'legal',
            timeframe: 'Under 2 hours'
          },
          {
            id: 'step-4',
            title: 'Post-Trauma Grounding & Shelter Verification',
            subtitle: 'Safe accommodation & physiological stability check',
            status: 'Upcoming',
            category: 'grounding',
            timeframe: '24-48 Hours'
          }
        ]
      }
    }

    if (risk === 'High') {
      return {
        caseId,
        sviScore: svi,
        riskLevel: 'High',
        stageTitle: 'Trauma Processing, Safety Watch & Legal Redressal',
        resilienceScore: Math.max(25, 100 - svi),
        keyFocus: 'Clinical psychiatric tele-consultation, local SHO monitoring alert, and NALSA free legal counsel.',
        assignedPsychiatrist,
        assignedOfficer,
        stationName,
        steps: [
          {
            id: 'step-1',
            title: '1-on-1 Psychological Tele-Session',
            subtitle: `With ${assignedPsychiatrist} (NIMHANS Trained)`,
            status: 'In Progress',
            category: 'clinical',
            timeframe: 'Scheduled Today'
          },
          {
            id: 'step-2',
            title: 'Local Station Watch & Protection Alert',
            subtitle: `Liaison: ${assignedOfficer} (${stationName})`,
            status: 'Dispatched',
            category: 'safety',
            timeframe: 'Same Day'
          },
          {
            id: 'step-3',
            title: 'NALSA Free Legal Aid Allotment',
            subtitle: 'Advocate assigned for statutory rights protection',
            status: 'Upcoming',
            category: 'legal',
            timeframe: 'Within 48 Hours'
          },
          {
            id: 'step-4',
            title: 'Restorative Care & Emotional Resilience',
            subtitle: 'Guided sound therapy & cognitive stress processing',
            status: 'Upcoming',
            category: 'grounding',
            timeframe: 'Continuous'
          }
        ]
      }
    }

    if (risk === 'Moderate') {
      return {
        caseId,
        sviScore: svi,
        riskLevel: 'Moderate',
        stageTitle: 'Restorative Emotional Support & Guided Redressal',
        resilienceScore: Math.max(45, 100 - svi),
        keyFocus: 'Dedicated tele-counselling slot, grounding breathwork routines, and community support network.',
        assignedPsychiatrist,
        assignedOfficer: undefined,
        stationName: undefined,
        steps: [
          {
            id: 'step-1',
            title: 'Tele-Consultation Booking Available',
            subtitle: `Book a safe tele-call with ${assignedPsychiatrist}`,
            status: 'In Progress',
            category: 'clinical',
            timeframe: 'Self-Scheduled'
          },
          {
            id: 'step-2',
            title: 'Daily 4-4-4 Box Breathing Exercises',
            subtitle: 'Stabilizes autonomic nervous system & reduces cortisol',
            status: 'In Progress',
            category: 'grounding',
            timeframe: 'Daily (Morning & Evening)'
          },
          {
            id: 'step-3',
            title: 'Support Circle & Ally Engagement',
            subtitle: 'Connect with trusted contacts and peer advocates',
            status: 'Upcoming',
            category: 'grounding',
            timeframe: 'Self-Paced'
          },
          {
            id: 'step-4',
            title: 'Legal Rights & PoA Grievance Checklist',
            subtitle: 'Digital documentation guide for official submission',
            status: 'Upcoming',
            category: 'legal',
            timeframe: 'When Ready'
          }
        ]
      }
    }

    // Normal / Low Risk Baseline
    return {
      caseId,
      sviScore: svi,
      riskLevel: 'Low',
      stageTitle: 'Positive Emotional Baseline & Mindfulness Practices',
      resilienceScore: Math.max(75, 100 - svi),
      keyFocus: 'Mindfulness routines, calming soundscapes, mood check-ins, and preventive emotional wellness.',
      assignedPsychiatrist: undefined,
      assignedOfficer: undefined,
      stationName: undefined,
      steps: [
        {
          id: 'step-1',
          title: 'Daily Mood & Emotional Check-in',
          subtitle: 'Keep track of feelings to sustain mental wellness',
          status: 'In Progress',
          category: 'grounding',
          timeframe: 'Daily'
        },
        {
          id: 'step-2',
          title: 'Zen Relaxation & 432 Hz Soundscapes',
          subtitle: 'Immersive restorative sound therapy',
          status: 'In Progress',
          category: 'grounding',
          timeframe: 'Anytime'
        },
        {
          id: 'step-3',
          title: 'Community Empowerment & Rights Hub',
          subtitle: 'Educational brochures & helpline 14566 speed dial',
          status: 'Upcoming',
          category: 'legal',
          timeframe: 'Self-Paced'
        }
      ]
    }
  }
}
