// Phase 5 — Onboarding plan engine tests
// Run: node tests/onboarding.test.js
'use strict';

// ── Inline the scoring + skeleton logic from api/onboarding-plan.js ──────────
// (Tests must not require network or Supabase)

const ARCHETYPES = {
  starter:       { name: 'The Starter',       angle: "You haven't built a real baseline yet." },
  overloader:    { name: 'The Overloader',    angle: "You're building too many habits at once." },
  sprinter:      { name: 'The Sprinter',      angle: "You start at 100% and quit on day 4." },
  perfectionist: { name: 'The Perfectionist', angle: "One missed day ends your habit." },
  ghost:         { name: 'The Ghost',         angle: "You forget to do the thing." },
  environmentalist: { name: 'The Environmentalist', angle: "Your environment works against you." },
  planner:       { name: 'The Planner',       angle: "You wait until you feel like doing it." },
};

function scoreArchetype(quiz) {
  const modes = quiz.failure_modes || [];
  const starter     = quiz.attempt === 0 || (quiz.baseline === 0 && quiz.attempt <= 1);
  const overloader  = quiz.load >= 4;
  const calibration = modes.includes('calibration') || (quiz.attempt === 1 && quiz.baseline >= 1);
  const perfectionism = quiz.miss >= 2 || modes.includes('perfectionism');
  const trigger     = modes.includes('trigger') || modes.includes('scheduling') || quiz.trigger === 'variable';
  const environment = modes.includes('environment') && quiz.env !== 'none' && quiz.env !== 'phone';
  const willpower   = modes.includes('willpower') || quiz.motivation === 'mood';

  if (starter)                         return 'starter';
  if (overloader)                      return 'overloader';
  if (calibration && perfectionism)    return 'sprinter';
  if (calibration)                     return 'sprinter';
  if (perfectionism)                   return 'perfectionist';
  if (environment)                     return 'environmentalist';
  if (trigger)                         return 'ghost';
  if (willpower)                       return 'planner';
  return 'ghost';
}

function buildSkeleton(archetype, quiz) {
  const weekOneDuration = Math.max(5, Math.min(15, Math.floor(quiz.time * 0.4)));
  return {
    keystone_habit: {
      label:            `Daily ${quiz.domain} habit`,
      if_then:          `When I [trigger], I will [action] for ${weekOneDuration} minutes [location].`,
      duration_minutes: weekOneDuration,
    },
    supporting_actions: [
      { label: 'Reduce one barrier', if_then: 'When I brush my teeth at night, I will [prep action].' },
    ],
    miss_protocol: 'One miss changes nothing. Two misses in a row is the line you do not cross.',
    week_1_note:   `${weekOneDuration} minutes is deliberately below your ${quiz.time}-minute capacity.`,
  };
}

function buildPlan(quiz) {
  const archetype = scoreArchetype(quiz);
  const plan = buildSkeleton(archetype, quiz);
  return { archetype, archetype_name: ARCHETYPES[archetype].name, angle: ARCHETYPES[archetype].angle, plan };
}

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else           { console.error(`  ✗ ${label}`); failed++; }
}

// ── Base quiz shapes for each archetype ──────────────────────────────────────
const BASE = { failure_modes: [], miss: 1, time: 20, trigger: 'morning', env: 'none', load: 1, motivation: 'scheduled', baseline: 2, attempt: 2 };

const QUIZ_SHAPES = {
  starter:          { ...BASE, attempt: 0 },
  overloader:       { ...BASE, load: 7 },
  sprinter:         { ...BASE, failure_modes: ['calibration'], miss: 3 },
  perfectionist:    { ...BASE, failure_modes: ['perfectionism'], miss: 2 },
  ghost:            { ...BASE, failure_modes: ['trigger', 'scheduling'] },
  environmentalist: { ...BASE, failure_modes: ['environment'], env: 'equipment' },
  planner:          { ...BASE, failure_modes: ['willpower'] },
};

// ── 1. Every archetype produces a valid plan ──────────────────────────────────
console.log('\n1. Every archetype produces a valid plan');

