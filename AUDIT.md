# Phase 1 Audit — Compound Onboarding & Personalization

> Read-only audit. No code changes. Covers signup → quiz → first tracked habit.

---

## 1. Every Screen Between Landing and First Tracked Habit

| # | Screen | Trigger | Element | What it shows | What it stores | Clicks to advance |
|---|--------|---------|---------|---------------|----------------|-------------------|
| 1 | **Landing page** | Page load (unauthenticated) | `#auth-screen` | Two-column: quote + "Not a wellness app. A builder's system." on left; Google button + username/password auth card on right | Nothing | — |
| 2a | **Google OAuth** (primary path) | Click "Continue with Google" | Google popup | Google consent / account picker | Supabase creates session | 1 (Google account select) |
| 2b | **Username/password form** (secondary path) | Default or toggle "Sign in" | `#auth-card` | Username, password, optional email, email opt-in checkbox | `profiles` row with `email_opt_in`, `email` if provided | 2 (fill + submit) |
| 3 | **Loading overlay** | Auth callback | `#load-overlay` | Spinner — "Loading your data…" | Nothing | 0 (auto-advances) |
| 4 | **App reveals** | `SIGNED_IN` event fires | `#app` | Dashboard fully visible but populated with zeros. No onboarding yet. | Nothing | 0 (auto-advances) |
| 5 | **Email opt-in modal** | Google OAuth only, account age <90s, 3s delay | `#optin-modal` | "One quick thing — can I send you a welcome email and a daily nudge?" | `profiles.email_opt_in` via Supabase PATCH | 1 (yes or no) |
| 6 | **User guide panel** | Account age <300s, not seen before, 1.5s after initApp | `#guide-panel` (slide-in) | "How to use Compound" — feature explanations, tips | `compound_guide_seen` in localStorage | 1 (close ×) |
| 7 | **Onboarding modal** | No habits AND no goals AND not `compound_onboarded`, 900ms delay | `#onboarding-modal` | "Build your system in 60 seconds." Three sections: Cut pills, Build pills, Goal text input | Habits → `habits` table; Goal → `goals` table; `compound_onboarded` → localStorage | 3+ (pill selects + type goal + submit) |
| 8 | **Dashboard with checklist** | After onboarding completes (if not all 3 steps done) | `#onboarding-checklist` injected into `.grid-wrap` | 3-step checklist: Set goal / Add habit / Come back tomorrow. Progress bar at top. | Nothing (reads from goals/habits length + localStorage) | 0 (ambient) |
| 9 | **First habit check-off** | User clicks habit checkbox | Habit row in `#habits-list` | +1 float animation, streak increments | `habit_logs` row inserted into Supabase | 1 |

**Total click count, Google OAuth path (minimal selections): ~8–9 clicks**
**Total click count, username/password path: ~10–12 clicks**

Note: Step 5 only fires for Google users. Steps 5, 6, and 7 can overlap in timing — all three may compete for the screen within the first 5 seconds of first session.

---

## 2. Where Quiz Answers Are Stored and Whether Anything Reads Them

### What the "quiz" actually is

The onboarding modal (`index.html:896–924`) presents three inputs:

1. **Cut pills** — multi-select from a hardcoded array (`OB_CUT`, line 1997):
   `['Porn','Alcohol','Weed','Social media before noon','Junk food','Gaming','Vaping']`

2. **Build pills** — multi-select from a hardcoded array (`OB_GROW`, line 1998):
   `['Exercise','Deep work 2h','Read 20 pages','Meditation','Journaling','Cold shower','Early wake (6am)','No phone first hour','Weekly review']`

3. **Goal text** — free-text input, single field

### What gets stored

```
completeOnboarding() — index.html:2013–2034
```

- Selected habit names (both cut and build) → `habits` table, one row per selected item. No tag, no category, no origin marker.
- Goal text → `goals` table, one row.
- `compound_onboarded = '1'` → localStorage only (not Supabase).

**No quiz metadata is stored anywhere.** There is no `domain`, `archetype`, `quiz_answers`, `failure_mode`, `onboarding_at`, or `quiz_data` field in `profiles`, `habits`, or `goals`. The system has no record that the user came from onboarding vs. manually adding habits later.

### Whether anything reads them

**Nothing reads quiz answers as quiz answers.** The habits and goals created during onboarding are indistinguishable from any habit or goal the user adds manually on day 30. The Apex prompt in `api/apex-plan.js` (line 90–127) reads all habits, goals, todos, brain notes, and `active_context` — but there is no quiz data or archetype to read.

**Conclusion:** The quiz is currently a habit-bootstrapper, not a personalization engine. Zero diagnostic signal survives beyond the raw habit list.

---

## 3. Current Apex Prompts and What Context They Receive

### Prompt 1 — Weekly plan generation (`api/apex-plan.js:90–127`)

**Triggered by:** POST to `/api/apex-plan` (manual "Generate Plan" click in apex.html)

**Context received:**
- Today's date and day name
- All todos (up to 50), with `due_date` if set
- All habits, with 30-day streak and completion rate
- All goals, with subtasks and done/pending status
- Last 10 brain notes (source + content)
- `profiles.active_context` (the "What I'm building" textarea)

