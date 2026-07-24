const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const ARCHETYPES = {
  starter: {
    name: 'The Starter',
    angle: "You haven't built a real baseline yet — you're estimating what you can do, not knowing it. Your problem is starting from assumptions instead of evidence.",
  },
  overloader: {
    name: 'The Overloader',
    angle: "You're building too many habits at once. Your problem isn't motivation — it's that you're splitting your willpower budget across too many fronts simultaneously.",
  },
  sprinter: {
    name: 'The Sprinter',
    angle: "You start at 100% and quit on day 4. Your problem is calibration — you set the bar at your ceiling instead of your floor.",
  },
  perfectionist: {
    name: 'The Perfectionist',
    angle: "One missed day ends your habit. You're not undisciplined — you're applying an all-or-nothing standard to something that requires consistency over perfection.",
  },
  ghost: {
    name: 'The Ghost',
    angle: "You forget to do the thing — not because you don't want to, but because there's no cue in your day that fires reliably. Your problem is a missing trigger, not missing commitment.",
  },
  environmentalist: {
    name: 'The Environmentalist',
    angle: "Your environment works against the behavior you're trying to build. Willpower can't beat a setup that makes the habit difficult every single day.",
  },
  planner: {
    name: 'The Planner',
    angle: "You think about the habit but wait until you feel like doing it. That feeling doesn't come reliably. Your problem is treating motivation as a prerequisite instead of a byproduct.",
  },
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

const TRIGGER_TEXT = {
  morning:   'right after turning off my alarm',
  midday:    'when I take my lunch break',
  afternoon: 'as soon as my last class or work session ends',
  evening:   'after I finish dinner',
  variable:  'at 7:00am',
};

const DOMAIN_ACTION = {
  fitness: { verb: 'move my body',                          location: 'at home or outside' },
  focus:   { verb: 'do focused work on one task',           location: 'at my desk with phone away' },
  money:   { verb: 'review my finances or work on income',  location: 'at my desk' },
  sleep:   { verb: 'begin my wind-down routine',            location: 'in my bedroom' },
  social:  { verb: 'reach out to one specific person',      location: 'wherever I am' },
};

const ENV_PREP = {
  equipment: 'lay out the gear I need on my desk or floor',
  phone:     'put my phone in a different room',
  people:    'close my door and put on headphones',
  mobile:    'identify the location I pass daily where I can do this',
  none:      'set a phone alarm labelled with my habit name',
};

function buildSkeleton(archetype, quiz) {
  const weekOneDuration = Math.max(5, Math.min(15, Math.floor(quiz.time * 0.4)));
  const trigger  = TRIGGER_TEXT[quiz.trigger]  || TRIGGER_TEXT.variable;
  const action   = DOMAIN_ACTION[quiz.domain]  || DOMAIN_ACTION.focus;
  const envPrep  = ENV_PREP[quiz.env]          || ENV_PREP.none;

  return {
    keystone_habit: {
      label:            `Daily ${quiz.domain} habit`,
      if_then:          `When I ${trigger}, I will ${action.verb} for ${weekOneDuration} minutes ${action.location}.`,
      duration_minutes: weekOneDuration,
    },
    supporting_actions: [
      {
        label:   'Reduce one barrier',
        if_then: `When I brush my teeth at night, I will ${envPrep}.`,
      },
    ],
    miss_protocol: 'One miss changes nothing. Two misses in a row is the line you do not cross. If you miss: do the minimum version tomorrow — no catch-up, no guilt, just the habit.',
    week_1_note:   `${weekOneDuration} minutes is deliberately below your ${quiz.time}-minute capacity. Boring week 1 is the goal — automatic comes before optimal.`,
  };
}

async function personalizePlan(skeleton, quiz, archetype) {
  if (!API_KEY) return null;
  const trigger = TRIGGER_TEXT[quiz.trigger] || TRIGGER_TEXT.variable;
  const dur     = skeleton.keystone_habit.duration_minutes;
  const env     = quiz.env;

  const prompt = `Someone's habit failure pattern: "${ARCHETYPES[archetype].angle}"

Domain: ${quiz.domain} | Worst-day time budget: ${quiz.time} min | Week 1 target: ${dur} min
Trigger window: ${trigger} | Environment constraint: ${env}

Rewrite the two if/then statements below to be vivid and specific. Return ONLY valid JSON, no markdown:
{
  "keystone_if_then": "When [very specific ${quiz.domain} cue at ${trigger}], I will [concrete ${quiz.domain} action verb + specific behavior] for exactly ${dur} minutes [specific location].",
  "support_if_then": "When [specific prep cue at a different time of day], I will [specific action that removes the ${env} friction barrier]."
}

Rules: duration must be exactly ${dur} minutes. Start each with 'When'. Be concrete, not generic.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          API_KEY,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    if (!parsed) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }
    return parsed;
  } catch {
    return null;
  }
}

async function sbUpsert(path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey:          SB_KEY,
      Authorization:   `Bearer ${SB_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase UPSERT ${res.status}: ${await res.text()}`);
}

module.exports = async function handler(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!userRes?.ok) return res.status(401).json({ error: 'Unauthorized' });
  const user = await userRes.json();

  if (req.method === 'GET') {
    const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=archetype,onboarding_plan&limit=1`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const profiles = await pr.json();
    const p = profiles[0];
    return res.status(200).json({ archetype: p?.archetype || null, plan: p?.onboarding_plan || null });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const quiz = req.body?.quiz;
  if (!quiz || !quiz.domain) return res.status(400).json({ error: 'quiz.domain required' });

  const archetype = scoreArchetype(quiz);
  const skeleton  = buildSkeleton(archetype, quiz);

  const personalized = await personalizePlan(skeleton, quiz, archetype);
  if (personalized?.keystone_if_then) skeleton.keystone_habit.if_then = personalized.keystone_if_then;
  if (personalized?.support_if_then)  skeleton.supporting_actions[0].if_then = personalized.support_if_then;

  // Hard constraint: never more than 2 supporting actions
  skeleton.supporting_actions = skeleton.supporting_actions.slice(0, 2);

  const result = {
    archetype,
    archetype_name: ARCHETYPES[archetype].name,
    angle:          ARCHETYPES[archetype].angle,
    plan:           skeleton,
    api_used:       !!personalized,
  };

  try {
    await sbUpsert('profiles', {
      id:              user.id,
      quiz_data:       quiz,
      archetype,
      onboarding_plan: result,
      onboarding_at:   new Date().toISOString(),
    });
  } catch (err) {
    console.error('onboarding-plan store error:', err.message);
  }

  return res.status(200).json(result);
};
