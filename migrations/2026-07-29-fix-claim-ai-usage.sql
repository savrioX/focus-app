-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: claim_ai_usage locked out every user with no profiles row
--
-- Run this in Supabase Dashboard → SQL Editor. Safe to run more than once.
--
-- Bug: the original function was a bare UPDATE on profiles. A user with no
-- profiles row matched zero rows, so `returning true into ok` left ok NULL,
-- coalesce(ok,false) returned false, and api/claude.js + api/apex-plan.js
-- answered 429 "Daily AI limit reached" — on the user's very first AI request,
-- permanently. Profiles rows are not created at signup (see commit 417c866,
-- "Fix: isPro=true for new users with no profile row"), so this hit new users:
-- exactly the people the AI features are supposed to win over.
--
-- Fix: upsert. Insert the row on first use, otherwise apply the same atomic
-- increment-and-cap-check as before. Concurrency guarantee is unchanged — the
-- cap is still enforced inside one statement, so parallel requests from one
-- user cannot race past the limit.
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles add column if not exists ai_usage_count int default 0 not null;
alter table profiles add column if not exists ai_usage_date  date;

create or replace function claim_ai_usage(p_user_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  insert into profiles (id, ai_usage_count, ai_usage_date)
  values (p_user_id, 1, current_date)
  on conflict (id) do update
    set ai_usage_count = case
                           when profiles.ai_usage_date = current_date
                           then profiles.ai_usage_count + 1
                           else 1
                         end,
        ai_usage_date  = current_date
    where profiles.ai_usage_date is distinct from current_date
       or profiles.ai_usage_count < p_limit
  returning true into ok;

  return coalesce(ok, false);
end;
$$;

-- Verify: should return true, and the row should now exist with count 1.
--   select claim_ai_usage('<your-user-uuid>'::uuid, 15);
--   select id, ai_usage_count, ai_usage_date from profiles where id = '<your-user-uuid>';
