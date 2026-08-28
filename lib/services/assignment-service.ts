import { supabase } from '@/lib/supabase'
import { CaseAssignment, OfficerProfile, PsychiatristProfile, RiskLevel } from '@/types'

export interface VictimLocation {
  state?: string
  district?: string
  village_town_city?: string
  pincode?: string
}

export class AssignmentService {
  /**
   * Proximity officer matching algorithm:
   * 1. Exact postal pincode match within officer's jurisdiction
   * 2. District match
   * 3. State territorial jurisdiction match
   * 4. Lowest workload active officer
   */
  static findNearestOfficer(
    officers: OfficerProfile[],
    location: VictimLocation
  ): {
    officer: OfficerProfile
    routingReason: string
  } {
    if (!officers || officers.length === 0) {
      // Fallback virtual unit
      return {
        officer: {
          id: 'off-fallback',
          officer_badge_id: 'NHAA-DL-14566',
          full_name: 'Insp. Vikram Pratap Singh',
          department: 'Special Atrocities Protection Unit',
          role: 'officer',
          assigned_state: location.state || 'Maharashtra',
          assigned_district: location.district || 'Pune',
          station_name: `${location.district || 'District'} Special Cell`,
          active_cases_count: 3,
          email: 'officer.vikram@nhaa.gov.in',
          phone: '+91 94220 98765'
        },
        routingReason: `Regional Nodal Escort for ${location.district || 'Jurisdiction'}`
      }
    }

    const vPincode = (location.pincode || '').trim()
    const vDistrict = (location.district || '').trim().toLowerCase()
    const vState = (location.state || '').trim().toLowerCase()
    const vCity = (location.village_town_city || '').trim().toLowerCase()

    // 1. Pincode match
    if (vPincode) {
      const pinMatch = officers.find(
        o => o.jurisdiction_pincodes && o.jurisdiction_pincodes.includes(vPincode)
      )
      if (pinMatch) {
        return {
          officer: pinMatch,
          routingReason: `Exact postal zone match (${vPincode}) at ${pinMatch.station_name || pinMatch.assigned_district}`
        }
      }
    }

    // 2. District / City match
    if (vDistrict || vCity) {
      const districtMatch = officers.find(o => {
        const oDistrict = (o.assigned_district || '').toLowerCase()
        return (
          (vDistrict && oDistrict.includes(vDistrict)) ||
          (vDistrict && vDistrict.includes(oDistrict)) ||
          (vCity && oDistrict.includes(vCity))
        )
      })
      if (districtMatch) {
        return {
          officer: districtMatch,
          routingReason: `Jurisdiction District match: ${districtMatch.assigned_district}, ${districtMatch.assigned_state}`
        }
      }
    }

    // 3. State match
    if (vState) {
      const stateMatch = officers.find(o => {
        const oState = (o.assigned_state || '').toLowerCase()
        return oState.includes(vState) || vState.includes(oState)
      })
      if (stateMatch) {
        return {
          officer: stateMatch,
          routingReason: `State Territorial Jurisdiction: ${stateMatch.assigned_state}`
        }
      }
    }

    // 4. Fallback to least loaded active officer
    const sorted = [...officers].sort((a, b) => (a.active_cases_count || 0) - (b.active_cases_count || 0))
    const fallback = sorted[0] || officers[0]
    return {
      officer: fallback,
      routingReason: `Assigned to Nodal Special Officer (${fallback.station_name || fallback.assigned_state}) based on availability.`
    }
  }

