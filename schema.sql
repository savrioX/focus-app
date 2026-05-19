-- ── Focus App — Supabase Schema ──────────────────────────
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run

-- Todos
create table todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table todos enable row level security;
create policy "users manage own todos" on todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goals
create table goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table goals enable row level security;
create policy "users manage own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
  using  (goal_id in (select id from goals where user_id = auth.uid()))
  with check (goal_id in (select id from goals where user_id = auth.uid()));

-- Habits
create table habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  text       text not null,
  created_at timestamptz default now() not null
);
alter table habits enable row level security;
create policy "users manage own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profiles (subscription status)
create table if not exists profiles (
  id                 uuid references auth.users on delete cascade primary key,
  stripe_customer_id text,
  is_pro             boolean default false,
  updated_at         timestamptz default now()
);
alter table profiles enable row level security;
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);

-- Feedback
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete set null,
  message    text not null,
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "users can insert feedback" on feedback
  for insert with check (auth.uid() = user_id or user_id is null);
