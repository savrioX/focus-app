-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the Pro/Stripe columns from profiles
--
-- Run this in Supabase Dashboard → SQL Editor. Safe to run more than once.
--
-- Context: the Pro tier, its paywall, and the Stripe integration were removed
-- from the product. Nothing gated on is_pro — the front-end variables were
-- assigned but never read, and no API route checked them.
--
-- ORDER MATTERS. Deploy the app first, then run this.
--   index.html previously ran
--     .select('is_pro, stripe_customer_id, active_context, email_opt_in')
--   and inserted `is_pro: false` on first profile creation. Both references
--   were removed in the same commit that deleted the Stripe endpoints. If you
--   run this migration BEFORE that code is live, PostgREST returns 400 on the
--   select and every user's profile load breaks.
--
-- Verify the deployed app no longer references the columns:
--   curl -s https://dailycompound.app/ | grep -c 'is_pro'      -- expect 0
--   curl -s https://dailycompound.app/ | grep -c 'stripe'      -- expect 0
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles drop column if exists is_pro;
alter table public.profiles drop column if exists stripe_customer_id;

-- Confirm they're gone. Expect zero rows.
select column_name
from   information_schema.columns
where  table_schema = 'public'
  and  table_name   = 'profiles'
  and  column_name in ('is_pro', 'stripe_customer_id');


-- ─────────────────────────────────────────────────────────────────────────────
-- De-identify the brain note source
--
-- brain.html and api/brain.js used the literal string 'savrio' as the source
-- value for the owner's own notes. Renamed to 'owner'. Existing rows must be
-- migrated or those notes stop matching the "My Notes" filter.
--
-- Run this AFTER deploying the code change. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

update public.brain set source = 'owner' where source = 'savrio';

-- Confirm none are left. Expect zero rows.
select source, count(*) from public.brain where source = 'savrio' group by source;
