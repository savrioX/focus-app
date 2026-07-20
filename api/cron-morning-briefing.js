const { Resend } = require('resend');

const resend     = new Resend(process.env.RESEND_API_KEY);
const SB_URL     = process.env.SUPABASE_URL;
const SB_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL    = process.env.APP_URL || 'https://dailycompound.app';
const SECRET     = process.env.CRON_SECRET;
const OWNER      = 'savrio.xsi@gmail.com';
const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
  } catch (_) {}
}

// Instagram/content task by day of week (UTC): 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
const IG_TASKS = [
  'Post the Sunday Scoreboard — same template, same day, every week. This is the spine of the account.',
  'Build reel — pick one feature Claude built this week. One sentence → AI builds it → live result. Post by noon.',
  'Engage: 15 min replying to every comment + comment on 10 niche accounts (build-in-public, student founder, AI tools).',
  'War story or System POV — show the morning briefing, the Apex conversation, or a real failure from this week.',
  'Engage: 15 min replying to every comment + comment on 10 niche accounts.',
  'Script next week\'s content — scoreboard numbers, war story draft, or build reel concept.',
  'Review the week — what performed, what didn\'t. Double down on the top format. Plan Sunday\'s scoreboard numbers.',
];

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: {
      apikey:        SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
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

function briefingHtml({ topHabit, topStreak, goalStep, igTask, appUrl }) {
  const habitBlock = topHabit ? `
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#71717a;">Habit to protect today</p>
    <p style="margin:0 0 4px 0;font-size:15px;color:#18181b;line-height:1.6;font-weight:500;">${topHabit}</p>
    <p style="margin:0 0 28px 0;font-size:13px;color:#71717a;">${topStreak > 0 ? `${topStreak}-day streak. Keep it alive.` : 'Start your streak today.'}</p>` : '';

  const goalBlock = goalStep ? `
    <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#71717a;">One step from your goals</p>
    <p style="margin:0 0 28px 0;font-size:15px;color:#18181b;line-height:1.6;">${goalStep}</p>` : '';

  const igBlock = igTask ? `
          <tr>
            <td style="padding:20px 24px;background:#fafafa;border-radius:10px;margin-top:0;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#7c3aed;">Today's Instagram task</p>
              <p style="margin:0;font-size:14px;color:#18181b;line-height:1.7;">${igTask}</p>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Good morning</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;padding:0 24px;">

          <tr>
            <td style="padding:0 0 32px 0;">
              <span style="font-size:15px;font-weight:700;color:#7c3aed;letter-spacing:-0.3px;">Compound</span>
            </td>
          </tr>

          <tr>
            <td>
              <p style="margin:0 0 28px 0;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.03em;">Good morning.</p>
              ${habitBlock}
              ${goalBlock}
              <p style="margin:0 0 32px 0;">
                <a href="${appUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;">Open Compound →</a>
              </p>
              <p style="margin:0;font-size:15px;color:#18181b;line-height:1.7;">
                — Savrio<br/>
                <span style="color:#71717a;font-size:13px;">dailycompound.app</span>
              </p>
            </td>
          </tr>

          <tr><td style="height:28px;"></td></tr>
          ${igBlock}

          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#d4d4d8;line-height:1.6;">
                <a href="${appUrl}" style="color:#d4d4d8;text-decoration:none;">dailycompound.app</a>
                &middot; Morning briefing &middot; Sent daily at 7 AM UTC
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

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();

  const authHeader  = req.headers.authorization || '';
  const querySecret = req.query?.secret || '';
  if (authHeader !== `Bearer ${SECRET}` && querySecret !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today      = new Date().toISOString().split('T')[0];
    const dayOfWeek  = new Date().getUTCDay();

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const from = ninetyDaysAgo.toISOString().split('T')[0];

    // ── Bulk fetch all data upfront ──────────────────────────────
    const [habits, logs, goals, profilesWithEmail] = await Promise.all([
      sbFetch('habits', '?select=id,user_id,text&limit=10000'),
      sbFetch('habit_logs', `?select=user_id,habit_id,logged_date&logged_date=gte.${from}&logged_date=lt.${today}&limit=50000`),
      sbFetch('goals', '?select=id,user_id,goal_subtasks(text,done)&limit=10000'),
      sbFetch('profiles', '?select=id,email&morning_briefing=eq.true&email=not.is.null&limit=10000').catch(() => []),
    ]);

    const activeUserIds = [...new Set(habits.map(h => h.user_id))];
    if (!activeUserIds.length) return res.status(200).json({ sent: 0 });

    // ── Build lookup maps ────────────────────────────────────────
    const habitsByUser   = {};
    const logsByHabit    = {};
    const goalsByUser    = {};
    const customEmailMap = Object.fromEntries((profilesWithEmail || []).map(p => [p.id, p.email]));

    for (const h of habits) {
      (habitsByUser[h.user_id] = habitsByUser[h.user_id] || []).push(h);
    }
    for (const l of logs) {
      (logsByHabit[l.habit_id] = logsByHabit[l.habit_id] || []).push(l.logged_date);
    }
    for (const g of goals) {
      (goalsByUser[g.user_id] = goalsByUser[g.user_id] || []).push(g);
    }

    // ── Send emails ──────────────────────────────────────────────
    let sent = 0;
    const CHUNK = 20;

    for (let i = 0; i < activeUserIds.length; i += CHUNK) {
      const chunk = activeUserIds.slice(i, i + CHUNK);

      await Promise.all(chunk.map(async uid => {
        try {
          let email = customEmailMap[uid] || null;

          if (!email) {
            // Only look up auth email for the owner — regular users must opt in via profiles.email
            const userRes = await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, {
              headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
            });
            if (!userRes.ok) return;
            const user = await userRes.json();
            if (!user?.email || user.email.endsWith('@focus.local')) return;
            if (user.email !== OWNER) return; // non-opted-in user — skip
            email = user.email;
          }

          // Top habit by streak
          let topHabit = null, topStreak = 0;
          for (const h of (habitsByUser[uid] || [])) {
            const streak = calcStreak(logsByHabit[h.id] || [], today);
            if (streak > topStreak) { topStreak = streak; topHabit = h.text; }
          }

          // First incomplete goal subtask
          let goalStep = null;
          for (const g of (goalsByUser[uid] || [])) {
            const step = (g.goal_subtasks || []).find(s => !s.done);
            if (step) { goalStep = step.text; break; }
          }

          if (!topHabit && !goalStep) return;

          const igTask  = email === OWNER ? IG_TASKS[dayOfWeek] : null;
          const isOwner = email === OWNER;

          const { error } = await resend.emails.send({
            from:    'Savrio from Compound <savrio@dailycompound.app>',
            to:      email,
            subject: 'Good morning. Here\'s today.',
            html:    briefingHtml({ topHabit, topStreak, goalStep, igTask, appUrl: APP_URL }),
          });

          if (!error) sent++;

          // Also send Telegram message for the owner
          if (isOwner) {
            const habitLine = topHabit
              ? `🔥 *Habit to protect*\n${topHabit}${topStreak > 0 ? ` — ${topStreak}-day streak` : ''}`
              : '';
            const goalLine  = goalStep ? `📋 *One step from your goals*\n${goalStep}` : '';
            const igLine    = igTask   ? `📸 *Today\'s Instagram task*\n${igTask}` : '';
            const parts     = ['☀️ *Good morning\\. Here\'s today\\.*', habitLine, goalLine, igLine, `[Open Compound →](${APP_URL})`].filter(Boolean);
            await sendTelegram(parts.join('\n\n'));
          }
        } catch (_) {}
      }));
    }

    return res.status(200).json({ sent, total: activeUserIds.length });

  } catch (err) {
    console.error('Morning briefing error:', err);
    return res.status(500).json({ error: err.message });
  }
};
