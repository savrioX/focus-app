-- ── Focus App — Supabase Schema ──────────────────────────
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run
-- NOTE: (select auth.uid()) is intentional — it's a subquery that Postgres
-- evaluates once per query (not per row), enabling index scans and 50x speedup.

-- Todos
create table todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table todos enable row level security;
create policy "users manage own todos" on todos
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index idx_todos_user_id on todos (user_id);

-- Goals
create table goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table goals enable row level security;
create policy "users manage own goals" on goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index idx_goals_user_id on goals (user_id);

-- Goal subtasks
create table goal_subtasks (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid references goals on delete cascade not null,
  text       text not null,
  done       boolean default false not null,
  created_at timestamptz default now() not null
);
alter table goal_subtasks enable row level security;
create policy "users manage own subtasks" on goal_subtasks
  for all
  using  (goal_id in (select id from goals where user_id = (select auth.uid())))
  with check (goal_id in (select id from goals where user_id = (select auth.uid())));
create index idx_goal_subtasks_goal_id on goal_subtasks (goal_id);

-- Habits
create table habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table habits enable row level security;
create policy "users manage own habits" on habits
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index idx_habits_user_id on habits (user_id);

-- Habit logs (one row per habit per day completed)
create table habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid references habits on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  logged_date date not null,
  created_at  timestamptz default now() not null,
  unique (habit_id, logged_date)
);
alter table habit_logs enable row level security;
create policy "users manage own habit logs" on habit_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index idx_habit_logs_user_id on habit_logs (user_id);
create index idx_habit_logs_habit_id on habit_logs (habit_id);

-- Profiles (subscription status)
create table if not exists profiles (
  id                 uuid references auth.users on delete cascade primary key,
  stripe_customer_id text,
  is_pro             boolean default false,
  waitlist           boolean default false,
  updated_at         timestamptz default now()
);
alter table profiles enable row level security;
create policy "users can read own profile" on profiles
  for select using ((select auth.uid()) = id);
create policy "users can insert own profile" on profiles
  for insert with check ((select auth.uid()) = id);
create policy "users can update own profile" on profiles
  for update using ((select auth.uid()) = id);

-- Feedback
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete set null,
  message    text not null,
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "users can insert feedback" on feedback
  for insert with check ((select auth.uid()) = user_id or user_id is null);

-- ── Migration: morning briefing email capture ────────────────────────────
-- Run this once in Supabase Dashboard → SQL Editor
--
-- alter table profiles add column if not exists email text;
-- alter table profiles add column if not exists morning_briefing boolean default false;
-- alter table profiles add column if not exists active_context text;
--
-- email: real email for username/password users (optional, provided at signup)
-- morning_briefing: user opted in to daily morning briefing email
-- ─────────────────────────────────────────────────────────────────────────

-- ── Migration: email opt-in ───────────────────────────────────────────────
-- Run this once in Supabase Dashboard → SQL Editor
--
-- alter table profiles add column if not exists email_opt_in boolean default false;
--
-- email_opt_in: user explicitly opted in to receive emails (welcome + streak reminders)
-- Default false — no emails sent without consent.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Migration: ledger data ────────────────────────────────────────────────────
-- Run this once in Supabase Dashboard → SQL Editor
--
-- alter table profiles add column if not exists ledger_data jsonb default '{}';
--
-- ledger_data: stores Savrio's life audit habit check data, keyed by week date
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Apex migrations — run in Supabase SQL Editor ───────────────────────────
-- alter table todos add column if not exists due_date date;
-- alter table profiles add column if not exists apex_plan jsonb;
-- alter table profiles add column if not exists apex_plan_updated_at timestamptz;
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Onboarding plan engine migrations — run in Supabase SQL Editor ──────────
-- alter table profiles add column if not exists quiz_data jsonb;
-- alter table profiles add column if not exists archetype text;
-- alter table profiles add column if not exists onboarding_plan jsonb;
-- alter table profiles add column if not exists onboarding_at timestamptz;
--
-- quiz_data:        raw 10-question quiz answers from new onboarding flow
-- archetype:        scored archetype slug (starter/sprinter/ghost/etc.)
-- onboarding_plan:  full plan object { archetype, angle, plan: { keystone_habit, supporting_actions, miss_protocol, week_1_note } }
-- onboarding_at:    timestamp when onboarding was completed
--
-- These are additive — existing profiles are unaffected (columns default to null).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── To apply RLS optimizations to existing tables in Supabase SQL editor: ──
-- Drop old policies and recreate with (select auth.uid()) for each table above.
-- Example for todos:
--   drop policy "users manage own todos" on todos;
--   create policy "users manage own todos" on todos
--     for all using ((select auth.uid()) = user_id)
--     with check ((select auth.uid()) = user_id);
--   create index if not exists idx_todos_user_id on todos (user_id);

-- ── Apex daily usage cap — run in Supabase SQL Editor ───────────────────────
-- alter table profiles add column if not exists ai_usage_count int default 0 not null;
-- alter table profiles add column if not exists ai_usage_date date;
--
-- create or replace function claim_ai_usage(p_user_id uuid, p_limit int)
-- returns boolean
-- language plpgsql
-- security definer
-- as $$
-- declare
--   ok boolean;
-- begin
--   update profiles
--   set ai_usage_count = case when ai_usage_date = current_date then ai_usage_count + 1 else 1 end,
--       ai_usage_date  = current_date
--   where id = p_user_id
--     and (ai_usage_date is distinct from current_date or ai_usage_count < p_limit)
--   returning true into ok;
--
--   return coalesce(ok, false);
-- end;
-- $$;
--
-- Single atomic UPDATE: resets the counter on a new day and enforces the cap
-- in the same statement, so concurrent requests from one user can't race past
-- the limit. Called from api/claude.js via /rest/v1/rpc/claim_ai_usage using
-- the service role key (bypasses RLS, which is fine — it's server-only).
-- ─────────────────────────────────────────────────────────────────────────────
