# COMPOUND — Bug Report

Adversarial QA audit. Discovery only — no fixes applied. All findings are in the state found.

Severity guide: **P0** = broken in production right now | **P1** = major data/security | **P2** = user-facing correctness | **P3** = minor / edge case

---

## P0 — Show-Stoppers

### BUG-01 · Supabase migrations never run — onboarding plan silently not persisted in production

**File:** `api/onboarding-plan.js` (upsert block at end) / `schema.sql`  
**Reproduction:**
1. Sign up as a new user
2. Complete the onboarding quiz
3. Observe plan shown in UI (works — from in-memory `_obResult`)
4. Sign out and sign back in
5. Plan is gone — Supabase has no record of it

**Expected:** Plan, archetype, and quiz answers saved to `profiles` row.  
**Actual:** Supabase returns a 400 error ("column does not exist") on the upsert. The error is caught by:
```js
} catch (err) { console.error('onboarding-plan store error:', err.message); }
```
…and swallowed. The API still returns 200 with the plan, so the client sees it — but nothing is persisted.

The GET endpoint (`GET /api/onboarding-plan`) also fails silently: it selects `archetype,onboarding_plan` (columns that don't exist), gets a Supabase error object instead of an array, falls through to `p?.archetype || null`, and returns `{ archetype: null, plan: null }`.

**Root cause:** Four `ALTER TABLE` migration statements in `schema.sql` are commented out and have never been run in the Supabase dashboard:
```sql
-- alter table profiles add column if not exists quiz_data jsonb;
-- alter table profiles add column if not exists archetype text;
-- alter table profiles add column if not exists onboarding_plan jsonb;
-- alter table profiles add column if not exists onboarding_at timestamptz;
```

**Impact:** Every user who has completed the onboarding quiz has lost their plan. The quiz feature is effectively a broken no-op in production.

**Fix required:** Run the four `ALTER TABLE` statements in Supabase Dashboard → SQL Editor.

---

## P1 — Major Issues

### BUG-02 · Hardcoded Pro bypass codes in API source — no session required

**File:** `api/claude.js`, lines 1–2  
**Reproduction:**
```bash
curl -X POST https://dailycompound.app/api/claude \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hello"}],"devCode":"COMPOUND19"}'
```

**Expected:** Only authenticated Pro users can call the AI endpoint.  
**Actual:** `HARDCODED_CODES = ['COMPOUND19', 'APEX']` in the source bypass all session and Pro checks. The code is validated with no auth header required. Anyone who knows either string gets unlimited Apex access, billed to your Anthropic account.

The comment in the frontend (`applyCode`) says "valid codes must never ship in this file" — and indeed they don't ship in the frontend. But they do ship in the Node API file, which lives in the repo.

**Impact:** If this repo is ever public (or the code leaks), anyone can use Apex for free indefinitely. Anthropic API costs are unbounded from your side.

---

### BUG-03 · `create-checkout.js` has no authentication

**File:** `api/create-checkout.js`  
**Reproduction:**
```bash
curl -X POST https://dailycompound.app/api/create-checkout \
  -H 'Content-Type: application/json' \
  -d '{"userId":"any-uuid","email":"victim@example.com"}'
```

**Expected:** Caller must prove they own the userId.  
**Actual:** The endpoint accepts any `userId` from the request body with no Bearer token check. It creates a Stripe checkout session with `client_reference_id: userId`. If an attacker knows a victim's UUID (from any Supabase leak or by guessing), they could create a checkout URL that — if paid — grants Pro to the victim, not the attacker. Real-world impact is low (attacker spends money, victim gets Pro), but the architectural gap is real.

The bigger risk: if `userId` is omitted or null, `client_reference_id` is null in Stripe — see BUG-08.

---

## P2 — Correctness Issues

### BUG-04 · `obShowPlan()` injects Anthropic API output unescaped into innerHTML

**File:** `index.html`, lines 2300, 2303, 2306, 2309  
**Reproduction:**
1. Take the onboarding quiz with unusual input in free-text fields
2. The Anthropic `claude-haiku` response for `keystone_if_then` / `support_if_then` is placed directly into a template literal that is set as `innerHTML`

**Vulnerable lines:**
```js
html += `...${plan.keystone_habit.if_then}...`        // line 2300
html += `...${a.if_then}...`                           // line 2303
html += `...${plan.miss_protocol}...`                  // line 2306
html += `...${plan.week_1_note}...`                    // line 2309
document.getElementById('ob-plan-items').innerHTML = html;  // line 2311
```

**Expected:** All API-sourced strings are escaped before insertion.  
**Actual:** If the Anthropic API returns any HTML/script in these fields (e.g., if a prompt injection from quiz answers succeeds), it renders as live HTML. Attack vector: user crafts quiz answers that steer the AI to output `<img src=x onerror=...>` inside `if_then`. This is self-XSS (own session only), but the surface is worth closing.

---

### BUG-05 · `apex.html` `renderPlan()` injects Anthropic API output unescaped into innerHTML

**File:** `apex.html`, `renderPlan()` function  
**Vulnerable injections:** `plan.analysis`, `plan.weekly_focus`, `plan.schedule[k]`, `plan.self_improvement[i]`, `plan.suggested_tasks[t]` — all raw into innerHTML.

The Apex prompt includes `active_context` (user-controlled one-liner), brain notes, and goal text. Any of these can steer the AI response. Same self-XSS risk as BUG-04 but the prompt includes more user-controlled input.

---

### BUG-06 · `prevDay()` returns UTC date — streak counts wrong for UTC+ users

**File:** `index.html`, line 1811  
```js
function prevDay(d) {
  const dt = new Date(d+'T00:00:00');  // parsed as LOCAL midnight
  dt.setDate(dt.getDate()-1);
  return dt.toISOString().slice(0,10); // 🐛 toISOString() is UTC
}
```

**Reproduction (UTC+1 timezone):**
- User is in Berlin (UTC+1)
- `prevDay('2026-07-24')`:
  - `new Date('2026-07-24T00:00:00')` = local midnight July 24 = UTC 23:00 July 23
  - `setDate(getDate()-1)` → local midnight July 23 = UTC 23:00 July 22
  - `toISOString().slice(0,10)` = `'2026-07-22'`
- Expected: `'2026-07-23'` — Actual: `'2026-07-22'`

**Expected:** Returns the calendar day before `d` in the user's local timezone.  
**Actual:** Returns a day that is 2 days before `d` for UTC+ users, causing `calcStreak()` to skip logged days and under-report streaks.

**Impact:** Any user in Europe, Asia, Africa, or Australia sees streak counts that are lower than reality, and may see streak "breaks" on days they actually logged.

**Not affected:** US/Americas users (UTC- timezones). UTC+ = ~60% of world population.

---

### BUG-07 · `setProById()` in Stripe webhook doesn't check upsert response status

**File:** `api/stripe-webhook.js`, `setProById()` function  
**Reproduction:** Cause a Supabase transient error (e.g., DB overloaded) during a successful Stripe payment.

**Expected:** Error logged; Stripe retries webhook delivery and Pro is eventually granted.  
**Actual:** The `fetch` call result is not checked:
```js
await fetch(`${SUPABASE_URL}/rest/v1/profiles`, { ... });
// No response status check — silent failure
```
If the Supabase upsert returns 400/500 (e.g., profile row doesn't exist yet, or DB issue), the function returns without error. The outer try/catch in the handler logs nothing for this path. The user paid but doesn't get Pro. No retry mechanism besides Stripe's own webhook retry.

---

### BUG-08 · Stripe webhook `checkout.session.completed` doesn't guard against null `client_reference_id`

**File:** `api/stripe-webhook.js`, `checkout.session.completed` handler  
**Reproduction:** Create a Stripe checkout session without `client_reference_id` (e.g., a session created directly in Stripe dashboard).

**Expected:** Null `client_reference_id` is rejected.  
**Actual:**
```js
await setProById(s.client_reference_id, true, s.customer);
// If s.client_reference_id is null → upserts {id: null, is_pro: true} → constraint violation or wrong row
```
No null check before calling `setProById`. Silent failure.

---

## P3 — Minor / Edge Cases

### BUG-09 · `brain.js` sets `Access-Control-Allow-Origin: *`

**File:** `api/brain.js`, lines 2–5  
```js
res.setHeader('Access-Control-Allow-Origin', '*');
```
The Brain API (which reads and writes personal productivity notes) has wildcard CORS. Combined with the Bearer token auth, this means any website can make requests to the Brain API on behalf of a user who has been tricked into copying their Supabase token. The auth requirement provides meaningful protection, but wildcard CORS on a private data API is a pattern to avoid. Narrow to `https://dailycompound.app` (the only legitimate origin).

---

### BUG-10 · Onboarding completion stored only in localStorage — cross-device plan overwrite

**File:** `index.html`, line 2327; `initApp()` line 1419  
Condition for showing onboarding:
```js
if (!localStorage.getItem('compound_onboarded') && habits.length === 0 && goals.length === 0)
```
`compound_onboarded` lives in localStorage. On a new device or new browser (or incognito), the flag is gone. If the user also has 0 habits and 0 goals (common right after signup), onboarding shows again. Completing it again calls `POST /api/onboarding-plan` which overwrites `archetype`, `quiz_data`, and `onboarding_plan` in Supabase with the new quiz answers. A second run could produce a different archetype and erase the first.

**Dependency:** This only matters once BUG-01 is fixed (migrations run).

---

### BUG-11 · `invoice.paid` Stripe webhook can race ahead of profile row with `stripe_customer_id`

**File:** `api/stripe-webhook.js`, `invoice.paid` handler  
Stripe event ordering is not guaranteed. If `invoice.paid` fires before `checkout.session.completed` (or before the Supabase upsert in `setProById` completes), the PATCH:
```js
await fetch(`...profiles?stripe_customer_id=eq.${inv.customer}`, { method: 'PATCH', ... })
```
…matches 0 rows (no profile has that `stripe_customer_id` yet) and succeeds silently. The user then gets Pro from `checkout.session.completed`. So in the happy path this resolves itself, but there's no log for the missed `invoice.paid` handler.

---

### BUG-12 · Founder email hardcoded in three API files

**Files:** `api/claude.js` line ~33, `api/apex-plan.js` line 6, `api/brain.js` line 5  
**RESOLVED 2026-09-05.** The owner email was hardcoded as OWNER_EMAIL in three
API files and exposed in source. All three now read `COMPOUND_ACCOUNT_EMAIL`
from the environment with no fallback. Note the old value remains in git
history — see `docs/context/website-improvements.md`.

---

## Top 10 by (Severity × User Impact)

| Rank | Bug | Severity | Users hit |
|:-----|:----|:---------|:----------|
| 1 | BUG-01 Migrations not run — onboarding plan never saved | P0 | 100% of new users |
| 2 | BUG-02 Hardcoded Pro bypass codes (`COMPOUND19`/`APEX`) | P1 | Anyone who finds them |
| 3 | BUG-06 `prevDay()` UTC bug — wrong streaks for UTC+ users | P2 | ~60% of world (Europe, Asia) |
| 4 | BUG-05 Apex `renderPlan()` XSS via unescaped innerHTML | P2 | Any Pro user if AI injected |
| 5 | BUG-04 `obShowPlan()` XSS via unescaped plan innerHTML | P2 | Any user after onboarding |
| 6 | BUG-07 Stripe upsert result unchecked — silent Pro failure | P2 | Any user on Stripe edge case |
| 7 | BUG-03 `create-checkout` no auth | P1 | Low real-world impact but architectural gap |
| 8 | BUG-08 Null `client_reference_id` in Stripe webhook | P2 | Edge case / manual Stripe sessions |
| 9 | BUG-10 Onboarding re-triggers on new device — plan overwrite | P3 | Multi-device users |
| 10 | BUG-09 Wildcard CORS on Brain API | P3 | Low — requires token exfil first |
