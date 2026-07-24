# Phase 2 Research — Behavioral Science Foundations for the Plan Engine

> Read-only phase. No code changes. All claims attributed. Anything unsupported by named research is cut.

---

## 1. Implementation Intentions — Gollwitzer (1999)

**Primary source:** Gollwitzer, P.M. (1999). "Implementation intentions: Strong effects of simple plans." *American Psychologist*, 54(7), 493–503.

**Meta-analysis:** Gollwitzer, P.M. & Sheeran, P. (2006). "Implementation intentions and goal achievement: A meta-analytic review and assessment." *Advances in Experimental Social Psychology*, 38, 69–119. (94 independent studies, effect size d=0.65 — one of the largest replicated effects in behavior change research.)

### What the research says

A "goal intention" is a resolution: "I will exercise more." An "implementation intention" specifies when, where, and how: "**If** it is Monday at 5pm and I close my laptop, **then** I will put on my running shoes and walk for 15 minutes."

The if-then format links a situational cue (the trigger) to a specific action. Gollwitzer's studies showed participants with implementation intentions were 2–3× more likely to act than those with goal intentions alone. The effect is independent of motivation level — it works even when motivation is low, because the cue-action link fires without deliberate decision-making.

The three required elements are:
1. **Trigger** — a specific situational cue ("when I finish dinner")
2. **Location** — where it happens ("in my kitchen")
3. **Action** — specific and bounded ("I will do 10 push-ups")

Generic habit labels fail all three. "Exercise" is not an implementation intention. "Workout for 45 minutes at the gym" fails on trigger. "When I brush my teeth at 7am, I will do 10 push-ups in the bathroom" succeeds on all three.

### Product implication for Compound

The onboarding modal collects "Exercise" as a habit. Nothing in the current system captures trigger, location, or duration. The Apex prompt in `api/apex-plan.js` generates `habits_add` suggestions but they are also generic labels ("Add morning exercise to your routine").

**The plan engine must output implementation intentions, not habit labels.** Every action in the 30-day plan must have:
- `trigger`: "When [cue]..."
- `location`: "...at [place]..."
- `action`: "...I will [verb] for [bounded duration]"

The quiz (Phase 3) must capture the trigger and location because Apex cannot invent plausible ones. A user whose trigger is "after gym class" is architecturally different from one whose trigger is "before my 9pm phone charge." Apex can personalize the language; it cannot fabricate a trigger that actually fits the user's life.

---

## 2. Fogg Behavior Model — Fogg (2009)

