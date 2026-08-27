-- ==============================================================================
-- NHAA 14566 & Citizen Stress Assessment Platform - Supabase Database Schema
-- Run this ENTIRE file in your Supabase SQL Editor
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
  role                TEXT DEFAULT 'victim',
  gender              TEXT,
  age_group           TEXT,
  preferred_language  TEXT DEFAULT 'en',
  is_profile_complete BOOLEAN DEFAULT false,
  is_active           BOOLEAN DEFAULT true,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safe column additions for existing deployments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

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
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Officers Table
-- NOTE: Officers are created ONLY by admins via Supabase dashboard or admin API.
--       There are NO seed inserts here. All data is real.
CREATE TABLE IF NOT EXISTS public.officers (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  officer_badge_id      TEXT UNIQUE NOT NULL,
  full_name             TEXT NOT NULL,
  department            TEXT,
  role                  TEXT NOT NULL DEFAULT 'officer',
  assigned_state        TEXT,
  assigned_district     TEXT,
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

-- 5. Cases Table (Live Triage & Redressal Records)
CREATE TABLE IF NOT EXISTS public.cases (
  id                    TEXT PRIMARY KEY,       -- e.g. NHAA-2026-8891
  session_id            TEXT,                   -- e.g. SESS-928471
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name           TEXT,
  initials              TEXT,
  is_anonymous          BOOLEAN DEFAULT false,
  contact_number        TEXT,
  incident_category     TEXT,
  incident_location     JSONB DEFAULT '{"village_town_city": "", "district": "", "state": "", "pincode": ""}'::jsonb,
  channel               TEXT DEFAULT 'integrated_portal',
  language              TEXT DEFAULT 'en',
  reported_at           TIMESTAMPTZ DEFAULT NOW(),
  narrative_text        TEXT,
  voice_analysis        JSONB,
  stress_assessment     JSONB,
  status                TEXT DEFAULT 'New Intake',
  assigned_officer      TEXT,
  assigned_officer_id   UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  assigned_counsellor   TEXT,
  assigned_counsellor_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  proximity_routing     TEXT,
  priority_tier         INT DEFAULT 3,
  notes                 JSONB DEFAULT '[]'::jsonb,
  dispatched_actions    JSONB DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Safe column additions for existing deployments
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS proximity_routing TEXT;
-- NOTE: If assigned_officer_id already exists as TEXT, run this ONLY if needed:
-- ALTER TABLE public.cases DROP COLUMN IF EXISTS assigned_officer_id;
-- ALTER TABLE public.cases ADD COLUMN assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL;

-- 6. Assessments Table (SVI & Wellbeing History)
CREATE TABLE IF NOT EXISTS public.assessments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id          TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  narrative_text   TEXT,
  svi_score        INT,
  risk_level       TEXT,
  fear_score       INT DEFAULT 0,
  trauma_score     INT DEFAULT 0,
  anxiety_score    INT DEFAULT 0,
  voice_metrics    JSONB,
  indicators       TEXT[],
  recommendations  TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Auth Trigger: Auto-create profile row on new signup (Email + Google OAuth)
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
    'victim',
    'en',
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Enable Row Level Security
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public addresses access" ON public.addresses;
CREATE POLICY "Public addresses access" ON public.addresses FOR ALL USING (true);

DROP POLICY IF EXISTS "Public officers access" ON public.officers;
CREATE POLICY "Public officers access" ON public.officers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public cases all" ON public.cases;
CREATE POLICY "Public cases all" ON public.cases FOR ALL USING (true);

DROP POLICY IF EXISTS "Public assessments all" ON public.assessments;
CREATE POLICY "Public assessments all" ON public.assessments FOR ALL USING (true);

-- 10. Enable Realtime Publications (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'officers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.officers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'assessments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;
  END IF;
END $$;

-- ==============================================================================
-- Schema complete.
-- Tables: profiles, addresses, officers, cases, assessments
-- Officers are inserted ONLY by admin — no seed data.
-- Session ID and assigned_officer_id stored on every case submission.
-- ==============================================================================
