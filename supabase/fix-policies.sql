-- ==============================================================================
-- 🚀 RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- This fixes the Row Level Security (RLS) policies that were rolled back earlier.
-- ==============================================================================

-- 1. Enable RLS on profiles and create permissive policies for authenticated users
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all old policies to start clean
DROP POLICY IF EXISTS "Profiles: public read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own update" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for auth" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for auth" ON public.profiles;

-- Allow reading profiles
CREATE POLICY "Profiles: select all" ON public.profiles
  FOR SELECT USING (true);

-- Allow authenticated users and service to insert profiles
CREATE POLICY "Profiles: insert any" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE USING (true) WITH CHECK (true);


-- 2. Enable RLS on addresses and create permissive policies
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Addresses: public read" ON public.addresses;
DROP POLICY IF EXISTS "Addresses: own insert" ON public.addresses;
DROP POLICY IF EXISTS "Addresses: own update" ON public.addresses;
DROP POLICY IF EXISTS "Addresses: select all" ON public.addresses;
DROP POLICY IF EXISTS "Addresses: insert any" ON public.addresses;
DROP POLICY IF EXISTS "Addresses: update any" ON public.addresses;

CREATE POLICY "Addresses: select all" ON public.addresses
  FOR SELECT USING (true);

CREATE POLICY "Addresses: insert any" ON public.addresses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Addresses: update any" ON public.addresses
  FOR UPDATE USING (true) WITH CHECK (true);


-- 3. Cases & Assessments tables RLS
ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cases: select all" ON public.cases;
DROP POLICY IF EXISTS "Cases: insert all" ON public.cases;
DROP POLICY IF EXISTS "Cases: update all" ON public.cases;

CREATE POLICY "Cases: select all" ON public.cases FOR SELECT USING (true);
CREATE POLICY "Cases: insert all" ON public.cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Cases: update all" ON public.cases FOR UPDATE USING (true);

ALTER TABLE IF EXISTS public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assessments: select all" ON public.assessments;
DROP POLICY IF EXISTS "Assessments: insert all" ON public.assessments;

CREATE POLICY "Assessments: select all" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Assessments: insert all" ON public.assessments FOR INSERT WITH CHECK (true);