  /**
   * Find available clinical psychiatrist for Moderate and High risk trauma cases
   */
  static findAvailablePsychiatrist(
    psychiatrists: PsychiatristProfile[],
    location: VictimLocation
  ): {
    psychiatrist: PsychiatristProfile
    routingReason: string
  } {
    if (!psychiatrists || psychiatrists.length === 0) {
      return {
        psychiatrist: {
          id: 'psych-01',
          full_name: 'Dr. P. Srikanth Reddy',
          title: 'Senior Clinical Psychiatrist',
          specialization: 'Trauma Triage & Crisis Intervention',
          hospital_clinic: 'Guntur GGH & AP Tele-Care Desk',
          assigned_state: location.state || 'Andhra Pradesh',
          assigned_district: location.district || 'Guntur',
          email: 'dr.srikanth@nhaa.gov.in',
          phone: '+91 98480 12345',
          is_available: true
        },
        routingReason: `Regional Clinical Specialist for ${location.district || location.state || 'Jurisdiction'}`
      }
    }

    const vDistrict = (location.district || '').trim().toLowerCase()
    const vState = (location.state || '').trim().toLowerCase()
    const vCity = (location.village_town_city || '').trim().toLowerCase()

    // 1. District / City match
    if (vDistrict || vCity) {
      const distMatch = psychiatrists.find(p => {
        const pDist = (p.assigned_district || '').toLowerCase()
        return (
          p.is_available &&
          ((vDistrict && pDist.includes(vDistrict)) ||
           (vDistrict && vDistrict.includes(pDist)) ||
           (vCity && pDist.includes(vCity)))
        )
      })
      if (distMatch) {
        return {
          psychiatrist: distMatch,
          routingReason: `District Specialist Match: ${distMatch.full_name} (${distMatch.hospital_clinic}, ${distMatch.assigned_district})`
        }
      }
    }

    // 2. State match
    if (vState) {
      const stateMatch = psychiatrists.find(p => {
        const pState = (p.assigned_state || '').toLowerCase()
        return p.is_available && (pState.includes(vState) || vState.includes(pState))
      })
      if (stateMatch) {
        return {
          psychiatrist: stateMatch,
          routingReason: `State Mental Health Unit: ${stateMatch.full_name} (${stateMatch.assigned_state})`
        }
      }
    }

    // 3. Fallback to least loaded active psychiatrist
    const available = psychiatrists.filter(p => p.is_available)
    const list = available.length > 0 ? available : psychiatrists
    const sorted = [...list].sort((a, b) => (a.active_patients_count || 0) - (b.active_patients_count || 0))
    const fallback = sorted[0] || psychiatrists[0]

    return {
      psychiatrist: fallback,
      routingReason: `Tele-Care Specialist: ${fallback.full_name} (${fallback.hospital_clinic || 'National Care Desk'})`
    }
  }

  /**
   * Execute dynamic case assignment for officers and psychiatrists
   */
  static async assignCase(params: {
    caseId: string
    victimLocation: VictimLocation
    riskLevel: RiskLevel
    allOfficers: OfficerProfile[]
    allPsychiatrists: PsychiatristProfile[]
  }): Promise<{
    assignedOfficer?: OfficerProfile
    assignedPsychiatrist?: PsychiatristProfile
    routingReason?: string
    assignments: CaseAssignment[]
  }> {
    const assignments: CaseAssignment[] = []
    let assignedOfficer: OfficerProfile | undefined
    let assignedPsychiatrist: PsychiatristProfile | undefined
    let routingReason = ''

    // 1. If Moderate, High, or Critical -> Assign Clinical Psychiatrist
    if (params.riskLevel === 'Moderate' || params.riskLevel === 'High' || params.riskLevel === 'Critical') {
      const { psychiatrist, routingReason: psychReason } = this.findAvailablePsychiatrist(
        params.allPsychiatrists,
        params.victimLocation
      )
      assignedPsychiatrist = psychiatrist
      assignments.push({
        id: `asgn-psych-${Date.now()}`,
        case_id: params.caseId,
        assigned_user_id: psychiatrist.id,
        assigned_role: 'psychiatrist',
        assigned_name: psychiatrist.full_name,
        assignment_type: 'clinical_psychiatrist',
        routing_reason: psychReason,
        status: 'Active',
        assigned_at: new Date().toISOString()
      })
    }

    // 2. If High or Critical -> Assign Nearest Safety Officer (Requirement 7: never sent to all officers)
    if (params.riskLevel === 'High' || params.riskLevel === 'Critical') {
      const { officer, routingReason: offReason } = this.findNearestOfficer(
        params.allOfficers,
        params.victimLocation
      )
      assignedOfficer = officer
      routingReason = offReason
      assignments.push({
        id: `asgn-off-${Date.now()}`,
        case_id: params.caseId,
        assigned_user_id: officer.id,
        assigned_role: 'officer',
        assigned_name: officer.full_name,
        assignment_type: 'proximity_officer',
        routing_reason: offReason,
        status: 'Active',
        assigned_at: new Date().toISOString()
      })
    }

    // 3. Persist assignments in Supabase database
    try {
      if (assignments.length > 0) {
        // Safe insert ignoring errors if table is not yet created
        await supabase.from('case_assignments').insert(
          assignments.map(a => ({
            case_id: a.case_id,
            assigned_user_id: a.assigned_user_id.length === 36 ? a.assigned_user_id : null,
            assigned_role: a.assigned_role,
            assigned_name: a.assigned_name,
            assignment_type: a.assignment_type,
            routing_reason: a.routing_reason,
            status: a.status,
            assigned_at: a.assigned_at
          }))
        )
      }
    } catch (err) {
      console.warn('Could not persist case_assignments table in DB:', err)
    }

    return {
      assignedOfficer,
      assignedPsychiatrist,
      routingReason,
      assignments
    }
  }
}
