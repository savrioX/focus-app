# COMPOUND — User Confusion Report

> Entries about the Pro modal or $10/month pricing are historical — the paywall
> and Stripe integration were removed from the product (2026-09-05).

Three personas walk the full product. Every point of friction, confusion, or silent failure is logged. No fixes — observations only.

---

## Persona 1 — Marcus, 19 · First-time visitor · Skeptic

**Context:** Found Compound via Google search ("productivity app for student entrepreneurs"). Has tried Notion, Todoist, and Habitica. Cynical about yet another tool. Gives it 3 minutes.

---

### Landing Page

**Confusion #1 — The day badge means nothing to a newcomer.**  
The dynamic badge "Day 84 of building" in the hero (or wherever `#land-day-badge` renders) is confusing to a first-time visitor. Who is building? Building what? There's no context. Marcus thinks it might be a countdown or a trial length.

**Confusion #2 — "system" is an overloaded word.**  
The subheadline "Your system starts in 60 seconds" uses "system" — a word that means different things in different productivity circles (GTD, Atomic Habits, etc.). Does this mean a Notion-style system? A daily schedule? The page doesn't define it before asking him to sign up.

**Confusion #3 — No social proof above the fold.**  
Marcus sees no user count, testimonial, or anything that tells him anyone else uses this. "Free forever" is the trust signal — that's thin.

---

### Sign-Up Flow

**Confusion #4 — Email opt-in checkbox on the sign-up screen.**  
The "Get daily briefings" opt-in on the register form asks for email consent before Marcus knows what the product does. He hasn't tried it yet; he doesn't know if he wants email from it. He leaves it unchecked.

**Confusion #5 — Google OAuth redirect flickers a blank loading screen.**  
After clicking "Continue with Google," the page shows a spinner for ~1.5 seconds with no text. Marcus isn't sure if something is broken or if he clicked wrong.

---

### Onboarding Quiz

**Confusion #6 — Quiz step labels don't explain what you're building toward.**  
Steps 1–6 ask about domain, time, frequency, load, trigger, and failure modes. There's no sentence at the top saying "We're going to build your habit plan from these answers." Marcus is filling out a form without knowing why.

**Confusion #7 — "How many habits are you currently tracking?" with options 1 / 2–3 / 4+.**  
If Marcus has 0 habits (he's new), none of these apply. The lowest option is 1. He picks 1 and moves on, but his archetype score gets `quiz.load = 1`, which technically means he's not an overloader. Not broken, but the missing 0-option introduces noise.

**Confusion #8 — "What usually kills your streak?" lists options like "I lose motivation" vs. "I forget entirely."**  
These aren't mutually exclusive. Most users relate to both. The quiz forces a single choice but the distinction matters (planner vs. ghost archetype). Marcus picks the one that feels most recent, not the one that's most true.

---

### Reveal & Plan Steps

**Confusion #9 — "We found your pattern" doesn't explain what was analyzed.**  
The reveal screen shows the archetype name ("The Sprinter") and its angle. No sentence like "Based on your quiz answers, you're showing the hallmark pattern of…" Marcus doesn't understand the connection between his answers and this label.

**Confusion #10 — Archetype angles are dense and abstract.**  
"You start at 100% and quit on day 4. Your problem is calibration — you set the bar at your ceiling instead of your floor." Good writing but Marcus reads it fast and isn't sure if this is a compliment or a criticism. He takes a screenshot but doesn't feel celebrated.

**Confusion #11 — Plan shows if/then statements without explaining what they are.**  
"When I right after turning off my alarm, I will move my body for 7 minutes at home or outside." (Note: "When I right after turning off my alarm" is also grammatically awkward because the trigger text starts with a gerund phrase being concatenated to "When I".)

Marcus has never heard of implementation intentions. The format looks like a fill-in-the-blank gone wrong. He doesn't understand why the plan looks like this.

**Confusion #12 — "Build my plan →" CTA doesn't do anything visible.**  
It advances to the next screen (plan step), but Marcus expects something to happen — a download, a longer document, a goals setup. The plan screen shows 3 cards. He finishes by clicking "Start Day 1 →" which closes the modal. That's it?

---

### App (First 5 Minutes)

**Confusion #13 — Lands in an app with 1 habit, 0 goals, 0 todos — no next step.**  
After the modal closes, Marcus sees his app. One habit has been added ("Daily fitness habit" or similar). The rest is empty. There's no "Now add a goal" prompt, no checklist, no "here's what to do next." He adds a goal and a todo manually, but most users won't.

**Confusion #14 — The "What I'm building" card looks like a note, not an AI context input.**  
The placeholder says "What's your #1 priority this week? Apex reads this before every response — one sentence is enough." This is buried below the fold. Marcus doesn't know what Apex is yet. He ignores the card.

**Confusion #15 — Apex tab shows a wall of text greeting but no prompt input.**  
The Apex tab greets him: "Hey Marcus. I'm Apex — your AI advisor inside Compound. Add one goal and I'll help you break it into the exact steps that move the needle." He reads it, doesn't see an input field (because he's not Pro), and leaves the tab. He doesn't know Apex is paywalled until he scrolls.

