-- =============================================================================
-- MIGRATION: Bridge existing Supabase schema with NHAA 14566 Next.js code
-- 
-- Your database has a well-designed schema, but the code expects some
-- different table/column names. This migration adds what's missing
-- WITHOUT destroying existing data.
--
-- Run this in Supabase SQL Editor AFTER reviewing the existing tables.
-- =============================================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS TO cases TABLE
-- ============================================================

-- Columns the code inserts that don't exist yet
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS victim_name TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS initials TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS incident_category TEXT DEFAULT 'Caste-based Discrimination';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS narrative_text TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'text';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS voice_analysis JSONB;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS stress_assessment JSONB;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_officer TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_counsellor TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS priority_tier INT DEFAULT 3;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS dispatched_actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- ============================================================
-- 2. CREATE MISSING TABLES (that the code inserts into)
-- ============================================================

-- case_stories: stores submitted narrative / voice per case
CREATE TABLE IF NOT EXISTS public.case_stories (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id                UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  story_text             TEXT NOT NULL,
  submission_type        TEXT DEFAULT 'text',
  audio_url              TEXT,
  audio_duration_seconds INT,
  transcript             TEXT,
  language               TEXT DEFAULT 'en',
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- case_analysis: stores ML/NLP & SVI results
CREATE TABLE IF NOT EXISTS public.case_analysis (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id             UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  svi_score           INT NOT NULL,
  risk_level          TEXT NOT NULL,
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

-- case_assignments: officer & psychiatrist assignments
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id          UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  assigned_user_id UUID,
  assigned_role    TEXT NOT NULL,
  assigned_name    TEXT NOT NULL,
  assignment_type  TEXT NOT NULL,
  routing_reason   TEXT,
  status           TEXT DEFAULT 'Active',
  assigned_at      TIMESTAMPTZ DEFAULT NOW()
);

-- case_activity: milestone & activity history
CREATE TABLE IF NOT EXISTS public.case_activity (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id     UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'story',
  timestamp   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- appointments: tele-consultations
CREATE TABLE IF NOT EXISTS public.appointments (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id                UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  victim_user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  psychiatrist_id        UUID,
  doctor_name            TEXT NOT NULL,
  doctor_title           TEXT,
  doctor_specialization  TEXT,
  slot_time              TEXT NOT NULL,
  date                   TEXT NOT NULL,
  meeting_mode           TEXT DEFAULT 'Secure Video Call',
  status                 TEXT DEFAULT 'Confirmed',
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- trusted_contacts: victim's emergency & trusted contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT,
  phone        TEXT NOT NULL,
  category     TEXT DEFAULT 'trusted',
  avatar_color TEXT DEFAULT '#1d8272',
  is_verified  BOOLEAN DEFAULT false,
  description  TEXT,
  availability TEXT DEFAULT 'Always Reachable',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- psychiatrists: clinical specialists
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

-- ============================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_reported_at ON public.cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_officer_id ON public.cases(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_case_stories_case_id ON public.case_stories(case_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_case_id ON public.case_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON public.case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_activity_case_id ON public.case_activity(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_victim_user_id ON public.appointments(victim_user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON public.trusted_contacts(user_id);

-- ============================================================
-- 4. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE public.case_stories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychiatrists    ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development
DROP POLICY IF EXISTS "case_stories_dev" ON public.case_stories;
CREATE POLICY "case_stories_dev" ON public.case_stories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "case_analysis_dev" ON public.case_analysis;
CREATE POLICY "case_analysis_dev" ON public.case_analysis FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "case_assignments_dev" ON public.case_assignments;
CREATE POLICY "case_assignments_dev" ON public.case_assignments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "case_activity_dev" ON public.case_activity;
CREATE POLICY "case_activity_dev" ON public.case_activity FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "appointments_dev" ON public.appointments;
CREATE POLICY "appointments_dev" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "trusted_contacts_dev" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_dev" ON public.trusted_contacts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "psychiatrists_dev" ON public.psychiatrists;
CREATE POLICY "psychiatrists_dev" ON public.psychiatrists FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. SEED PSYCHIATRISTS (if table is empty)
-- ============================================================

INSERT INTO public.psychiatrists (id, full_name, title, specialization, hospital_clinic, assigned_state, assigned_district, email, phone, is_available, active_patients_count)
SELECT * FROM (VALUES
  ('d0a80121-0002-4000-8000-000000000001'::uuid, 'Dr. P. Srikanth Reddy', 'Senior Clinical Psychiatrist', 'Trauma Triage & Crisis Intervention', 'Guntur GGH & AP Tele-Care Desk', 'Andhra Pradesh', 'Guntur', 'dr.srikanth@nhaa.gov.in', '+91 98480 12345', true, 3),
  ('d0a80121-0002-4000-8000-000000000002'::uuid, 'Dr. Anjali Patil', 'Clinical Neuro-Psychiatrist', 'Trauma & Psychological Triage', 'B.J. Medical College & NHAA Tele-Care', 'Maharashtra', 'Pune', 'dr.anjali@nhaa.gov.in', '+91 98220 54321', true, 2),
  ('d0a80121-0002-4000-8000-000000000003'::uuid, 'Dr. Meenakshi Sharma', 'Consultant Clinical Psychologist', 'Post-Trauma Stress & Anxiety Care', 'SMS Medical College Triage Unit', 'Rajasthan', 'Jaipur', 'dr.meenakshi@nhaa.gov.in', '+91 94140 67890', true, 1),
  ('d0a80121-0002-4000-8000-000000000004'::uuid, 'Dr. Ramesh Chandra', 'Lead Clinical Psychiatrist', 'Trauma Triage & Psychological First Aid', 'NIMHANS Trauma Centre', 'Karnataka', 'Bengaluru Urban', 'dr.ramesh@nhaa.gov.in', '+91 98101 23456', true, 4)
) AS v(id, full_name, title, specialization, hospital_clinic, assigned_state, assigned_district, email, phone, is_available, active_patients_count)
WHERE NOT EXISTS (SELECT 1 FROM public.psychiatrists LIMIT 1);

-- ============================================================
-- 6. ENABLE REALTIME ON NEW TABLES
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.case_stories;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.case_activity;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.case_assignments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
