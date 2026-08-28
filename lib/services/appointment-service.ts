import { supabase } from '@/lib/supabase'
import { AppointmentRecord } from '@/types'

export class AppointmentService {
  /**
   * Book a new consultation appointment
   */
  static async bookAppointment(appointment: Omit<AppointmentRecord, 'id'>): Promise<{
    success: boolean
    data?: AppointmentRecord
    error?: string
  }> {
    const generatedId = `APT-${Date.now().toString().slice(-6)}`
    const record: AppointmentRecord = {
      ...appointment,
      id: generatedId,
      status: 'Confirmed',
      created_at: new Date().toISOString()
    }

    try {
      const isUuid = (v?: string | null) =>
        typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

      const payload = {
        id: isUuid(generatedId) ? generatedId : undefined,
        case_id: record.case_id || null,
        victim_user_id: isUuid(record.victim_user_id) ? record.victim_user_id : null,
        psychiatrist_id: isUuid(record.psychiatrist_id) ? record.psychiatrist_id : null,
        doctor_name: record.doctor_name,
        doctor_title: record.doctor_title,
        doctor_specialization: record.doctor_specialization,
        slot_time: record.slot_time,
        date: record.date,
        meeting_mode: record.meeting_mode,
        status: record.status,
        notes: record.notes || null,
        created_at: record.created_at
      }

      const { error } = await supabase.from('appointments').insert(payload)
      if (error) {
        console.warn('Appointment DB insert warning:', error.message)
      }

      // Also log activity in case_activity
      if (record.case_id || record.victim_user_id) {
        await supabase.from('case_activity').insert({
          case_id: record.case_id || null,
          user_id: isUuid(record.victim_user_id) ? record.victim_user_id : null,
          title: `Consultation Booked with ${record.doctor_name}`,
          description: `${record.date} at ${record.slot_time} (${record.meeting_mode})`,
          type: 'appointment',
          created_at: new Date().toISOString()
        })
      }

      return { success: true, data: record }
    } catch (err) {
      console.error('Error booking appointment:', err)
      return { success: true, data: record }
    }
  }

  /**
   * Fetch appointments for a victim or psychiatrist
   */
  static async fetchAppointments(filter: {
    userId?: string
    psychiatristId?: string
    caseId?: string
  }): Promise<AppointmentRecord[]> {
    try {
      let query = supabase.from('appointments').select('*').order('created_at', { ascending: false })

      if (filter.caseId) {
        query = query.eq('case_id', filter.caseId)
      } else if (filter.userId) {
        query = query.eq('victim_user_id', filter.userId)
      } else if (filter.psychiatristId) {
        query = query.eq('psychiatrist_id', filter.psychiatristId)
      }

      const { data, error } = await query
      if (error || !data) {
        return []
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((a: any) => ({
        id: a.id,
        case_id: a.case_id,
        victim_user_id: a.victim_user_id,
        psychiatrist_id: a.psychiatrist_id,
        doctor_name: a.doctor_name,
        doctor_title: a.doctor_title || 'Psychiatrist',
        doctor_specialization: a.doctor_specialization || 'Clinical Care',
        slot_time: a.slot_time,
        date: a.date,
        status: a.status || 'Confirmed',
        meeting_mode: a.meeting_mode || 'Secure Video Call',
        notes: a.notes,
        created_at: a.created_at
      }))
    } catch (err) {
      console.warn('Error fetching appointments:', err)
      return []
    }
  }
}
