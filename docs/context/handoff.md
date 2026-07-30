# Claude Code Handoff — Compound / focus-app

Read this at the start of every session. It replaces needing to catch up from scratch.

---

## Who You're Talking To

**Savrio** — 19-year-old solo founder, Windows 11 (now also Mac).
- Wants **production-ready output**, not options or explanations
- Moves fast, speaks directly — match his energy
- No fluff. Deliver results.
- Email: vsf4046@gmail.com

---

## The Two Products

### 1. Compound — dailycompound.app
Productivity SaaS for student entrepreneurs. Built solo with AI.

**Stack:**
- Frontend: HTML, CSS, vanilla JavaScript (93% of codebase)
- Database/Auth: Supabase
- Hosting: Vercel (auto-deploy from `main` branch on GitHub)
- Payments: Stripe
- Repo: `savrioX/focus-app`

**Positioning:** "Builder OS" — not a wellness app, the exact system Savrio uses to run his startup. Dogfooding as marketing.
- One-line pitch: *"I'm 19, building a startup in public with AI — and the product I'm selling is the exact system I use to do it."*

**Subscription:** $10/month Pro (currently all features free while building user base)

### 2. The Startup Journal — @thestartupjournal1
Instagram documenting the build in public. Goal: 10,000 followers.
Content style: viral hooks, real numbers, build updates, founder lessons.

---

## What We've Built (Session History)

### Landing page rebuild + funnel analytics — July 29, 2026
The homepage was a login wall: `#auth-screen` was `height:100vh; overflow:hidden`
with no scroll, no product visuals and no FAQ, and on mobile `.land-right` had
`order:-1` so the first thing a phone visitor saw was a password field. Rebuilt as
a scrolling page — hero unchanged, then six sections below it (hand-built CSS mock
of the dashboard, how-it-works, features, free-forever, FAQ, final CTA, footer
linking all five SEO pages, which previously got zero internal links from the
homepage). Six funnel events wired via a `trackEvent()` helper.

Also found and fixed the `claim_ai_usage` 429 lockout (commit `f46fa63`): the
function was a bare `UPDATE profiles`, so any user with **no profiles row** got a
permanent `429 "Daily AI limit reached"` on their first AI request. Rows aren't
created at signup, so this killed every AI feature for new users. Savrio ran
`migrations/2026-07-29-fix-claim-ai-usage.sql` on 2026-07-30 and confirmed Generate
Plan works — **resolved, cap now enforced correctly.**

**Landing page structure note:** the whole landing page lives inside
`#auth-screen` in `index.html` and is dark regardless of app theme (it uses
literal colours, not the light/dark custom properties). It's shown/hidden by
setting `style.display` to `'none'` / `''` — **never to `'flex'`**, or the
section stacking breaks. `.land-hero` is the flex split; `#auth-screen` is block.

### Full Pro/paywall removal — July 25, 2026 (commit 2be14bd)
`isPro` was already hardcoded `true` (commit 459f73e), but the paywall UI and marketing copy still advertised a $10/mo Pro tier. Removed all of it:
- `index.html`: deleted the Pro modal, header "Get Pro" button, Stripe checkout/manage-subscription flow, all upsell nudges (milestone toasts, streak badges, goal-complete nudge, chat gating), guide panel "(Pro)" labels.
- `pricing.html`: rewritten as single "$0 forever" plan, no waitlist.
- `focus-app-for-students.html`, `focus-timer-entrepreneurs.html`, `habit-tracker-college-students.html`, `productivity-app-student-entrepreneurs.html`: removed "$10/month Pro plan" copy.
- `terms.html`: removed the paid-subscription clause, renumbered sections.
- Left Stripe backend files (`api/create-checkout.js`, `api/customer-portal.js`, `api/stripe-webhook.js`) untouched — only disconnected the front-end. No live paying customers as of this session (pricing page pre-change said "waitlist," not live checkout).

Also: set global git identity on this Mac (`user.name`/`user.email` were unset — likely why prior commits/work went missing). Committed but not pushed.

### Ledger (`ledger.html`) — last major work July 24, 2026
Complete rewrite. Ledger is now a **standalone page using `window.storage`** — NOT Supabase.

Base habits (hardcoded, locked, never removable):
- **Cut:** Porn, Weed, Social media
- **Protect:** Lifting, Self-care, Meditation, Entrepreneurship, Stretching
- **Grow:** Cardio, Reading

Features added:
- Editable frequency per habit (1–7/wk), saved to `ledger-targets`
- `+ Add habit` per section with custom name + frequency, saved to `ledger-custom`
- Three storage keys: `ledger-week:YYYY-MM-DD`, `ledger-targets`, `ledger-custom`

### Telegram — fully removed
- Deleted `api/telegram.js`
- Removed Telegram tab from `brain.html`
- Removed "syncs to Telegram" label from `index.html`
- Removed `sendTelegram()` from `api/cron-morning-briefing.js`