---

## Persona 2 — Jamie, 27 · Motivated but overwhelmed · 2 weeks in

**Context:** Organic search hit the "habit tracker for college students" SEO page. Signed up a week ago. Has been logging habits and tracking 2 goals. Logs in on a Tuesday evening, decent streak going.

---

### Week 1 → Week 2 Experience

**Confusion #16 — No welcome email after signup.**  
Jamie checked their inbox after registering, expecting a confirmation or "here's how to get started" email. Nothing arrived (unless `email_opt_in` was checked and the Resend welcome email fired, but the opt-in is off by default). No email creates doubt: "Did my account actually save?"

**Confusion #17 — Sparkline dots are empty for the first 6 days.**  
Jamie adds their first habit on Day 1. For the first 6 days, the sparkline shows up to 6 empty dots and 1 filled dot. This looks like failure every day, even when Jamie is being consistent. The visual is discouraging before day 7 when it finally shows a meaningful pattern.

**Confusion #18 — "Apex Advisor" tab label vs "AI Coach" in all the marketing copy.**  
The app tab says "Apex Advisor." The landing page, pricing page, and SEO pages all say "AI coach" or "AI advisor." Jamie checks the pricing page to understand what the Pro upgrade includes and can't find "Apex Advisor" listed by that name. The disconnect between in-app naming and marketing naming creates doubt about whether they're the same thing.

**Confusion #19 — Context card says "Apex reads this" but nothing explains Apex on the main page.**  
Jamie never went to the Apex tab. The "What I'm Building" card has a label that references something she hasn't seen. She fills it in anyway (it's just a text input) but doesn't know if it's doing anything.

**Confusion #20 — Day 7 milestone toast appears with no upgrade button.**  
"🗓️ One week in. See exactly where you're winning — unlock your weekly report. ⚡" — the ⚡ emoji signals it's paid. But the toast disappears after 4 seconds with no way to act on it. Jamie can't remember where to go to upgrade. She eventually finds the "AI" button in the top bar, but it's not obvious.

**Confusion #21 — Pro modal says "Free forever" at the bottom while pricing the plan at $10/month.**  
The Pro modal's tagline/footer says something like "Your system, always free." Then the upgrade card says "$10/month." The "free forever" language is meant to apply to the free tier, but in the modal context it creates cognitive dissonance.

**Confusion #22 — No way to view streak history beyond 7 days.**  
Jamie wants to know her all-time record. The sparkline shows 7 days. The streak counter shows the current streak. There's no "view history" or "my progress" page. She doesn't know what happened to the 9-day streak she thinks she had before missing a day.

---

### Apex Tab (First Visit)

