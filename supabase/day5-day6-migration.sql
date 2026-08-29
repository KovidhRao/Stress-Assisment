-- ============================================================
-- DAY 5 + DAY 6 MIGRATION
-- Case Notes, Follow-Up Tracking, Pre/Post Distress Survey
-- ============================================================

-- 1. Case Notes Table (persist officer/psychiatrist notes per case)
CREATE TABLE IF NOT EXISTS public.case_notes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id     TEXT NOT NULL,
  author      TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'officer',
  note_text   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- Permissive read/write for dev
DROP POLICY IF EXISTS "Case notes read" ON public.case_notes;
CREATE POLICY "Case notes read" ON public.case_notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Case notes write" ON public.case_notes;
CREATE POLICY "Case notes write" ON public.case_notes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Case notes update" ON public.case_notes;
CREATE POLICY "Case notes update" ON public.case_notes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Case notes delete" ON public.case_notes;
CREATE POLICY "Case notes delete" ON public.case_notes FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON public.case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON public.case_notes(created_at DESC);

-- 2. Follow-Up Tracking Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id         TEXT NOT NULL,
  assigned_to     TEXT,          -- officer or psychiatrist name
  assigned_role   TEXT DEFAULT 'officer',
  follow_up_type  TEXT DEFAULT 'check_in',  -- 'check_in', 'medical', 'legal', 'welfare'
  scheduled_at    TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',   -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follow-ups read" ON public.follow_ups;
CREATE POLICY "Follow-ups read" ON public.follow_ups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Follow-ups write" ON public.follow_ups;
CREATE POLICY "Follow-ups write" ON public.follow_ups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Follow-ups update" ON public.follow_ups;
CREATE POLICY "Follow-ups update" ON public.follow_ups FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Follow-ups delete" ON public.follow_ups;
CREATE POLICY "Follow-ups delete" ON public.follow_ups FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_follow_ups_case_id ON public.follow_ups(case_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON public.follow_ups(scheduled_at);

-- 3. Add follow_up_required flag to cases table
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;

-- 4. Pre/Post Intervention Distress Survey Table
CREATE TABLE IF NOT EXISTS public.distress_surveys (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id         TEXT NOT NULL,
  user_id         UUID,
  survey_type     TEXT NOT NULL,   -- 'pre_intervention' or 'post_intervention'
  stress_level    INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  anxiety_level   INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  safety_feeling  INTEGER CHECK (safety_feeling >= 1 AND safety_feeling <= 10),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.distress_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distress surveys read" ON public.distress_surveys;
CREATE POLICY "Distress surveys read" ON public.distress_surveys FOR SELECT USING (true);
DROP POLICY IF EXISTS "Distress surveys write" ON public.distress_surveys;
CREATE POLICY "Distress surveys write" ON public.distress_surveys FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Distress surveys update" ON public.distress_surveys;
CREATE POLICY "Distress surveys update" ON public.distress_surveys FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_distress_surveys_case_id ON public.distress_surveys(case_id);
CREATE INDEX IF NOT EXISTS idx_distress_surveys_type ON public.distress_surveys(survey_type);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
