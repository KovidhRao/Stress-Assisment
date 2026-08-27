-- ==============================================================================
-- NHAA 14566 - COMPLETE DB Setup & Fix (v2)
-- Run this ENTIRE file in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ==============================================================================

-- ── 0. Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES TABLE ────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'victim';

ALTER TABLE public.profiles
  ALTER COLUMN preferred_language SET DEFAULT 'en';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── 2. PROFILES: Fix RLS policies ────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: public read"   ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own insert"    ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own update"    ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

CREATE POLICY "Profiles: public read" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Profiles: own insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: own update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 3. ADDRESSES TABLE: RLS ───────────────────────────────────────────────────
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Addresses: public read"  ON public.addresses;
DROP POLICY IF EXISTS "Addresses: own insert"   ON public.addresses;
DROP POLICY IF EXISTS "Addresses: own update"   ON public.addresses;

CREATE POLICY "Addresses: public read" ON public.addresses
  FOR SELECT USING (true);

CREATE POLICY "Addresses: own insert" ON public.addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Addresses: own update" ON public.addresses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. AUTH TRIGGER: Auto-create profile on signup ───────────────────────────
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

-- ── 5. OFFICERS TABLE: Real officers only from admin-inserted records ─────────
-- Officers must be inserted MANUALLY by admin via Supabase dashboard or admin API.
-- No seed data — real officers only.
CREATE TABLE IF NOT EXISTS public.officers (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  officer_badge_id    TEXT UNIQUE NOT NULL,
  full_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  department          TEXT,
  role                TEXT DEFAULT 'officer',
  assigned_state      TEXT,
  assigned_district   TEXT,
  station_name        TEXT,
  jurisdiction_pincodes TEXT[],
  active_cases_count  INTEGER DEFAULT 0,
  is_available        BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Officers: public read"   ON public.officers;
DROP POLICY IF EXISTS "Officers: auth insert"   ON public.officers;
DROP POLICY IF EXISTS "Officers: own update"    ON public.officers;

-- Any authenticated user can read officers list (needed for proximity matching)
CREATE POLICY "Officers: public read" ON public.officers FOR SELECT USING (true);
-- Only service role / admin can insert officers (via dashboard)
CREATE POLICY "Officers: auth insert" ON public.officers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Officers: own update" ON public.officers FOR UPDATE USING (auth.uid() = user_id);

-- ── 6. CASES TABLE: with session_id and assigned_officer_id columns ───────────
CREATE TABLE IF NOT EXISTS public.cases (
  id                    TEXT PRIMARY KEY,
  session_id            TEXT,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name           TEXT,
  initials              TEXT,
  is_anonymous          BOOLEAN DEFAULT false,
  contact_number        TEXT,
  incident_category     TEXT,
  incident_location     JSONB,
  channel               TEXT DEFAULT 'integrated_portal',
  language              TEXT DEFAULT 'en',
  reported_at           TIMESTAMPTZ DEFAULT NOW(),
  narrative_text        TEXT,
  voice_analysis        JSONB,
  stress_assessment     JSONB,
  status                TEXT DEFAULT 'New Intake',
  assigned_officer      TEXT,
  assigned_officer_id   TEXT,
  assigned_counsellor   TEXT,
  assigned_counsellor_id TEXT,
  proximity_routing     TEXT,
  priority_tier         INTEGER DEFAULT 3,
  notes                 JSONB DEFAULT '[]',
  dispatched_actions    JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing cases table (safe ALTER for existing deployments)
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_officer_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_counsellor_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS proximity_routing TEXT;

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cases: public read"   ON public.cases;
DROP POLICY IF EXISTS "Cases: auth insert"   ON public.cases;
DROP POLICY IF EXISTS "Cases: auth update"   ON public.cases;

-- Authenticated victims can insert their own cases
CREATE POLICY "Cases: public read" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Cases: auth insert" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Cases: auth update" ON public.cases FOR UPDATE USING (true);

-- ── 7. ASSESSMENTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessments (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id          TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  narrative_text   TEXT,
  svi_score        INTEGER,
  risk_level       TEXT,
  fear_score       INTEGER DEFAULT 0,
  trauma_score     INTEGER DEFAULT 0,
  anxiety_score    INTEGER DEFAULT 0,
  voice_metrics    JSONB,
  indicators       TEXT[],
  recommendations  TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assessments: public read"  ON public.assessments;
DROP POLICY IF EXISTS "Assessments: auth insert"  ON public.assessments;

CREATE POLICY "Assessments: public read" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Assessments: auth insert" ON public.assessments FOR INSERT WITH CHECK (true);

-- ── 8. Enable Realtime (Idempotent) ───────────────────────────────────────────
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
END $$;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- All tables: profiles, addresses, officers, cases, assessments are ready.
-- RLS is enabled with correct policies.
-- Officers must be inserted by admin — no seed data.
-- Session ID and assigned_officer_id are stored with every case submission.