### Vercel deployment fix
Was hitting 12-function Hobby plan limit (had 13). Fixed by removing `api/telegram.js`.
Current 12 functions: claude, create-checkout, customer-portal, stripe-webhook, email-welcome, cron-streak-reminder, cron-weekly-digest, cron-daily-digest, cron-morning-briefing, brain, apex-plan, onboarding-plan.

### Onboarding
Reduced from 10 → 5 questions. Fixed multi-select deselection bug.

### Auth / Paywall
- Removed paywall: all features free for all signed-in users
- Fixed `isPro=true` for new users with no profile row

### Landing page (last updated ~July 18, 2026)
- Headline: "Not a wellness app. A builder's system."
- Founder quote above fold (mobile-visible)
- Feature bullets rewritten outcome-led
- Auth card: "Free to start. Build your system in 60 seconds."

---

## Pending Items (Not Done Yet)

### Supabase SQL — run in Supabase Dashboard → SQL Editor
```sql
alter table todos add column if not exists due_date date;
alter table profiles add column if not exists apex_plan jsonb;
alter table profiles add column if not exists apex_plan_updated_at timestamptz;
alter table profiles add column if not exists email_opt_in boolean default false;
```
(Migrations for quiz_data, archetype, onboarding_plan, onboarding_at were already run.)

### Vercel env vars to confirm are set
- `CRON_SECRET` = `9e1b6b3998719fd043f84e90031f4b798b3a9bbbe0192857e8bfb218bee1ca57`
- `ANTHROPIC_API_KEY` — must be set
- `RESEND_API_KEY` — must be set
- `COMPOUND_ACCOUNT_EMAIL` — optional, defaults to vsf4046@gmail.com
- `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` — **not set.** This is why the daily
  digest says "Website views: Not configured". Web Analytics itself *is* enabled
  and tracking fine (`/_vercel/insights/script.js` returns 200) — only the
  digest's API read is missing credentials.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — no longer needed

### Landing page / growth follow-ups
- Real 1200×630 `og:image` (currently the square `logo.PNG`, which is why
  `twitter:card` is still `summary` and not `summary_large_image`). Instagram and
  DM link shares are the main traffic source, so this affects click-through.
- `pricing.html` says "everything **Savrio** uses to run his own startup" —
  contradicts `459f73e`, which stripped the founder name from the site. Pick one.
- The `AUDIT.md` activation items are still open and are the natural next step now
  that the top of the funnel works: no Apex plan on arrival, and three modals
  competing for the screen in the first 5 seconds of a new session.
- Node isn't installed on this Mac, so `npm test` can't run here. Install node or
  run the test suite on the Windows machine.

### Instagram / Marketing (not urgent)
- Update Instagram bio to Builder OS angle
- Film Builder OS explainer video and pin it
- Lock in Sunday scoreboard format
- Create Product Hunt maker account (time-sensitive: needs 30+ days age)
- Update meta description in `index.html` (line 7, still generic)
- Pro modal copy — doesn't say "unlock the full OS"

---

## Critical Rules (Do Not Break)

1. **Never delete or modify rows in Savrio's Supabase tables.** His account data is live production data. Read-only and user-triggered inserts are fine. No DELETE or UPDATE on existing rows without asking.

2. **Ledger uses `window.storage`, not Supabase.** If ledger habits aren't loading, don't try to fix "Supabase habits not loading" — it's intentional. The Supabase `habits` table is separate (used by the habits section in `index.html`).

3. **Never spawn Agent subagents for the improvement loop.** When Savrio says "loop" or "agent teams improve the site" — do all work inline in the main context, then call `ScheduleWakeup`. Spawning agents burns credits.

4. **No fluff.** Ship code, not explanations.

---

## Architecture

```
index.html          — Main app (goals, habits, todos, focus timer, Apex Advisor)
ledger.html         — Standalone habit ledger (window.storage only)
brain.html          — Brain dump / Claude.ai sync
apex.html           — Apex Advisor plan + calendar
api/                — Vercel serverless functions
  claude.js         — Apex AI coach (Claude Sonnet)
  brain.js          — Brain API
  apex-plan.js      — Plan generation
  onboarding-plan.js
  create-checkout.js
  customer-portal.js
  stripe-webhook.js
  email-welcome.js
  cron-*.js         — Scheduled jobs (streak reminder, digests, morning briefing)
schema.sql          — Supabase schema
vercel.json         — Deployment config
instagram_content/  — Generated graphics + Python scripts for posts
docs/               — Reference docs, strategy, this file
.claude/agents/     — Agent definitions (ceo, it-dev, publicity, etc.)
```

---

## Brand

| Element | Value |
|:--------|:------|
| Background | `#0a0a0a` |
| Primary purple | `#7c3aed` |
| Bright purple | `#a769ff` |
| Text | `#ffffff` / `#e2e8f0` |
| Vibe | Dark, premium, startup energy |

---

## Key Links
- App: https://dailycompound.app
- GitHub: https://github.com/savrioX/focus-app
- Instagram: @thestartupjournal1
- Supabase project: vsf4046@gmail.com account
- Vercel: auto-deploys from `main`