**What it does NOT receive:**
- Quiz answers / onboarding selections
- User archetype or domain
- Historical failure patterns
- Time budget or environment constraints
- How long the user has been on the platform

**Output schema:** JSON with `analysis`, `weekly_focus`, `habits_keep/fix/drop/add`, `goal_assessment`, `schedule`, `self_improvement`, `suggested_tasks`

**Critical gap:** The plan is generic across all users. A new user with 0 habits and a user with 60-day streaks get structurally identical prompts. The model cannot know if the user is on day 1 or day 200.

---

### Prompt 2 — Apex chat (`index.html:2728`)

**Triggered by:** Any chat message sent to Apex panel

**System prompt:**
> "You are Apex — a sharp, no-nonsense personal advisor inside the Compound productivity app used by ${name}, a student entrepreneur. You have full visibility into their goals, habits, and daily tasks. Be direct, practical, and motivating. Think like a mentor who has built companies, not a therapist. Keep responses concise and actionable."

**Context received via `buildContext()`:**
- Goals with subtask progress (% done)
- Habits with streaks
- Active todos

**What it does NOT receive:**
- Quiz/onboarding data
- Archetype or failure mode
- Account age / how long since signup

---

### Prompt 3 — Goal step suggestion (`index.html:2427`)

**Triggered by:** "✨ Suggest steps" button on a goal

**Prompt:** Single-shot: "My goal is: '${g.text}'. Suggest 4-5 specific, actionable steps. Classify each as habit or todo."

**Context received:** Goal text only.

---

## 4. The 5 Highest-Friction Points in First-Session Experience (Ranked)

### #1 — No plan on arrival

A brand-new user who completes onboarding lands on the dashboard with **nothing from Apex**. The Apex plan card in `apex.html` says "No plan yet — hit Generate Plan." The chat panel intro is generic. There is no personalized first move waiting for the user. The most common new-user behavior is: look at empty cards, add a few things, close the tab.

**Impact:** Users leave before building any data for Apex to analyze. The feedback loop that makes Compound valuable never starts.

---

### #2 — Modal collision in first 5 seconds (Google users)

Google OAuth new users encounter three layered interruptions before they can interact with the product:

1. Email opt-in modal (3s delay after sign-in)
2. User guide panel (1.5s after initApp — which starts immediately after SIGNED_IN)
3. Onboarding modal (900ms after initApp)

The timing means all three can stack. A user who dismisses the email opt-in may immediately see the guide, and then the onboarding modal under it. None of these are sequenced — they fire on independent timers. There is no modal queue.

**Impact:** Cognitive overload before the user has formed any intent. Most users click through all three without reading.

---

### #3 — Quiz captures WHAT, not WHY

The onboarding modal asks what habits to build and what goal to pursue, but collects **zero signal about failure mode**. Two users who both select "Exercise" could have completely different reasons for past failure: one quits after missing a day (all-or-nothing thinking); the other starts too intense and burns out (calibration problem). The system cannot tell them apart and gives them the same default Apex experience.

**Impact:** Personalization is impossible without this signal. The 30-day plan objective requires it.

---

### #4 — No miss protocol surfaced before the first miss

There is a day-2 milestone toast: "You came back. Most people don't." But there is **nothing proactively telling the user what to do after a broken streak**. The system surfaces no guidance until after the break happens — and at that point, most users never return. The onboarding flow has no mention of the inevitability of missing a day or what the recovery protocol is.

**Impact:** First streak break = last session for most users. The highest-churn moment is unaddressed.

---

### #5 — `compound_onboarded` lives in localStorage, not Supabase

Onboarding completion is tracked only in `localStorage.getItem('compound_onboarded')`. This means:

- A returning user on a new device or browser sees the onboarding modal again (habits/goals already exist, so the modal guard partially works — but only if data has loaded)
- There is no server-side record of whether a user completed onboarding or skipped it
- Reporting and analytics on onboarding completion rate are impossible

**Impact:** Can't measure onboarding completion. Can't retarget users who skipped. Can't use onboarding data to segment communications.

---

## Summary Table

| Finding | Severity | Blocks Phase |
|---------|----------|--------------|
| No plan on arrival | Critical | 4 (plan generation) |
| Modal collision | High | 3 (quiz redesign) |
| Quiz captures WHAT not WHY | Critical | 3 (quiz redesign) |
| No miss protocol | High | 4 (plan generation) |
| Onboarding tracked in localStorage only | Medium | 3 (quiz redesign) |
| No archetype system | Critical | 3 (quiz redesign) |
| Apex prompt has no onboarding context | Critical | 4 (plan generation) |
| Onboarding habits indistinguishable from manual | High | 3 (quiz redesign) |

---

## Stack Clarification

The prompt brief describes this as "Next.js/TypeScript on Vercel." **The actual stack is HTML/CSS/vanilla JavaScript** (confirmed via `package.json` — no Next.js, no TypeScript). The backend is serverless Node.js API routes in `/api/`. This affects Phase 3–4 execution: no `npm run build` type-check, no component framework. Tests will need to be vanilla JS or Node.js scripts.
