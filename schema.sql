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

-- ── Apex migrations — run in Supabase SQL Editor ───────────────────────────
-- alter table todos add column if not exists due_date date;
-- alter table profiles add column if not exists apex_plan jsonb;
-- alter table profiles add column if not exists apex_plan_updated_at timestamptz;
-- ─────────────────────────────────────────────────────────────────────────────

-- ── To apply RLS optimizations to existing tables in Supabase SQL editor: ──
-- Drop old policies and recreate with (select auth.uid()) for each table above.
-- Example for todos:
--   drop policy "users manage own todos" on todos;
--   create policy "users manage own todos" on todos
--     for all using ((select auth.uid()) = user_id)
--     with check ((select auth.uid()) = user_id);
--   create index if not exists idx_todos_user_id on todos (user_id);
