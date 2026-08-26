-- ==============================================================================
-- NHAA 14566 - COMPLETE DB Setup & Fix
-- Run this ENTIRE file in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ==============================================================================

-- ── 0. Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES TABLE ────────────────────────────────────────────────────────
-- Drop old role enum if it causes problems and re-create as TEXT
-- (TEXT is simpler and avoids enum casting issues)

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE TEXT;

-- Reset to safe defaults
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'victim';

ALTER TABLE public.profiles
  ALTER COLUMN preferred_language SET DEFAULT 'en';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add email column if it doesn't exist (our code no longer writes to it,
-- but the trigger populates it for reference)
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

-- Anyone can read profiles (officers need to see victim profiles)
CREATE POLICY "Profiles: public read" ON public.profiles
  FOR SELECT USING (true);

-- User can insert their own row (id must equal their auth uid)
CREATE POLICY "Profiles: own insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User can update their own row
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
-- Uses TEXT for role (no enum casting) so it works for both email + Google OAuth

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

-- ── 5. CASES TABLE: Ensure it exists with correct schema ─────────────────────
CREATE TABLE IF NOT EXISTS public.cases (
  id                TEXT PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name       TEXT,
  initials          TEXT,
  is_anonymous      BOOLEAN DEFAULT false,
  contact_number    TEXT,
  incident_category TEXT,
  incident_location JSONB,
  channel           TEXT DEFAULT 'integrated_portal',
  language          TEXT DEFAULT 'en',
  reported_at       TIMESTAMPTZ DEFAULT NOW(),
  narrative_text    TEXT,
  voice_analysis    JSONB,
  stress_assessment JSONB,
  status            TEXT DEFAULT 'New Intake',
  assigned_officer  TEXT,
  assigned_counsellor TEXT,
  priority_tier     INTEGER DEFAULT 3,
  notes             JSONB DEFAULT '[]',
  dispatched_actions JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cases: public read"   ON public.cases;
DROP POLICY IF EXISTS "Cases: auth insert"   ON public.cases;
DROP POLICY IF EXISTS "Cases: auth update"   ON public.cases;

CREATE POLICY "Cases: public read" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Cases: auth insert" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Cases: auth update" ON public.cases FOR UPDATE USING (true);

-- ── 6. ASSESSMENTS TABLE ─────────────────────────────────────────────────────
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

-- ── 7. Enable Realtime (Idempotent) ───────────────────────────────────────────
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
-- All tables: profiles, addresses, cases, assessments are ready.
-- RLS is enabled with correct policies.
-- Auth trigger creates profile automatically on signup (email + Google OAuth).
