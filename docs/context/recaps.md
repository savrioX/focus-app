# Session Recaps

Append-only log. One entry per turn where real work shipped — same recap Claude gives Savrio in chat, kept here so it isn't lost between sessions. For structured project state (stack, pending items, rules), see `docs/context/handoff.md` instead — this file is just the raw chronological log.

---

## 2026-07-27

**Made the site's free messaging unambiguous.** Found 5 pages still carrying leftover Pro/paywall language from before the paywall removal — stale JSON-LD schema saying "Pro at $10/month" (read by Google for search snippets) plus a "(Pro)" tag and an "Available to Pro users ($10/month)" line that had survived the earlier cleanup. Rewrote all of it to "100% free forever" across `focus-app-for-students.html`, `focus-timer-entrepreneurs.html`, `habit-tracker-college-students.html`, `productivity-app-student-entrepreneurs.html`, `compound-habit-app.html`.

**Added a per-user daily AI usage cap.** Anthropic balance was down to $4.91, so added a hard cap (15 messages/user/day, Haiku-only unless `AI_ALLOW_SONNET=true`) enforced via a new `claim_ai_usage` Postgres RPC, wired into `/api/claude` and `/api/apex-plan`. Chat and every AI-feature button now surface a clear "daily limit reached" message instead of a generic error. **Requires running the SQL migration in `schema.sql` (bottom of file) in Supabase Dashboard → SQL Editor** — the code fails open (no cap enforced) until that migration is run.

Committed as `494a1e0` and pushed to `main`.

**AI usage cap is now live.** Savrio ran the `claim_ai_usage` migration in Supabase SQL Editor — the 15/day-per-user cap on `/api/claude` and `/api/apex-plan` is now actually enforced, not just deployed.

---

## 2026-07-29

**Found and fixed a bug that silently killed every AI feature for new users.** `claim_ai_usage` (added 2026-07-27) was a bare `UPDATE profiles ... WHERE id = p_user_id`. Users with **no profiles row** matched zero rows, so `ok` came back NULL, `coalesce(ok,false)` returned false, and both `/api/claude` and `/api/apex-plan` answered `429 "Daily AI limit reached"` — on the user's *first ever* AI request, permanently. Profiles rows aren't created at signup (see `417c866`), so this hit new users: exactly the people the AI is meant to convert. Savrio's own account had no profiles row and was fully locked out. Fix is an upsert, in `migrations/2026-07-29-fix-claim-ai-usage.sql` — **must be run in Supabase SQL Editor**; deploying alone does nothing. The `schema.sql` reference block was rewritten so the broken UPDATE-only form can't be reintroduced.

**Rebuilt the homepage from a login wall into a real landing page.** `#auth-screen` was `height:100vh; overflow:hidden` — a fixed two-column split with no scroll, no product visuals, no FAQ. On mobile `.land-right` had `order:-1`, so the first thing a phone visitor saw was a **username/password field with zero context** (and most traffic is mobile, from Instagram). Now: the hero is unchanged as the first fold, with six sections stacked below it — a hand-built CSS mock of the dashboard (three columns + a sample Apex response), how-it-works, feature grid, free-forever checklist, six-question FAQ, final CTA, and a footer linking all five SEO pages. Removed `order:-1` so copy comes first on mobile, and added a sticky "Start free" bar that offsets itself above the cookie banner. The three JS sites that forced `display:'flex'` now set `display:''` so CSS stays the single source of truth.

Chose a CSS mock over real screenshots deliberately: the live Ledger and Apex pages were both **empty states** (0 habits, "No plan yet"), and the only populated view was the dashboard showing Savrio's real name plus his follower-growth strategy — which would also have undone `459f73e` (founder name stripped from the site).

**Added the six funnel events that were missing.** Correction to an earlier assumption: Vercel Web Analytics was *already* installed on `index.html`, `pricing.html`, `privacy.html`, `terms.html` and `404.html` — an earlier grep missed it because the path is `/_vercel/insights/script.js` (contains neither "analytics" nor "gtag"). The real gap was the five SEO pages, which had no tracking at all; script added to each. Then wired `landing_view`, `landing_cta_click`, `signup_start`, `signup_complete`, `onboarding_complete` and `first_habit_check` through a `trackEvent()` helper that optional-chains `window.va` so tracking can never break the app. Verified `/_vercel/insights/script.js` returns **200** on production, so Web Analytics is enabled and the `vercel.json` catch-all doesn't rewrite it — no route change needed.

**SEO cleanup.** Homepage `<meta name="description">` rewritten off the generic "productivity system for student entrepreneurs" line; the headline is now a real `<h1>` (the page previously had none); `sitemap.xml` lastmod dates refreshed and `/pricing` added. Left `twitter:card` as `summary` rather than `summary_large_image` — `og:image` is still the square `logo.PNG`, and a square image renders badly in a large card.

Not verified: `npm test` couldn't run — **node isn't installed on this Mac**. Checked for JS errors in-browser instead (clean; the only console output was from a MetaMask extension).

Still open: set `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` so the daily digest stops reporting "Website views: Not configured" (the tracking was never the problem); make a real 1200×630 `og:image`; `pricing.html` still says "everything **Savrio** uses" despite `459f73e` stripping the founder name.

---

## 2026-07-30

**AI lockout fix is live and verified.** Savrio ran `migrations/2026-07-29-fix-claim-ai-usage.sql` in the Supabase SQL Editor and confirmed Generate Plan on `/apex` now works — previously a hard 429. The `claim_ai_usage` upsert is enforcing correctly, and AI features are functional for users with no `profiles` row (which was all new signups). Nothing left outstanding on this bug.

Note for future migrations: don't interleave prose between SQL code blocks in chat — Savrio pasted an explanation paragraph into the SQL Editor along with a query and got `ERROR: 42601 syntax error at or near "One"`. Give SQL as one clean, self-contained block with commentary before or after, never between blocks.
