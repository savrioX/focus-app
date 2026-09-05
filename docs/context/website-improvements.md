# Website improvement loop — working queue

Started 2026-09-04 while Savrio was away. Self-paced loop, agent-assisted.
**Loop stopped 2026-09-04** — mechanical queue exhausted.

**2026-09-05:** Savrio decided free-forever and approved the Stripe removal.
Items 1, 2, 3, 4 and 7 below are now DONE (commits 25c0d82, 13b350c, 35e9db8,
84c786e, a0c48cc). Items 5, 6 and 8 still need him. See "Still open" at the end.

## Rules this loop ran under

1. **Never push.** Every change is committed locally only. Nothing reaches
   dailycompound.app until Savrio reviews and pushes. Vercel auto-deploys from
   GitHub, so a push *is* a production deploy.
2. **One concern per commit**, so any single change can be reverted alone.
3. **Only verifiable defects** — factually wrong, internally inconsistent,
   broken, or stale. Not speculative redesigns.
4. **Judgment calls are written down, not acted on.**
5. **Stop when the queue is empty** rather than inventing work.

Copy tone rules (commit 771b2f8): no hustle-culture or "no-excuses" framing, no
health claims, no unverifiable or competitor-knocking claims.

## Done — 8 commits, none pushed

| Commit | What |
|---|---|
| 771b2f8 | Copy tone pass: landing page, SEO pages, pricing, habit packs, Apex system prompt |
| 6d91e2a | Legal docs: privacy.html no longer claims Stripe processes payments for "Compound Pro"; terms.html gains a Cost section (no billing/cancellation/refunds). Verified: terms sections renumber cleanly 1–15 |
| 23fa75f | Day counter rendered "127 days in of commits" — broken prose in the credibility paragraph on an indexed page |
| ac182d7 | apple-touch-icon pointed at a nonexistent file (iOS home-screen installs got no icon); ledger.html had zero anchors — no way back to the app |
| 13a4c76 | pricing.html: FAQ item missing its `.faq-item` wrapper; added missing og:type/og:site_name |
| a7b59bc | All 5 SEO pages declared a JSON-LD `url` contradicting their own canonical; index og:url trailing-slash mismatch |
| 6bc1880 | Missing alt text on both logo images; `#habits-pill` had no accessible name |
| 43990c6 | CLAUDE.md + agent defs: Stripe/$10 Pro/Windows path all stale, poisoning every future agent session. Commit count 71+ (actual 168) replaced with the command to check |
| b06a065 | sitemap lastmod dates five weeks stale |

## Still open — needs Savrio

- **CLAUDE.md "Current Goals"** is still a ⚠️ placeholder — the only thing left
  that needs Savrio.
- **Positioning calls** (item 8 below): Instagram tone, repo-root marketing docs,
  Windows leftover scripts, the maskable icon.

## Resolved 2026-09-05 — kept for context

### 1. "Free forever" vs "free today" — pick one
pricing.html:51, the CTA in habit-tracker-college-students.html:81, and several
meta descriptions promise **"free forever."** index.html:1031 and the new
terms.html §4 use softer additive wording. These now disagree. "Free forever" is
a business commitment, not a copy choice. Decide, and the site gets made
consistent either way.

### 2. Custom 404 page is never served — VERIFIED LIVE
`curl https://dailycompound.app/this-page-does-not-exist` returns Vercel's
generic `NOT_FOUND` platform page, not the designed `404.html` in this repo.
Cause: `vercel.json` uses the legacy `version: 2` `routes` array whose catch-all
`/(.*)` → `/$1.html` rewrites unmatched paths to a nonexistent `.html`. The same
catch-all also swallows unlisted `/api/*` paths.
Fix is a `routes` → `rewrites` migration, which reroutes every URL on the site.
Not attempted — it needs testing against a Vercel preview deploy first.

