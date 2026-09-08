-- ─────────────────────────────────────────────────────────────────────────────
-- Columns the app already writes to but that were never added in Supabase
--
-- Run this in Supabase Dashboard → SQL Editor. Safe to run more than once
-- (every statement is `if not exists`), and safe to run if some were already
-- applied by hand.
--
-- Context: docs/context/handoff.md carried these four statements under
-- "Pending Items — run in Supabase Dashboard" as loose SQL in a markdown file,
-- where they are easy to lose. Collected here so the repo says what the schema
-- is supposed to look like.
--
-- What breaks without them: the code writing each column gets a Supabase 400
-- that is caught and logged, so the feature silently does nothing.
--   todos.due_date              — due dates on todos
--   profiles.apex_plan          — the generated Apex plan (api/apex-plan.js)
--   profiles.apex_plan_updated_at
--   profiles.email_opt_in       — email preference set in the app
--
-- The quiz_data / archetype / onboarding_plan / onboarding_at migrations that
-- BUGS.md BUG-01 describes were already run — see handoff.md.
-- ─────────────────────────────────────────────────────────────────────────────

alter table todos    add column if not exists due_date              date;
alter table profiles add column if not exists apex_plan             jsonb;
alter table profiles add column if not exists apex_plan_updated_at  timestamptz;
alter table profiles add column if not exists email_opt_in          boolean default false;