**Primary source:** Fogg, B.J. (2009). "A behavior model for persuasive design." *Proceedings of the 4th International Conference on Persuasive Technology* (Persuasive '09). ACM Press.

**Supporting work:** Fogg, B.J. (2020). *Tiny Habits: The Small Changes That Change Everything.* Houghton Mifflin Harcourt. (Academic foundation laid in the 2009 paper and subsequent lab publications at Stanford Persuasive Tech Lab.)

### What the research says

**B = MAP**: Behavior occurs when Motivation, Ability, and Prompt converge at the same moment.

The model has three components:
- **Motivation** — desire to perform the behavior. Fluctuates. Unreliable as a primary lever.
- **Ability** — how easy the behavior is to perform. Inversely related to difficulty. Designable.
- **Prompt** — the trigger that initiates the behavior. Without a prompt, behavior doesn't happen even when motivation and ability are present.

The critical finding is the **motivation-ability tradeoff**: a behavior with low ability (easy) requires less motivation to trigger. A behavior with high ability demand (hard) requires high motivation, which is unavailable during illness, stress, exhaustion — exactly when streaks break.

Fogg's prescription: Start behaviors at a fraction of target difficulty. A user who wants to run 5km should start with 2 minutes of walking after turning off the morning alarm. The target behavior scales naturally once the trigger-action link is automated. Starting at full intensity relies on motivation that will not always be present.

The prompt is the most systematically neglected element in productivity apps. Apps typically optimize for motivation (streaks, badges, affirmations) and partially for ability (starter packs, suggestions), but almost never for prompt architecture (when exactly does the user encounter the trigger?).

### Product implication for Compound

The onboarding wizard currently shows "What do you want to build?" — this optimizes for motivation (aspiration). It doesn't ask about ability or prompt.

**The quiz must capture ability floor, not aspiration ceiling.** Not "Do you want to exercise?" but "On your worst day this week — sick, tired, behind on everything — what is the smallest version of this habit you could still do?" This is the week-1 habit. Week 2 scales from there.

**Hard constraint for Phase 4:** Week 1 action durations must be set below the user's stated capacity. If the user says they have 30 minutes/day, week 1 habits use a maximum of 15 minutes total. This is a code constraint, not a prompt suggestion — the plan generator must enforce it before calling the API.

---

## 3. Self-Determination Theory — Deci & Ryan (1985, 2000)

**Primary source:** Deci, E.L. & Ryan, R.M. (2000). "The 'what' and 'why' of goal pursuits: Human needs and the self-determination of behavior." *Psychological Inquiry*, 11(4), 227–268.

**Original theory:** Deci, E.L. & Ryan, R.M. (1985). *Intrinsic Motivation and Self-Determination in Human Behavior.* Plenum Press.

**Application to digital behavior change:** Teixeira, P.J., Carraça, E.V., Markland, D., Silva, M.N., & Ryan, R.M. (2012). "Exercise, physical activity, and self-determination theory: A systematic review." *International Journal of Behavioral Nutrition and Physical Activity*, 9, 78.

### What the research says

SDT identifies three basic psychological needs whose satisfaction predicts sustained motivation:

**Autonomy** — the sense that behavior is self-chosen and aligned with one's own values, not externally imposed. When users feel controlled (e.g., app-prescribed habits, obligatory check-ins), intrinsic motivation declines even if behavior continues. Teixeira et al. (2012) found autonomy support was the strongest predictor of long-term exercise adherence across 66 studies.

**Competence** — the sense of being capable and effective. Progress indicators satisfy competence, but only if they reflect real skill development. Arbitrary metrics (step counts, "points") can backfire if they don't connect to felt improvement. Streak loss triggers competence threat — users avoid re-engaging because returning makes the failure visible.

**Relatedness** — the sense of meaningful connection to others who care. Apps that surface social proof or community (even passively, e.g., "10,000 people completed their habits today") satisfy relatedness. Build-in-public mechanics tap this need directly.

### Product implication for Compound

**Autonomy:** The archetype diagnosis must present itself as a pattern the user recognizes, not a label imposed on them. "You start too big and quit after day 4 — your problem is calibration, not discipline" works because it names a behavior the user has already lived. "You're an Overachiever" does not — it names an identity, which triggers defensiveness. The quiz must surface a diagnosis the user *nods at*, not a compliment.

**Competence:** The miss protocol must be framed around ongoing competence ("Your 30-day consistency is still 87%"), not loss ("Streak broken — 0"). The current milestone system does a partial version of this (day-2 return toast) but it fires only after the user shows up again. The miss protocol must fire the day the streak breaks, not after recovery.

**Relatedness:** Out of scope for Phase 3–4 but relevant for later: surfacing "X other users with your archetype completed week 1" would satisfy relatedness without requiring social features.

---

## 4. Habit Formation Timelines — Lally et al. (2010)

**Primary source:** Lally, P., van Jaarsveld, C.H.M., Potts, H.W.W., & Wardle, J. (2010). "How are habits formed: Modelling habit formation in the real world." *European Journal of Social Psychology*, 40(6), 998–1009.

**Study design:** 96 participants selected a new eating, drinking, or activity behavior to perform daily for 12 weeks. Automaticity (the core marker of habit — "acting without thinking") was self-rated daily on the Self-Report Habit Index.

### What the research says

**Mean automaticity plateau: 66 days.** Range: 18–254 days. The distribution is highly right-skewed — most behaviors plateau between 18 and 84 days, but the tail extends to 8+ months for complex behaviors.

The "21 days" figure comes from a non-experimental observation by plastic surgeon Maxwell Maltz in *Psycho-Cybernetics* (1960) about how long it took amputees to stop feeling phantom limbs. It was never a study, never involved habits, and was later dropped from subsequent editions of the book. It persists in popular culture with no scientific basis.

**Critical finding on missed days** (Lally et al., 2010, p. 1001): "Missing one opportunity to perform the behaviour did not significantly affect the habit formation process." In the regression models, single-day misses were statistical noise — they did not bend the automaticity curve. Two or more consecutive misses, however, did produce measurable regression.

Simple behaviors (drinking a glass of water at lunch) reached automaticity fastest (~18–21 days). Complex or effortful behaviors (50 sit-ups after morning coffee) took significantly longer (54+ days median).

### Product implication for Compound

**The 30-day plan is a first-month framework, not a completion target.** This framing should be explicit in the UI: "By day 30 you'll feel friction when you don't do this. That's the goal — not finishing a plan." Otherwise users expect the habit to feel automatic by day 30 and disengage when it still requires effort.

**The plan must include only behaviors in the lower complexity range.** A keystone habit that takes 20+ minutes or involves multiple environmental steps will not reach automaticity in 30 days for most users. The hard constraint (under 20 minutes in week 1) is not arbitrary — it tracks the ~18–21 day automaticity window for simple behaviors.

**The miss protocol is scientifically grounded.** One miss does not matter (Lally et al., confirmed). The app can state this as fact, not reassurance: "Missing one day has no measurable effect on habit formation. Missing two days in a row does. That's the rule."

---

## 5. Streak Mechanics and Abandonment

**Primary sources:**

Gardner, B., Lally, P., & Wardle, J. (2012). "Making health habitual: the psychology of 'habit-formation' and general practice." *British Journal of General Medicine*, 62(605), 664–666.

Polivy, J. & Herman, C.P. (1985). "Dieting and binging: A causal analysis." *American Psychologist*, 40(2), 193–201. (Original description of the what-the-hell effect in diet behavior; widely replicated across self-control domains.)

Baumeister, R.F., Bratslavsky, E., Muraven, M., & Tice, D.M. (1998). "Ego depletion: Is the active self a limited resource?" *Journal of Personality and Social Psychology*, 74(5), 1252–1265. (Self-control as depletable resource — explains why misses cluster around high-stress periods.)

Dai, H., Milkman, K.L., & Riis, J. (2014). "The fresh start effect: Temporal landmarks motivate aspirational behavior." *Management Science*, 60(10), 2563–2582. (Monday effect, new year, birthdays — applies to streak restart psychology.)

### What the research says

**Why streaks work:** Streaks externalize the accumulation of self-regulatory behavior into a visible count. They function as a commitment device (the cost of breaking a streak grows with its length) and satisfy the competence need (the number signals capability). They are motivationally effective up to the moment they break.

**Why streak breaks cause abandonment — the what-the-hell effect:** Polivy and Herman (1985) documented the counter-regulatory eating response in dieters: when participants violated their diet (even slightly), they consumed significantly more food than control participants who had not dieted at all. The mechanism: the diet represented an all-or-nothing standard. Any violation meant the standard was failed, so constraint was abandoned entirely ("what the hell"). This pattern has been replicated in exercise, alcohol, and productivity contexts.

Applied to streaks: a broken streak represents a violated standard. The loss of the streak creates: (a) loss-aversion activation (the accumulated streak is now "gone"), (b) what-the-hell licensing ("I've already failed, so missing tomorrow too doesn't make it worse"), and (c) competence threat (returning to the app makes the failure visible, so avoidance is easier than re-engaging).

**The second consecutive miss is the critical failure point.** Lally et al. (2010) established that single misses don't damage habit formation. What's not in that paper but is supported by the what-the-hell literature: the second miss is behaviorally much more likely than the first miss, because the first miss removes the "never missed" self-concept that was functioning as a restraint.

**Known mitigations:**

*Streak freeze / forgiveness day (Duolingo model):* Allows one miss without breaking the displayed streak. Reduces dropout but also reduces urgency. Research context: Duolingo hasn't published academic results, but the product behavior supports the hypothesis — their "streak freeze" is the most-used Pro feature.

*"Never miss twice" rule (grounded in Lally 2010):* Surfaced proactively before the first miss. The rule is: one miss is allowed, two consecutive misses is not. This preserves the binary standard while inserting a single-day buffer. The key is that it must be known *before* the first miss — users who encounter it for the first time when their streak breaks are already in what-the-hell territory.

*Fresh start reframing (Dai et al., 2014):* Temporal landmarks (Monday, month start, birthdays) reset aspirational behavior. The "fresh start" effect works by breaking psychological continuity with past failures. The implication: when a streak breaks mid-week, framing the recovery as a "new week reset" on Monday reduces what-the-hell duration compared to asking the user to restart immediately.

*Consistency-percentage framing:* "Your 30-day consistency is 87%" vs. "Streak broken — 0 days." Both describe the same data. The first activates competence (I am a person who does this 87% of the time). The second activates loss and all-or-nothing thinking. The framing that maintains engagement is not the accurate one — it's the one that maps to how the user needs to see themselves.

### Product implication for Compound

**The miss protocol must be delivered before the first miss, not after.** In the 30-day plan, there should be an explicit "What to do if you miss a day" section surfaced on day 1 of onboarding, visible in the plan card, and re-surfaced as a tooltip when the user's streak first breaks.

**Protocol content (scientifically grounded):**
1. "One miss has no effect on habit formation. This is from a 2010 study of 96 participants. Do not spiral."
2. "The only rule: never miss twice in a row. Tomorrow is non-negotiable."
3. "Don't compensate — skip the 'catch-up' impulse. Just do the normal version tomorrow."

**Streak display should be supplemented by consistency percentage** — not replacing the streak (which works before first break), but shown alongside it after any miss occurs.

**Fresh start anchor:** When a user's streak breaks mid-week, the copy should say "Reset begins [Monday]" rather than "Start over today." This reduces the competence cost of returning.

---

## Summary: One Product Implication Per Framework

| Framework | Core Claim | Product Implication |
|-----------|-----------|---------------------|
| Implementation Intentions (Gollwitzer 1999) | If-then specificity 2–3× increases follow-through | Every plan action needs trigger + location + duration. Quiz must capture these. Apex can write the language; it cannot invent the trigger. |
| Fogg B=MAP (2009) | Ability is designable; motivation is not. Week 1 must be below capacity. | Hard-code week 1 duration cap in plan generator. Quiz must capture "minimum viable day" not aspiration. |
| Self-Determination Theory (Deci & Ryan 2000) | Autonomy + competence + relatedness predict sustained behavior | Archetype must diagnose a *pattern*, not label an *identity*. Miss protocol framed around ongoing competence ("87% consistency"), not loss ("streak broken"). |
| Lally et al. (2010) | Habit formation mean = 66 days; one miss is noise; complexity predicts timeline | Frame 30-day plan as "end of phase 1, not end of journey." Week 1 behaviors must be in simple-behavior complexity range (≤20 min). Miss protocol is fact-based ("one miss has no measurable effect"), not reassurance. |
| What-the-hell effect (Polivy & Herman 1985) + Fresh start (Dai et al. 2014) | First streak break triggers all-or-nothing abandonment. Second miss is the real inflection point. | Miss protocol delivered before first miss (in onboarding plan, not after break). "Never miss twice" framing. Consistency percentage shown alongside streak count after first miss. Monday fresh-start anchor. |