**Confusion #23 — "Refresh Plan" button with no explanation of what "plan" means.**  
Jamie visits Apex for the first time. She sees a greeting, a "Refresh Plan" button, and a send button. She doesn't know what refreshing will do, how much it costs (she's not Pro), or whether it'll use her goals and habits.

**Confusion #24 — Apex plan output mixes markdown and plain text depending on the response.**  
If a plan was generated, items like "self_improvement" or "goal_assessment" render as text blocks. The structure (JSON keys rendered as labels) can feel clinical. "habits_fix: [{"name": "Morning run", "suggestion": "..."}]" might not be what Jamie expected from an "AI coach."

*(This depends on implementation of renderPlan() in apex.html and whether the plan keys are mapped to readable labels — worth checking live)*

---

## Persona 3 — Taylor, 23 · Returning after 9 days absent

**Context:** Signed up 3 weeks ago. First week was great — 2 goals, 4 habits, logging every day. Work got busy. Hasn't opened the app in 9 days. Opens it on a Friday afternoon, hesitant.

---

### Re-entry Experience

**Confusion #25 — App opens cold with a streak of 0 everywhere. No acknowledgment of the gap.**  
Taylor's habits show streak = 0. The sparkline shows 9 empty dots and then nothing. There's no message like "Welcome back — it's been a few days, but your system is still here." The emotional welcome is completely missing. The app treats the return exactly the same as any Tuesday login.

**Confusion #26 — The "What I'm Building" card is blank (they never filled it in).**  
Taylor sees an empty card with a placeholder. She doesn't know this feeds Apex. She doesn't know Apex exists.

**Confusion #27 — Milestone toast for Day 7 and Day 14 were already triggered and won't fire again.**  
Taylor hit Day 7 and Day 14 in her first two weeks. Those milestone toasts were stored in localStorage (`compound_milestone_1`, `compound_milestone_3`, etc.) and won't re-fire. If she's returning on Day 21, she gets no acknowledgment of the gap or encouragement to re-engage.

**Confusion #28 — Onboarding checklist may still be visible if she never completed step 3.**  
Step 3 of the onboarding checklist requires logging in on Day 2 (`compound_day2` flag). If Taylor cleared her localStorage since then (or is on a new browser), this step shows as incomplete. The checklist looks like unfinished homework, not a welcoming re-entry.

**Confusion #29 — "Log habit" still shows today's date but there are no previous logs.**  
The habit log inserts for today (Day 22). Her streak shows as 1. Technically correct — but Taylor thought her previous 9-day streak might have been preserved or acknowledged somewhere. There's no "you had a 9-day streak before this gap" in the UI.

**Confusion #30 — No "pause streak" or "grace period" mechanic.**  
Other habit apps (Duolingo, Streaks) have streak freeze / vacation mode. Taylor mentally had a legitimate life reason for missing 9 days but the app treats it as abandonment. Nothing in the UX suggests she can recover or that the gap is expected in a real founder's life.

---

## Cross-Cutting Themes

**Theme A — The app doesn't talk back.**  
Compound collects data (habits, goals, todos, context) but rarely uses it to generate UI messages. The only output is the Apex tab (paywalled), milestone toasts (time-limited), and the Monday stats banner (weekly). Between these, the app is silent. Users who don't hit the Apex tab or pay for Pro never feel the intelligence in the system.

**Theme B — Empty states feel like failure, not invitation.**  
Sparklines with empty dots, streak = 0, blank context card — all look like the user hasn't done enough yet. They could instead feel like a "here's what you'll build" invitation.

**Theme C — Onboarding plan is a one-shot event with no follow-up.**  
The quiz and plan show once. After `_obFinish()`, nothing in the app references the archetype or the 30-day plan again. The plan isn't shown in the habits section ("this habit comes from your onboarding plan"). A user who forgets the quiz result has no way to find it.

**Theme D — Pro gate is invisible until it blocks you.**  
Users don't know most AI features are paywalled until they try to click one and get the Pro modal. There's no persistent "here's what Pro adds" sidebar or preview. The ⚡ icon on locked buttons is subtle.