### 3. Three Stripe endpoints still deployed
`api/create-checkout.js`, `api/customer-portal.js`, `api/stripe-webhook.js`
exist and are routed in `vercel.json:5-7,26-28`; `package.json:12` still depends
on `stripe ^16.0.0`.
Audit confirmed **nothing gates on `is_pro`** — `isPro` and `stripeCustomerId`
in index.html are assigned but never read, and no server route checks them. It
is dead weight, not a live gate.
Security angle: `api/create-checkout.js:3-7` is an **unauthenticated POST**
accepting an arbitrary `userId`, and `docs/BUGS.md:76-78` already documents this.
A reviewer who reads BUGS.md and finds the endpoint still routed concludes you
document bugs but don't close them.
**If you delete them, it must be one atomic commit** — files + vercel.json
entries together, or the Vercel build fails and the site stops deploying.
Also then: drop the stripe dep; fix the now-false comment at index.html:2657
("Paid Pro is determined server-side"); edit index.html:1746 `.select()` BEFORE
ever dropping the `is_pro`/`stripe_customer_id` columns from Supabase, or
profile loads 400 for every user.

### 4. The 15/day AI cap is undisclosed
`AI_DAILY_LIMIT` defaults to 15 (api/claude.js:13) and applies to everyone.
pricing.html:74 answers "Is it really free?" with "no credit card, no trial
period, **no upsell**" under a "100% free. No catch." headline. A user who hits
the wall on day one met exactly a catch. index.html's FAQ *does* mention a
fair-use cap; the pricing page does not.
Recommend one sentence on pricing.html disclosing it. Framing is your call.

### 5. Day counter starts 2026-05-01; first commit is 2026-05-13
Renders "Day 127 of building in public" (index.html:1500,
focus-app-for-students.html:86). Counting from the first commit it's Day 115. Not
provably wrong — you may have started before the first push — but an employer
cross-referencing the badge against public GitHub history finds a 12-day gap.
Minor bug either way: `new Date('2026-05-01')` parses as UTC while `Date.now()`
is local, so the number flips a day early in your own timezone (-0400).

### 6. CLAUDE.md "Current Goals" is now a placeholder
All three previous goals were "convert free users to $10/month Pro." Marked
⚠️ NEEDS SAVRIO in the file. Replace with real goals.

### 7. apex.html / ledger.html / brain.html have no meta at all
No description, canonical, og tags, or `noindex`. All three are publicly
reachable, robots.txt allows everything, and they're linked from the app header.
Google can and will index them and invent snippets. `ledger.html`'s title is
just "The Ledger" — unattributable to Compound.
Decide: public marketing surfaces (add full meta + sitemap entries) or
app-internal (add `noindex`). Then it's mechanical.

### 8. Positioning calls, not bugs
- Instagram content (`instagram_content/`, `compound_reels.md`,
  `docs/content-calendar.html`) still uses viral-hook framing including a "War
  Story" pillar. The landing page links to @thestartupjournal1 three times.
  `compound_reels.md:30,43,120` still boast "Stripe payments — done."
- `AUDIT.md`, `RESEARCH.md`, and `docs/` sit in the repo root and contain old
  marketing scripts that contradict the current product. Whether build-in-public
  artifacts belong in a repo an employer reads is your call.
- Windows leftovers at repo root: `open-claude.bat`, `push.bat`, `push.ps1`,
  `take_screenshots.ps1`, alongside working macOS twins. Harmless, but they
  undercut the macOS story if anyone looks.
- Keeping the "19-year-old solo founder" framing at all.
- `manifest.json` declares the same `logo.PNG` as maskable with no safe-zone
  padding, so it clips on Android adaptive-icon launchers.

---

## Day counter — settled 2026-09-05

Savrio confirmed the build started **2026-05-01**. The first commit is
2026-05-13; the 12-day gap is pre-repo work, not an error. Do not "correct"
the counter to the first-commit date. Fixed in 2e31832: the date is now parsed
as local midnight, and the students page's stale hardcoded fallback is gone.
