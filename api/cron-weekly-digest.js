/**
 * Weekly Digest — runs every Monday at 8 AM UTC via Vercel Cron
 *
 * For each user with at least one habit, computes:
 *   - Habits logged in the past 7 days (total logs)
 *   - Best streak across all habits in the past 7 days
 *   - Goals with subtask completion %
 *
 * Uses Supabase REST API with service role (bypasses RLS).
 */

const { Resend } = require('resend');

const resend  = new Resend(process.env.RESEND_API_KEY);
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'https://dailycompound.app';
const SECRET  = process.env.CRON_SECRET;

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function sbFetch(path, params = '') {
  const url = `${SB_URL}/rest/v1/${path}${params}`;
  const res = await fetch(url, {
    headers: {
      apikey:        SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toISODate(d) { return d.toISOString().split('T')[0]; }

function getWeekWindow() {
  const now    = new Date();
  const endDt  = new Date(now);
  endDt.setDate(endDt.getDate() - 1); // yesterday
  const startDt = new Date(endDt);
  startDt.setDate(startDt.getDate() - 6); // 7 days total
  return { start: toISODate(startDt), end: toISODate(endDt), startDt, endDt };
}

// Compute the longest consecutive streak of logged dates for a given set of dates
function longestStreak(sortedDates) {
  if (!sortedDates.length) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) { cur++; max = Math.max(max, cur); }
    else { cur = 1; }
  }
  return max;
}

// ── Email HTML ────────────────────────────────────────────────────────────────
function digestHtml({ habitsLogged, bestStreak, totalHabits, goals, weekLabel }) {
  const completionPct = totalHabits > 0
    ? Math.round((habitsLogged / (totalHabits * 7)) * 100)
    : 0;

  const goalsHtml = goals.length > 0
    ? goals.map(g => {
        const pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
        const bar = Math.round(pct / 5); // 0–20 blocks
        const filled   = '█'.repeat(bar);
        const unfilled = '░'.repeat(20 - bar);
        return `
          <tr>
            <td style="padding:0 0 16px 0;">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#ffffff;">${escapeHtml(g.text)}</p>
              <p style="margin:0 0 6px 0;font-size:12px;color:#7c3aed;font-family:monospace;">${filled}${unfilled} ${pct}%</p>
              <p style="margin:0;font-size:12px;color:#71717a;">${g.done} / ${g.total} steps done</p>
            </td>
          </tr>`;
      }).join('')
    : `<tr><td style="padding:0 0 16px 0;font-size:13px;color:#71717a;">No goals set yet — add one in Compound.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your weekly digest</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#7c3aed;letter-spacing:-0.5px;">Compound</span>
            </td>
          </tr>

          <tr>
            <td style="background:#18181b;border-radius:12px;padding:40px 36px;">

              <p style="margin:0 0 8px 0;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Weekly Digest</p>
              <h1 style="margin:0 0 6px 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">
                Here's your week
              </h1>
              <p style="margin:0 0 32px 0;font-size:13px;color:#71717a;">${weekLabel}</p>

              <!-- Stats row -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td width="33%" style="text-align:center;background:#09090b;border-radius:8px;padding:20px 8px;">
                    <p style="margin:0 0 4px 0;font-size:28px;font-weight:700;color:#7c3aed;">${habitsLogged}</p>
                    <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Habits Logged</p>
                  </td>
                  <td width="4%"></td>
                  <td width="30%" style="text-align:center;background:#09090b;border-radius:8px;padding:20px 8px;">
                    <p style="margin:0 0 4px 0;font-size:28px;font-weight:700;color:#7c3aed;">${bestStreak}</p>
                    <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Best Streak</p>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;background:#09090b;border-radius:8px;padding:20px 8px;">
                    <p style="margin:0 0 4px 0;font-size:28px;font-weight:700;color:#7c3aed;">${completionPct}%</p>
                    <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Completion</p>
                  </td>
                </tr>
              </table>

              <!-- Goals -->
              <p style="margin:0 0 16px 0;font-size:14px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Goal Progress</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${goalsHtml}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
                      Open Compound →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                <a href="${APP_URL}" style="color:#7c3aed;text-decoration:none;">dailycompound.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();

  const authHeader  = req.headers.authorization || '';
  const querySecret = req.query?.secret || '';
  if (authHeader !== `Bearer ${SECRET}` && querySecret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { start, end, startDt, endDt } = getWeekWindow();
    const weekLabel = `${startDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // ── Fetch base data ────────────────────────────────────────────────────
    const [habits, habitLogs, goals, goalSubtasks] = await Promise.all([
      sbFetch('habits',        '?select=id,user_id,text&limit=10000'),
      sbFetch('habit_logs',    `?select=user_id,habit_id,logged_date&logged_date=gte.${start}&logged_date=lte.${end}&limit=100000`),
      sbFetch('goals',         '?select=id,user_id,text&limit=10000'),
      sbFetch('goal_subtasks', '?select=id,goal_id,done&limit=100000'),
    ]);

    // ── Group by user ──────────────────────────────────────────────────────
    const userHabits = {}; // uid -> habit[]
    for (const h of habits) {
      if (!userHabits[h.user_id]) userHabits[h.user_id] = [];
      userHabits[h.user_id].push(h);
    }

    const userLogs = {}; // uid -> log[]
    for (const l of habitLogs) {
      if (!userLogs[l.user_id]) userLogs[l.user_id] = [];
      userLogs[l.user_id].push(l);
    }

    const userGoals = {}; // uid -> goal[]
    for (const g of goals) {
      if (!userGoals[g.user_id]) userGoals[g.user_id] = [];
      userGoals[g.user_id].push(g);
    }

    const subtasksByGoal = {}; // goal_id -> subtask[]
    for (const s of goalSubtasks) {
      if (!subtasksByGoal[s.goal_id]) subtasksByGoal[s.goal_id] = [];
      subtasksByGoal[s.goal_id].push(s);
    }

    // ── Compute stats per user ─────────────────────────────────────────────
    const allUserIds = Object.keys(userHabits);

    // Fetch emails for all users via admin API in parallel (chunks of 50)
    const emailMap = {}; // uid -> email
    const CHUNK = 50;
    for (let i = 0; i < allUserIds.length; i += CHUNK) {
      const chunk = allUserIds.slice(i, i + CHUNK);
      const results = await Promise.all(
        chunk.map(uid =>
          fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, {
            headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      for (let j = 0; j < chunk.length; j++) {
        if (results[j]?.email) emailMap[chunk[j]] = results[j].email;
      }
    }

    // ── Send emails ────────────────────────────────────────────────────────
    let sent = 0;
    for (const uid of allUserIds) {
      const email = emailMap[uid];
      if (!email) continue;

      const myHabits   = userHabits[uid] || [];
      const myLogs     = userLogs[uid]   || [];
      const myGoals    = userGoals[uid]  || [];

      // Total habit logs this week
      const habitsLogged = myLogs.length;

      // Best streak this week — across all habits, find the longest consecutive run
      const logsByHabit = {};
      for (const l of myLogs) {
        if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = [];
        logsByHabit[l.habit_id].push(l.logged_date);
      }
      let bestStreak = 0;
      for (const dates of Object.values(logsByHabit)) {
        const sorted = [...dates].sort();
        bestStreak = Math.max(bestStreak, longestStreak(sorted));
      }

      // Goal progress
      const goalsWithProgress = myGoals.map(g => {
        const subtasks = subtasksByGoal[g.id] || [];
        return {
          text:  g.text,
          total: subtasks.length,
          done:  subtasks.filter(s => s.done).length,
        };
      });

      const { error } = await resend.emails.send({
        from:    'Compound <hello@dailycompound.app>',
        to:      email,
        subject: `Your week in Compound — ${weekLabel}`,
        html:    digestHtml({
          habitsLogged,
          bestStreak,
          totalHabits: myHabits.length,
          goals:       goalsWithProgress,
          weekLabel,
        }),
      });

      if (!error) sent++;
    }

    return res.status(200).json({ sent, total: allUserIds.length });

  } catch (err) {
    console.error('Weekly digest error:', err);
    return res.status(500).json({ error: err.message });
  }
};
