-- =============================================================================
-- FIX: Convert USER-DEFINED enum columns to TEXT
-- The code inserts values like 'integrated_portal', 'mobile_app', 'New Intake'
-- but the DB has strict enum types that reject them.
-- Converting to TEXT allows any value.
-- =============================================================================

-- First, check what the current enum values are (for reference)
-- SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumlabels;

-- Convert cases.channel from enum to TEXT
ALTER TABLE public.cases ALTER COLUMN channel TYPE TEXT USING channel::text;

-- Convert cases.status from enum to TEXT
ALTER TABLE public.cases ALTER COLUMN status TYPE TEXT USING status::text;

-- Also check and fix if there are other enum columns causing issues
-- Convert cases.current_risk_level if it's an enum
DO $$ BEGIN
  ALTER TABLE public.cases ALTER COLUMN current_risk_level TYPE TEXT USING current_risk_level::text;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
