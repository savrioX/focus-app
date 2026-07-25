# CEO Task Board

## Session: 2026-07-23

### Cycle 6 (Active) — UI/GUI Polish Pass: index.html + ledger.html

**Goal (from Savrio):** Full UI/GUI critique and improvement pass on both main app files. Visual polish only — no JS logic changes, no feature additions, no brand changes.

**Scope:** index.html + ledger.html
- Typography hierarchy
- Spacing consistency
- Color/contrast
- Component design (cards, buttons, inputs, modals)
- Mobile responsiveness
- Visual polish (shadows, radius, transitions)
- Empty/loading states
- Cross-section consistency

**Assignments:**
- **it-dev** — read both files, produce concrete audit list (selector + property + old → new), then implement all approved changes
- **voice-of-reason** — review it-dev's proposed changes before execution, then QC the final modified files

**Constraints:**
- CSS/HTML edits only — zero JS logic changes
- Keep brand palette exactly as-is
- No feature additions, no content changes
- Do not touch vercel.json or api/

**Flow:** it-dev audits → proposes changes → CEO + voice-of-reason review in parallel → CEO approves → it-dev executes → voice-of-reason final QC → CEO commits → deliver to Savrio.

**Status:** Active — agents briefed in parallel.

---

## Session: 2026-07-04

### Cycle 5 (Active) — Major Expansion: Personal Growth Companion

**Goal (from Savrio):** Turn Compound from a habit tracker into a full personal growth companion.

**Scope:**
1. Journal system — daily entries with mood + reflection
2. Post-task emotional check-ins — quick mood prompt on habit/todo completion
3. Daily + weekly progress reports and insights — completion rates, mood trends, streaks
4. Customizable UI — task/goal priority levels, custom goal categories, reminders/notifications
5. Overall richer feel

**Assignments:**
- **it-dev** — full implementation plan: DB schema (journal_entries, mood_checkins, categories/priority columns), new UI (journal tab, insights dashboard), post-task modal flow. Then execute after approval.
- **voice-of-reason** — parallel critique: UX risks, feature ordering, MVP vs nice-to-have. Then final QC of finished build.

**Flow:** Both briefed simultaneously → verdicts to CEO → CEO approves final plan → it-dev executes → voice-of-reason QC → deliver to Savrio.

**Status:** Planning phase — agents briefed in parallel.

---

## Session: 2026-06-24

---

### Cycle 1 (Complete) — Fix Pro Modal Stripe Checkout

**Status:** Done + committed.
- Replaced waitlist email capture with live Stripe checkout button.
- Fixed `focusCompleteToast` undefined-function bug.

---

### Cycle 2 (Active) — Fix Fake Annual Plan UI + Auth TypeError

**Priority:** P1 — Conversion integrity + auth reliability

**Problems identified:**

1. **Fake annual plan in Pro modal** — The modal shows two pricing cards (Monthly $10, Annual $8). The backend (`/api/create-checkout.js`) only has one hardcoded `STRIPE_PRICE_ID`. No annual price exists. Users who click the pre-selected "Annual" card get monthly checkout. This is a misleading UI that creates false expectations and can erode trust when users realize they weren't charged $8/mo.

2. **TypeError in syncAuthUI** — `document.getElementById('age-check-wrap')` returns null (element never existed in HTML). `.style.display` on null throws a TypeError that aborts `syncAuthUI()` mid-execution on every call — auth state changes, sign-in/register toggles. This silently breaks the auth form UI state.

**The fixes:**

1. Replace two-card plan layout with single clean $10/month price block. Remove `selectPlan()` function. Update billing copy to "No lock-in. Cancel anytime from your dashboard."

2. Add null guards for `age-check-wrap` and `age-check` elements in `syncAuthUI`.

**Files:** `C:/Users/klszo/focus-app/index.html` only.

**Assigned to:** it-dev
**Review:** voice-of-reason
**Status:** Complete — committed.

---

### Cycle 3 (Complete) — Fix Onboarding Step 3 + Dead CSS

**Status:** Done + committed.
- Fixed `compound_day2` key never being written (step 3 never completed).
- Removed dead `.plan-card` / `.plan-dim` CSS.

---

### Cycle 4 (Active) — Pro CTA Header Button Visual Treatment

**Problem:** `#btn-unlock-ai` uses the same gray `btn-icon` style as Settings/Focus buttons. It blends in. Every free user sees it on every page load — it's the highest-frequency conversion touchpoint but zero visual weight.

**Fix:** Solid purple background + white text on `#btn-unlock-ai` for non-Pro users. Recede to muted style when Pro (as currently coded).

**Files:** `C:/Users/klszo/focus-app/index.html`
**Assigned to:** it-dev (CEO executing directly)
**Review:** voice-of-reason
**Status:** In progress
