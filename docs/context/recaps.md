# Session Recaps

Append-only log. One entry per turn where real work shipped — same recap Claude gives Savrio in chat, kept here so it isn't lost between sessions. For structured project state (stack, pending items, rules), see `docs/context/handoff.md` instead — this file is just the raw chronological log.

---

## 2026-07-27

**Made the site's free messaging unambiguous.** Found 5 pages still carrying leftover Pro/paywall language from before the paywall removal — stale JSON-LD schema saying "Pro at $10/month" (read by Google for search snippets) plus a "(Pro)" tag and an "Available to Pro users ($10/month)" line that had survived the earlier cleanup. Rewrote all of it to "100% free forever" across `focus-app-for-students.html`, `focus-timer-entrepreneurs.html`, `habit-tracker-college-students.html`, `productivity-app-student-entrepreneurs.html`, `compound-habit-app.html`.

**Added a per-user daily AI usage cap.** Anthropic balance was down to $4.91, so added a hard cap (15 messages/user/day, Haiku-only unless `AI_ALLOW_SONNET=true`) enforced via a new `claim_ai_usage` Postgres RPC, wired into `/api/claude` and `/api/apex-plan`. Chat and every AI-feature button now surface a clear "daily limit reached" message instead of a generic error. **Requires running the SQL migration in `schema.sql` (bottom of file) in Supabase Dashboard → SQL Editor** — the code fails open (no cap enforced) until that migration is run.

Committed as `494a1e0` and pushed to `main`.

**AI usage cap is now live.** Savrio ran the `claim_ai_usage` migration in Supabase SQL Editor — the 15/day-per-user cap on `/api/claude` and `/api/apex-plan` is now actually enforced, not just deployed.
