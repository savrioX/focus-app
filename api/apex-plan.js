const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const SECRET  = process.env.CRON_SECRET;
const OWNER   = process.env.COMPOUND_ACCOUNT_EMAIL;

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(path, params = '', body = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
}

async function sbUpsert(path, body = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase UPSERT ${res.status}: ${await res.text()}`);
}

let _ownerUid = null;
async function getOwnerUserId() {
  if (_ownerUid) return _ownerUid;
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${SB_URL}/auth/v1/admin/users?per_page=100&page=${page}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const data = await res.json();
    const found = (data.users || []).find(u => u.email === OWNER);
    if (found) { _ownerUid = found.id; return found.id; }
    if ((data.users || []).length < 100) break;
  }
  return null;
}

function calcStreak(loggedDates, today) {
  const dateSet = new Set(loggedDates);
  let streak = 0;
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (!dateSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

async function generatePlan(uid) {
  const today = new Date().toISOString().split('T')[0];
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const from = thirtyAgo.toISOString().split('T')[0];
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getUTCDay()];

  const [todos, habits, logs, goals, brain, profiles] = await Promise.all([
    sbFetch('todos', `?user_id=eq.${uid}&order=created_at.asc&limit=50`),
    sbFetch('habits', `?user_id=eq.${uid}&limit=30`),
    sbFetch('habit_logs', `?user_id=eq.${uid}&logged_date=gte.${from}&logged_date=lte.${today}&limit=5000`),
    sbFetch('goals', `?user_id=eq.${uid}&select=id,text,goal_subtasks(text,done)&limit=20`),
    sbFetch('brain', `?user_id=eq.${uid}&order=created_at.desc&limit=10`).catch(() => []),
    sbFetch('profiles', `?id=eq.${uid}&select=active_context&limit=1`),
  ]);

  const logsByHabit = {};
  for (const l of logs) {
    (logsByHabit[l.habit_id] = logsByHabit[l.habit_id] || []).push(l.logged_date);
  }

  const habitData = habits.map(h => {
    const dates = logsByHabit[h.id] || [];
    return { ...h, streak: calcStreak(dates, today), rate: Math.round((dates.length / 30) * 100) };
  });

  const activeContext = profiles[0]?.active_context || 'Not set';

  const prompt = `You are Apex — the AI Chief of Staff for a 19-year-old solo founder building Compound (dailycompound.app) at $10/month. Pre-first-paying-customer. Building in public on Instagram.

Today: ${today} (${dayName})

TODOS (${todos.length}):
${todos.map((t, i) => `${i+1}. ${t.text}${t.due_date ? ` [due: ${t.due_date}]` : ''}`).join('\n') || 'None'}

HABITS (30-day completion rate):
${habitData.map(h => `- ${h.text}: ${h.streak}-day streak, ${h.rate}% completion last 30 days`).join('\n') || 'None set'}

GOALS:
${goals.map(g => {
  const steps = g.goal_subtasks || [];
  const done = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done);
  return `- ${g.text} (${done}/${steps.length} steps done)\n  Next: ${next ? next.text : 'no steps / all done'}`;
}).join('\n') || 'None set'}

BRAIN NOTES (last 10):
${(brain || []).map(b => `[${b.source}] ${b.content}`).join('\n') || 'None'}

ACTIVE CONTEXT: ${activeContext}

Return ONLY a valid JSON object, no markdown, no code fences:
{
  "analysis": "2-3 honest sentences on where they are right now",
  "weekly_focus": "The single most important thing this week — one sentence",
  "habits_keep": ["habit name"],
  "habits_fix": [{"name": "habit", "suggestion": "what to change"}],
  "habits_drop": ["habit to drop — low completion or misaligned with goals"],
  "habits_add": ["new habit to add based on current goals"],
  "goal_assessment": [{"goal": "text", "status": "on_track|stuck|no_steps", "blocker": "what's stopping it", "next_move": "exact next action to take today"}],
  "schedule": {"morning": "6–9am block activity", "deep_work": "9am–12pm block activity", "afternoon": "1–5pm block activity", "evening": "6–9pm block activity"},
  "self_improvement": ["specific action 1", "specific action 2", "specific action 3"],
  "suggested_tasks": ["task to add to todos"]
}

Be direct. Talk to a founder who wants results, not reassurance. No filler.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';

  let plan = null;
  try {
    plan = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { plan = JSON.parse(match[0]); } catch { plan = null; } }
  }

  if (plan) {
    await sbUpsert('profiles', { id: uid, apex_plan: plan, apex_plan_updated_at: new Date().toISOString() });
  }

  return plan;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const isSecret = token === SECRET;
  let uid;

  if (isSecret) {
    uid = await getOwnerUserId();
  } else {
    const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!userRes?.ok) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userRes.json();
    uid = user.id;
  }

  if (!uid) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    const profiles = await sbFetch(
      'profiles',
      `?id=eq.${uid}&select=apex_plan,apex_plan_updated_at,onboarding_plan,onboarding_at&limit=1`
    );
    const cached = profiles[0];
    // Fall back to the plan built during onboarding. It was previously shown
    // once on the reveal screen and then never again, which left anyone who
    // hadn't hit "Generate Plan" staring at an empty Apex page — and buried the
    // miss protocol, the guidance that matters most at the first broken streak.
    return res.status(200).json({
      plan:            cached?.apex_plan || null,
      updated_at:      cached?.apex_plan_updated_at || null,
      cached:          !!cached?.apex_plan,
      onboarding_plan: cached?.apex_plan ? null : (cached?.onboarding_plan || null),
      onboarding_at:   cached?.onboarding_at || null,
    });
  }

  if (!isSecret) {
    const claimRes = await fetch(`${SB_URL}/rest/v1/rpc/claim_ai_usage`, {
      method:  'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' },
      body:    JSON.stringify({ p_user_id: uid, p_limit: parseInt(process.env.AI_DAILY_LIMIT || '15', 10) }),
    }).catch(() => null);
    const allowed = claimRes?.ok ? await claimRes.json() : true; // fail open if RPC missing/down
    if (allowed === false)
      return res.status(429).json({ error: 'rate_limited', message: 'Daily AI limit reached. Resets at midnight UTC.' });
  }

  try {
    const plan = await generatePlan(uid);
    if (!plan) return res.status(500).json({ error: 'Plan generation failed — could not parse Claude response' });
    return res.status(200).json({ plan, updated_at: new Date().toISOString(), cached: false });
  } catch (err) {
    console.error('apex-plan error:', err);
    return res.status(500).json({ error: err.message });
  }
};
