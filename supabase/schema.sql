-- ==============================================================================
-- NHAA 14566 & Citizen Stress Assessment Platform - Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'victim' CHECK (role IN ('victim', 'officer', 'counsellor', 'admin')),
  gender TEXT,
  age_group TEXT,
  state TEXT,
  district TEXT,
  preferred_language TEXT DEFAULT 'English',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  is_profile_complete BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile, officers to read all profiles
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() IS NULL);

-- 3. Automatic Profile Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, is_profile_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'victim'),
    false
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

-- 4. Cases Table (Live Triage & Redressal Records)
CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY, -- e.g. NHAA-2026-8891
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name TEXT NOT NULL,
  initials TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  contact_number TEXT,
  incident_category TEXT NOT NULL,
  incident_location JSONB NOT NULL DEFAULT '{"village_town_city": "", "district": "", "state": ""}'::jsonb,
  channel TEXT DEFAULT 'integrated_portal',
  language TEXT DEFAULT 'English',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  narrative_text TEXT NOT NULL,
  voice_analysis JSONB,
  stress_assessment JSONB NOT NULL,
  status TEXT DEFAULT 'New Intake',
  assigned_officer TEXT,
  assigned_counsellor TEXT,
  priority_tier INT DEFAULT 3,
  notes JSONB DEFAULT '[]'::jsonb,
  dispatched_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public cases read" ON public.cases;
CREATE POLICY "Public cases read" ON public.cases
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public cases insert" ON public.cases;
CREATE POLICY "Public cases insert" ON public.cases
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public cases update" ON public.cases;
CREATE POLICY "Public cases update" ON public.cases
  FOR UPDATE USING (true);

-- 5. Individual Assessments / Wellbeing History Table
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  narrative_text TEXT,
  svi_score INT NOT NULL,
  risk_level TEXT NOT NULL,
  fear_score INT DEFAULT 0,
  trauma_score INT DEFAULT 0,
  anxiety_score INT DEFAULT 0,
  voice_metrics JSONB,
  indicators JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public assessments all" ON public.assessments;
CREATE POLICY "Public assessments all" ON public.assessments FOR ALL USING (true);

-- 6. Enable Realtime Publications for cases and profiles
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;

-- Done!
