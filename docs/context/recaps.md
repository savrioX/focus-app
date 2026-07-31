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

---

## 2026-07-31

**Fixed the first-session modal pile-up (`AUDIT.md` #2).** Onboarding (900ms), the guide panel (1500ms) and the email opt-in (3000ms) each fired on their own timer, so a new Google signup could get all three stacked before forming any intent. Replaced with a small queue in `index.html` — `queueModal()` / `modalDone()` — that runs one at a time and only opens the next once the previous is dismissed. Verified in-browser: onboarding shows, opt-in is held at queue length 1, then appears on dismissal, and the queue drains without stalling.

**The guide panel no longer auto-opens.** It used to slide in 1.5s after load for any account under 5 minutes old — on top of onboarding, which explains the same features better and is the thing we actually want finished. Still available from the `? Guide` header button (verified working).

**Surfaced the onboarding plan on `/apex` (`AUDIT.md` #1 and #4).** The personalised plan — archetype, keystone habit, supporting actions and **miss protocol** — was rendered once on the onboarding reveal screen and then never again; `profiles.onboarding_plan` stored it but nothing read it back. So the miss protocol, the guidance meant to save users at their first broken streak, was only ever shown *before* they'd missed a day. `/api/apex-plan` GET now also returns `onboarding_plan` when `apex_plan` is null, and `apex.html` renders it as a "Your starting plan" card instead of the bare "No plan yet" empty state. A generated plan supersedes it.

**Escaping.** The new `renderStarterPlan()` escapes all interpolated values (verified at runtime — injected `<img onerror>` / `<svg onload>` payloads did not execute and produced zero elements). Also retrofitted escaping onto `obShowPlan()` in `index.html`, which was building the same model-generated content with raw template literals into `innerHTML`; it reuses the existing `esc` helper at `index.html:1424`. That one is verified by static check of all six interpolations rather than at runtime, because `_obResult` is a script-scoped `let` and can't be set from the console.

Still not run: `npm test` — node is still not installed on this Mac.