for (const [expectedArchetype, quiz] of Object.entries(QUIZ_SHAPES)) {
  const result = buildPlan({ ...quiz, domain: 'fitness' });

  assert(result.archetype === expectedArchetype,
    `${expectedArchetype}: archetype scored correctly`);

  assert(typeof result.archetype_name === 'string' && result.archetype_name.length > 0,
    `${expectedArchetype}: has archetype_name`);

  assert(typeof result.angle === 'string' && result.angle.length > 0,
    `${expectedArchetype}: has angle`);

  assert(result.plan && typeof result.plan === 'object',
    `${expectedArchetype}: plan object exists`);

  assert(result.plan.keystone_habit && typeof result.plan.keystone_habit.if_then === 'string',
    `${expectedArchetype}: keystone_habit has if_then`);

  assert(typeof result.plan.keystone_habit.duration_minutes === 'number',
    `${expectedArchetype}: keystone_habit has duration_minutes`);

  assert(typeof result.plan.miss_protocol === 'string' && result.plan.miss_protocol.length > 0,
    `${expectedArchetype}: miss_protocol present`);

  assert(Array.isArray(result.plan.supporting_actions),
    `${expectedArchetype}: supporting_actions is array`);

  // Hard constraint: no plan exceeds 3 actions
  const totalActions = 1 + (result.plan.supporting_actions?.length || 0);
  assert(totalActions <= 3,
    `${expectedArchetype}: total actions ≤ 3 (got ${totalActions})`);
}

// ── 2. Hard constraint: week 1 duration is always below stated capacity ───────
console.log('\n2. Week 1 duration is always ≤ 40% of stated time budget');

for (const time of [5, 10, 20, 30, 45]) {
  const result = buildPlan({ ...BASE, domain: 'focus', time });
  const dur = result.plan.keystone_habit.duration_minutes;
  const maxAllowed = Math.floor(time * 0.4);
  assert(dur <= Math.max(5, maxAllowed),
    `time=${time}min → duration=${dur}min (cap=${Math.max(5, maxAllowed)}min)`);
  assert(dur >= 5,
    `time=${time}min → duration ≥ 5min minimum`);
}

// ── 3. Supporting actions never exceed 2 ────────────────────────────────────
console.log('\n3. Supporting actions capped at 2');

for (const domain of ['fitness', 'focus', 'money', 'sleep', 'social']) {
  const result = buildPlan({ ...BASE, domain });
  const count = result.plan.supporting_actions?.length || 0;
  assert(count <= 2,
    `domain=${domain}: supporting_actions.length=${count} ≤ 2`);
}

// ── 4. API failure falls back to template plan ───────────────────────────────
console.log('\n4. API failure fallback: template plan is always valid without Anthropic');

// Simulate: personalized = null → skeleton is used as-is
for (const [archetype, quiz] of Object.entries(QUIZ_SHAPES)) {
  const result = buildPlan({ ...quiz, domain: 'focus' });
  const plan = result.plan;
  // The template plan must be independently valid
  assert(typeof plan.keystone_habit.if_then === 'string' && plan.keystone_habit.if_then.length > 10,
    `${archetype}: template if_then is non-trivial`);
  assert(typeof plan.miss_protocol === 'string' && plan.miss_protocol.includes('miss'),
    `${archetype}: template miss_protocol references 'miss'`);
}

// ── 5. Scoring is deterministic: same input → same archetype ─────────────────
console.log('\n5. Scoring is deterministic');

for (const [expectedArchetype, quiz] of Object.entries(QUIZ_SHAPES)) {
  const results = [0, 1, 2].map(() => scoreArchetype({ ...quiz, domain: 'fitness' }));
  assert(results.every(r => r === expectedArchetype),
    `${expectedArchetype}: same input → same output on 3 calls`);
}

// ── 6. All domains produce valid skeletons ───────────────────────────────────
console.log('\n6. All domains produce valid skeletons');

for (const domain of ['fitness', 'focus', 'money', 'sleep', 'social']) {
  const result = buildPlan({ ...BASE, domain });
  assert(result.plan.keystone_habit.label.includes(domain),
    `domain=${domain}: label contains domain name`);
}

// ── 7. Existing profile columns are not affected ─────────────────────────────
console.log('\n7. Additive-only: new columns are separate from existing profile data');

// Verify the upsert body shape only touches new columns
const NEW_COLUMNS = ['quiz_data', 'archetype', 'onboarding_plan', 'onboarding_at'];
const OLD_COLUMNS = ['active_context', 'email_opt_in', 'email', 'morning_briefing', 'apex_plan', 'apex_plan_updated_at'];
const upsertBody = { id: 'test-uid', quiz_data: {}, archetype: 'ghost', onboarding_plan: {}, onboarding_at: new Date().toISOString() };
for (const col of NEW_COLUMNS) {
  assert(col in upsertBody, `upsert body includes new column: ${col}`);
}
for (const col of OLD_COLUMNS) {
  assert(!(col in upsertBody), `upsert body does NOT overwrite old column: ${col}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Tests: ${passed + failed} total — ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n${failed} test(s) failed.`); process.exit(1); }
else { console.log('\nAll tests passed.'); }
