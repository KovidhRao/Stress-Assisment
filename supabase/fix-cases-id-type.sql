-- =============================================================================
-- MIGRATION: Fix cases.id type from UUID to TEXT
-- The app uses case IDs like 'NHAA-2026-9041' (TEXT), but the existing
-- database was created with cases.id as UUID. This causes FK errors when
-- case_stories, case_analysis, etc. try to reference it with TEXT case_id.
--
-- Run this in Supabase SQL Editor AFTER the main schema.sql if you got the
-- "incompatible types: text and uuid" error.
-- =============================================================================

-- 1. Drop all foreign key constraints that reference cases.id
ALTER TABLE public.case_stories     DROP CONSTRAINT IF EXISTS case_stories_case_id_fkey;
ALTER TABLE public.case_analysis    DROP CONSTRAINT IF EXISTS case_analysis_case_id_fkey;
ALTER TABLE public.case_assignments DROP CONSTRAINT IF EXISTS case_assignments_case_id_fkey;
ALTER TABLE public.case_activity    DROP CONSTRAINT IF EXISTS case_activity_case_id_fkey;
ALTER TABLE public.appointments     DROP CONSTRAINT IF EXISTS appointments_case_id_fkey;
ALTER TABLE public.consents         DROP CONSTRAINT IF EXISTS consents_case_id_fkey;

-- 2. Convert cases.id from UUID to TEXT
--    (Existing UUID values like 'c0a80121-...' will just become text strings)
ALTER TABLE public.cases ALTER COLUMN id TYPE TEXT;

-- 3. Recreate all foreign key constraints with TEXT → TEXT references
ALTER TABLE public.case_stories
  ADD CONSTRAINT case_stories_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.case_analysis
  ADD CONSTRAINT case_analysis_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.case_assignments
  ADD CONSTRAINT case_assignments_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.case_activity
  ADD CONSTRAINT case_activity_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;

ALTER TABLE public.consents
  ADD CONSTRAINT consents_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

-- 4. Verify the fix
SELECT 
  t.table_name, 
  c.column_name, 
  c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND c.table_schema = 'public'
  AND (c.column_name = 'id' AND t.table_name = 'cases')
   OR (c.column_name = 'case_id' AND t.table_name != 'cases')
ORDER BY t.table_name, c.column_name;
