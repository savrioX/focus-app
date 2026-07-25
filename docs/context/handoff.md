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
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — no longer needed

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
