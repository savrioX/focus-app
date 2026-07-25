# Dev WIP — Codebase audit fixes (2026-07-03)

## Shipped this session

### index.html
1. **Quick-start chips were dead (onboarding-critical).** `onclick="...value=${JSON.stringify(s)}..."` emitted literal `"` inside a double-quoted HTML attribute — attribute terminated early, clicks threw SyntaxError. Fixed in todo/goal/habit empty states with `esc(JSON.stringify(s))` so quotes render as `&quot;`. Same fix applied to the streak share button (`shareStreak`), which had the identical bug via `JSON.stringify(esc(h.text))` -> now `esc(JSON.stringify(h.text))`.
2. **Packs modal opened empty** from onboarding checklist step 2 and the habits empty state (they toggled `.show` without `renderPacks()`). Added global `openPacksModal()` and routed all three entry points through it.
3. **Promo/dev-code Pro lost on reload.** `checkDevCode()` was a no-op and `loadProfile()` overwrote `isPro` from DB. Added `hasDevUnlock()`; `checkDevCode()` sets `isPro`, `loadProfile()` ORs it in. Code is still re-validated server-side by /api/claude on every call.
4. **Post-checkout activation.** `handleProRedirect` now polls `loadProfile()` every 3 s (max 7 tries) until the Stripe webhook flips `is_pro`, instead of one 4 s re-check. Paying users no longer see locked features.
5. **Mobile: `.modal-card` got `max-height: calc(100dvh - 48px); overflow-y: auto`** — Pro modal checkout button was unreachable on short phones.
6. **Focus timer now wall-clock based** (`focusEndsAt` + `focusTick()` at 500 ms, catch-up on `visibilitychange`). Previously `focusSeconds--` in setInterval froze/drifted when the phone locked or the tab was backgrounded.

### api/create-checkout.js
7. Removed `payment_method_types: ['card']` so Stripe Checkout shows dynamic payment methods (Link, wallets) — mobile conversion lift. Verify payment methods are enabled in the Stripe dashboard (Settings -> Payment methods).

## Verified
- All 3 inline script blocks parse (`new Function` check).
- `node --check` passes on api/create-checkout.js.
- Escaped onclick payloads decode to valid JS string literals (incl. quotes/&/< in habit text).

## Known issues left (not shipped, candidates for next session)
- `focusNext()` message/mode cycle: FOCUS->BREAK->LONG repeats; classic pomodoro would be 4 focus blocks before a long break. Copy for BREAK->LONG transition says "Long break earned" after only one focus block.
- /api/claude has no per-user rate limiting (Pro users unlimited haiku calls).
- `applyCode()` validates codes by burning a real haiku call ("ping"/"pong") — cheap but could be a dedicated lightweight endpoint.
- create-checkout trusts client-supplied userId (low risk: attacker would be paying for someone else's Pro).
- Sign-out does not clear `compound_dev` keys (dev unlock persists across accounts on same browser — acceptable, codes are internal).
