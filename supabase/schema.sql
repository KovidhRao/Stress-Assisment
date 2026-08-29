-- ==============================================================================
-- NHAA 14566 & Citizen Stress Assessment Platform - Upgraded Supabase Schema
-- Run this ENTIRE file in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT,
  full_name           TEXT,
  phone               TEXT,
  role                TEXT DEFAULT 'victim', -- 'victim', 'officer', 'psychiatrist', 'counsellor', 'admin'
  gender              TEXT,
  age_group           TEXT,
  preferred_language  TEXT DEFAULT 'en',
  is_profile_complete BOOLEAN DEFAULT false,
  is_active           BOOLEAN DEFAULT true,
  anonymous           BOOLEAN DEFAULT false,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for idempotent re-runs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT false;

-- 3. Addresses Table (Linked to User Profiles)
CREATE TABLE IF NOT EXISTS public.addresses (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_line1     TEXT DEFAULT '',
  address_line2     TEXT DEFAULT '',
  village_town_city TEXT DEFAULT '',
  district          TEXT DEFAULT '',
  state             TEXT DEFAULT '',
  pincode           TEXT DEFAULT '',
  latitude          FLOAT,
  longitude         FLOAT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Police & Safety Officers Table
CREATE TABLE IF NOT EXISTS public.officers (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  officer_badge_id      TEXT UNIQUE NOT NULL,
  full_name             TEXT NOT NULL,
  department            TEXT DEFAULT 'Law Enforcement Liaison',
  role                  TEXT NOT NULL DEFAULT 'officer',
  assigned_state        TEXT NOT NULL,
  assigned_district     TEXT NOT NULL,
  station_name          TEXT,
  jurisdiction_pincodes TEXT[] DEFAULT '{}',
  active_cases_count    INT DEFAULT 0,
  email                 TEXT,
  phone                 TEXT,
  is_available          BOOLEAN DEFAULT true,
  avatar_url            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Psychiatrists & Clinical Specialists Table
CREATE TABLE IF NOT EXISTS public.psychiatrists (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name             TEXT NOT NULL,
  title                 TEXT DEFAULT 'Senior Clinical Psychiatrist',
  specialization        TEXT DEFAULT 'Trauma & Psychological Triage',
  hospital_clinic       TEXT DEFAULT 'NIMHANS / NHAA Tele-Care',
  assigned_state        TEXT NOT NULL,
  assigned_district     TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  is_available          BOOLEAN DEFAULT true,
  avatar_url            TEXT,
  active_patients_count INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Central Cases Table (1 User → Many Cases)
CREATE TABLE IF NOT EXISTS public.cases (
  id                    TEXT PRIMARY KEY,       -- e.g. NHAA-2026-8891 or CASE-2026-0001
  session_id            TEXT,                   -- e.g. SESS-928471
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name           TEXT,                   -- display name / alias
  initials              TEXT,                   -- avatar initials
  is_anonymous          BOOLEAN DEFAULT false,
  contact_number        TEXT,
  incident_category     TEXT DEFAULT 'Caste-based Discrimination',
  incident_location     JSONB DEFAULT '{"village_town_city": "", "district": "", "state": "", "pincode": ""}'::jsonb,
  channel               TEXT DEFAULT 'integrated_portal',
  language              TEXT DEFAULT 'en',
  reported_at           TIMESTAMPTZ DEFAULT NOW(),
  narrative_text        TEXT,
  submission_type       TEXT DEFAULT 'text',     -- 'text' or 'audio'
  voice_analysis        JSONB,
  stress_assessment     JSONB,
  status                TEXT DEFAULT 'New Intake', -- 'New Intake', 'Under Triage', 'Action Dispatched', 'Counselling Active', 'Resolved'
  assigned_officer      TEXT,                    -- officer display name
  assigned_officer_id   UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  assigned_counsellor   TEXT,                    -- counsellor display name
  assigned_counsellor_id UUID REFERENCES public.psychiatrists(id) ON DELETE SET NULL,
  proximity_routing     TEXT,
  priority_tier         INT DEFAULT 3,
  notes                 JSONB DEFAULT '[]'::jsonb,
  dispatched_actions    JSONB DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all expected columns exist (for idempotent re-runs on existing DBs)
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS victim_name TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS initials TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS incident_category TEXT DEFAULT 'Caste-based Discrimination';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'text';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS voice_analysis JSONB;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS stress_assessment JSONB;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New Intake';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_officer TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_counsellor TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_counsellor_id UUID REFERENCES public.psychiatrists(id) ON DELETE SET NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS proximity_routing TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS priority_tier INT DEFAULT 3;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS dispatched_actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS narrative_text TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'integrated_portal';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS incident_location JSONB DEFAULT '{"village_town_city": "", "district": "", "state": "", "pincode": ""}'::jsonb;

-- 7. Case Stories Table (Stores submitted narrative / voice per case)
CREATE TABLE IF NOT EXISTS public.case_stories (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id                TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  story_text             TEXT NOT NULL,
  submission_type        TEXT DEFAULT 'text',
  audio_url              TEXT,
  audio_duration_seconds INT,
  transcript             TEXT,
  language               TEXT DEFAULT 'en',
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Case Analysis Table (Stores ML/NLP & SVI Results)
CREATE TABLE IF NOT EXISTS public.case_analysis (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id             TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  svi_score           INT NOT NULL,
  risk_level          TEXT NOT NULL, -- 'Low', 'Moderate', 'High', 'Critical'
  detected_conditions TEXT[] DEFAULT '{}',
  confidence          FLOAT DEFAULT 0.9,
  fear_score          INT DEFAULT 0,
  trauma_score        INT DEFAULT 0,
  anxiety_score       INT DEFAULT 0,
  key_triggers        TEXT[] DEFAULT '{}',
  recommendations     TEXT[] DEFAULT '{}',
  model_version       TEXT DEFAULT 'nlp-distilbert-trauma-v1',
  analyzed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Case Assignments Table (Proximity Officer & Clinical Psychiatrist Assignments)
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id          TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  assigned_user_id UUID,
  assigned_role    TEXT NOT NULL, -- 'officer' or 'psychiatrist'
  assigned_name    TEXT NOT NULL,
  assignment_type  TEXT NOT NULL, -- 'proximity_officer' or 'clinical_psychiatrist'
  routing_reason   TEXT,
  status           TEXT DEFAULT 'Active', -- 'Pending', 'Active', 'Acknowledged', 'Completed'
  assigned_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Appointments Table (Tele-Consultations between Victims and Psychiatrists)
CREATE TABLE IF NOT EXISTS public.appointments (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id                TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  victim_user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  psychiatrist_id        UUID REFERENCES public.psychiatrists(id) ON DELETE SET NULL,
  doctor_name            TEXT NOT NULL,
  doctor_title           TEXT,
  doctor_specialization  TEXT,
  slot_time              TEXT NOT NULL,
  date                   TEXT NOT NULL,
  meeting_mode           TEXT DEFAULT 'Secure Video Call',
  status                 TEXT DEFAULT 'Confirmed', -- 'Confirmed', 'Completed', 'Cancelled'
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Case Activity & Milestone History Table
CREATE TABLE IF NOT EXISTS public.case_activity (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id     TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'story', -- 'story', 'mood', 'exercise', 'appointment', 'support', 'triage'
  timestamp   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure timestamp column exists
ALTER TABLE public.case_activity ADD COLUMN IF NOT EXISTS timestamp TEXT;

-- 12. Trusted Contacts Table
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT,
  phone        TEXT NOT NULL,
  category     TEXT DEFAULT 'trusted', -- 'professional', 'trusted', 'emergency'
  avatar_color TEXT DEFAULT '#1d8272',
  is_verified  BOOLEAN DEFAULT false,
  description  TEXT,
  availability TEXT DEFAULT 'Always Reachable',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychiatrists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_stories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

-- 14. Permissive Access Policies (for development / active redressal flow)
-- NOTE: For production, replace these with role-based policies using JWT claims.

-- Profiles: users can read all (for officer/psychiatrist lookup), write own
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles service role all" ON public.profiles;
CREATE POLICY "Profiles service role all" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Addresses: users can read all, write own
DROP POLICY IF EXISTS "Addresses read" ON public.addresses;
CREATE POLICY "Addresses read" ON public.addresses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Addresses write own" ON public.addresses;
CREATE POLICY "Addresses write own" ON public.addresses FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Officers & Psychiatrists: public read
DROP POLICY IF EXISTS "Officers read" ON public.officers;
CREATE POLICY "Officers read" ON public.officers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Officers write" ON public.officers;
CREATE POLICY "Officers write" ON public.officers FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Psychiatrists read" ON public.psychiatrists;
CREATE POLICY "Psychiatrists read" ON public.psychiatrists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Psychiatrists write" ON public.psychiatrists;
CREATE POLICY "Psychiatrists write" ON public.psychiatrists FOR ALL USING (auth.role() = 'service_role');

-- Cases: authenticated users can read/write (needed for victim + officer + psychiatrist views)
DROP POLICY IF EXISTS "Cases read" ON public.cases;
CREATE POLICY "Cases read" ON public.cases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Cases insert" ON public.cases;
CREATE POLICY "Cases insert" ON public.cases FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Cases update" ON public.cases;
CREATE POLICY "Cases update" ON public.cases FOR UPDATE USING (true);

-- Case Stories, Analysis, Assignments, Activity, Appointments: open for insert/read/update
DROP POLICY IF EXISTS "Case stories access" ON public.case_stories;
CREATE POLICY "Case stories access" ON public.case_stories FOR ALL USING (true);
DROP POLICY IF EXISTS "Case analysis access" ON public.case_analysis;
CREATE POLICY "Case analysis access" ON public.case_analysis FOR ALL USING (true);
DROP POLICY IF EXISTS "Case assignments access" ON public.case_assignments;
CREATE POLICY "Case assignments access" ON public.case_assignments FOR ALL USING (true);
DROP POLICY IF EXISTS "Appointments access" ON public.appointments;
CREATE POLICY "Appointments access" ON public.appointments FOR ALL USING (true);
DROP POLICY IF EXISTS "Case activity access" ON public.case_activity;
CREATE POLICY "Case activity access" ON public.case_activity FOR ALL USING (true);
DROP POLICY IF EXISTS "Trusted contacts access" ON public.trusted_contacts;
CREATE POLICY "Trusted contacts access" ON public.trusted_contacts FOR ALL USING (true);

-- 15. Auth Signup Trigger (Auto create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, preferred_language, is_profile_complete, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'victim'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 16. Enable Supabase Realtime Publications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.case_activity;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.case_assignments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 17. Consents Table
CREATE TABLE IF NOT EXISTS public.consents (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id         TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type    TEXT DEFAULT 'biometric_and_voice_screening',
  consent_given   BOOLEAN DEFAULT true,
  consent_version TEXT DEFAULT 'v2.1',
  given_at        TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at    TIMESTAMPTZ
);

-- 18. Officer Locations Table
CREATE TABLE IF NOT EXISTS public.officer_locations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  officer_id      UUID REFERENCES public.officers(id) ON DELETE CASCADE,
  district        TEXT NOT NULL,
  state           TEXT NOT NULL,
  station_name    TEXT,
  latitude        FLOAT,
  longitude       FLOAT,
  is_active       BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_reported_at ON public.cases(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_officer_id ON public.cases(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_counsellor_id ON public.cases(assigned_counsellor_id);
CREATE INDEX IF NOT EXISTS idx_case_stories_case_id ON public.case_stories(case_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_case_id ON public.case_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON public.case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_victim_user_id ON public.appointments(victim_user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_psychiatrist_id ON public.appointments(psychiatrist_id);
CREATE INDEX IF NOT EXISTS idx_case_activity_case_id ON public.case_activity(case_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 20. Seed 4 Regional Police Officers
INSERT INTO public.officers (id, officer_badge_id, full_name, department, role, assigned_state, assigned_district, station_name, jurisdiction_pincodes, active_cases_count, email, phone, is_available)
VALUES
  ('c0a80121-0001-4000-8000-000000000001', 'AP-GNT-8821', 'Insp. K. Venkatesh Naidu', 'Special Atrocities Protection Cell', 'officer', 'Andhra Pradesh', 'Guntur', 'Guntur Urban Special PoA Police Station', ARRAY['522001', '522002', '522003', '522004', '522006', '522019', '522501'], 2, 'insp.venkatesh@ap.police.gov.in', '+91 94407 98821', true),
  ('c0a80121-0001-4000-8000-000000000002', 'MH-PUN-3309', 'Insp. Sunita Deshmukh', 'Atrocities Redressal & Rapid Escort Unit', 'officer', 'Maharashtra', 'Pune', 'Pune Division PoA Redressal Wing', ARRAY['411001', '411002', '411004', '411014', '411038', '411057'], 3, 'insp.sunita@mahapolice.gov.in', '+91 94220 98765', true),
  ('c0a80121-0001-4000-8000-000000000003', 'RJ-JPR-4412', 'Insp. Rajesh Kumar Rathore', 'Law Enforcement Liaison', 'officer', 'Rajasthan', 'Jaipur', 'Jaipur South Special SC/ST Cell', ARRAY['302001', '302002', '302015', '302020', '302033'], 1, 'insp.rajesh@rajasthan.police.gov.in', '+91 98290 14412', true),
  ('c0a80121-0001-4000-8000-000000000004', 'KA-BLR-5501', 'Insp. M. Anand Kumar', 'Special Protection Wing', 'officer', 'Karnataka', 'Bengaluru Urban', 'Bengaluru Central PoA Redressal Unit', ARRAY['560001', '560002', '560025', '560034', '560095'], 2, 'insp.anand@ksp.gov.in', '+91 94808 05501', true)
ON CONFLICT (officer_badge_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  assigned_state = EXCLUDED.assigned_state,
  assigned_district = EXCLUDED.assigned_district,
  station_name = EXCLUDED.station_name,
  jurisdiction_pincodes = EXCLUDED.jurisdiction_pincodes;

-- 21. Seed 4 Regional Clinical Psychiatrists
INSERT INTO public.psychiatrists (id, full_name, title, specialization, hospital_clinic, assigned_state, assigned_district, email, phone, is_available, active_patients_count)
VALUES
  ('d0a80121-0002-4000-8000-000000000001', 'Dr. P. Srikanth Reddy', 'Senior Clinical Psychiatrist', 'Trauma Triage & Crisis Intervention', 'Guntur GGH & AP Tele-Care Desk', 'Andhra Pradesh', 'Guntur', 'dr.srikanth@nhaa.gov.in', '+91 98480 12345', true, 3),
  ('d0a80121-0002-4000-8000-000000000002', 'Dr. Anjali Patil', 'Clinical Neuro-Psychiatrist', 'Trauma & Psychological Triage', 'B.J. Medical College & NHAA Tele-Care', 'Maharashtra', 'Pune', 'dr.anjali@nhaa.gov.in', '+91 98220 54321', true, 2),
  ('d0a80121-0002-4000-8000-000000000003', 'Dr. Meenakshi Sharma', 'Consultant Clinical Psychologist', 'Post-Trauma Stress & Anxiety Care', 'SMS Medical College Triage Unit', 'Rajasthan', 'Jaipur', 'dr.meenakshi@nhaa.gov.in', '+91 94140 67890', true, 1),
  ('d0a80121-0002-4000-8000-000000000004', 'Dr. Ramesh Chandra', 'Lead Clinical Psychiatrist', 'Trauma Triage & Psychological First Aid', 'NIMHANS Trauma Centre', 'Karnataka', 'Bengaluru Urban', 'dr.ramesh@nhaa.gov.in', '+91 98101 23456', true, 4)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  hospital_clinic = EXCLUDED.hospital_clinic,
  assigned_state = EXCLUDED.assigned_state,
  assigned_district = EXCLUDED.assigned_district;
