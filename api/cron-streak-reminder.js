/**
 * Streak Reminder — runs every day at 8 PM UTC via Vercel Cron
 *
 * Finds users who have habits but haven't logged any today,
 * calculates their current streak length, and sends a personalized reminder.
 */

const { Resend } = require('resend');

const resend  = new Resend(process.env.RESEND_API_KEY);
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'https://dailycompound.app';
const SECRET  = process.env.CRON_SECRET;

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: {
      apikey:         SB_KEY,
      Authorization:  `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// Count consecutive logged days ending yesterday (user hasn't logged today yet)
function calcStreak(loggedDates) {
  const dateSet = new Set(loggedDates);
  let streak = 0;
  const d = new Date();
  d.setDate(d.getDate() - 1); // start from yesterday
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (!dateSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function streakHtml({ name, streak, appUrl }) {
  const streakLine = streak > 0
    ? `Your <strong style="color:#18181b;">${streak}-day streak</strong> is on the line.`
    : `Don't let today be a zero.`;

  const greeting = name ? `${name},` : 'Hey,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your streak is at risk</title>
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
              <p style="margin:0 0 20px 0;font-size:15px;color:#18181b;line-height:1.7;">
                ${greeting}
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#18181b;line-height:1.7;">
                You haven't logged your habits yet today. ${streakLine}
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#18181b;line-height:1.7;">
                30 seconds. That's all it takes to keep the chain alive.
              </p>
              <p style="margin:0 0 32px 0;font-size:15px;color:#18181b;line-height:1.7;">
                <a href="${appUrl}" style="color:#7c3aed;font-weight:600;text-decoration:none;">Log today's habits →</a>
              </p>
              <p style="margin:0;font-size:15px;color:#18181b;line-height:1.7;">
                — Compound<br/>
                <span style="color:#71717a;font-size:13px;">Compound</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 0 0 0;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#d4d4d8;line-height:1.6;">
                <a href="${appUrl}" style="color:#d4d4d8;text-decoration:none;">dailycompound.app</a>
                · You're getting this because you have active habits in Compound.
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
    const today = new Date().toISOString().split('T')[0];

    // All users with at least one habit
    const habits = await sbFetch('habits', '?select=user_id&limit=10000');
    const userIdsWithHabits = [...new Set(habits.map(h => h.user_id))];
    if (!userIdsWithHabits.length) return res.status(200).json({ sent: 0 });

    // Users who already logged today
    const todayLogs = await sbFetch('habit_logs', `?select=user_id&logged_date=eq.${today}&limit=10000`);
    const loggedToday = new Set(todayLogs.map(l => l.user_id));

    const needsReminder = userIdsWithHabits.filter(uid => !loggedToday.has(uid));
    if (!needsReminder.length) return res.status(200).json({ sent: 0, message: 'Everyone logged today' });

    // Streak data — last 90 days of logs for users who need a reminder
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const from = ninetyDaysAgo.toISOString().split('T')[0];

    const recentLogs = await sbFetch(
      'habit_logs',
      `?select=user_id,logged_date&logged_date=gte.${from}&logged_date=lt.${today}&limit=50000`
    );

    // Build per-user date sets
    const logsByUser = {};
    for (const log of recentLogs) {
      if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
      logsByUser[log.user_id].push(log.logged_date);
    }

    // Get profiles — only users who opted in to email
    const profileRows = await sbFetch('profiles', '?select=id,username,email_opt_in&limit=10000');
    const usernameById = Object.fromEntries(profileRows.map(p => [p.id, p.username]));
    const optedIn = new Set(profileRows.filter(p => p.email_opt_in).map(p => p.id));

    const sendList = needsReminder.filter(uid => optedIn.has(uid));
    if (!sendList.length) return res.status(200).json({ sent: 0, message: 'No opted-in users need a reminder' });

    // Get emails via admin API
    let sent = 0;
    const CHUNK = 20;

    for (let i = 0; i < sendList.length; i += CHUNK) {
      const chunk = sendList.slice(i, i + CHUNK);

      await Promise.all(chunk.map(async uid => {
        try {
          const userRes = await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, {
            headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
          });
          if (!userRes.ok) return;
          const user = await userRes.json();
          if (!user?.email) return;

          const streak = calcStreak(logsByUser[uid] || []);
          const name = usernameById[uid] || null;

          const { error } = await resend.emails.send({
            from:    process.env.EMAIL_FROM || 'Compound <hello@dailycompound.app>',
            to:      user.email,
            subject: streak > 0
              ? `Your ${streak}-day streak is at risk.`
              : "Don't let today be a zero.",
            html: streakHtml({ name, streak, appUrl: APP_URL }),
          });

          if (!error) sent++;
        } catch (_) {}
      }));
    }

    return res.status(200).json({ sent, total: sendList.length, skipped: needsReminder.length - sendList.length });

  } catch (err) {
    console.error('Streak reminder error:', err);
    return res.status(500).json({ error: err.message });
  }
};
