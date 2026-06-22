/**
 * Streak Reminder — runs every day at 8 PM UTC via Vercel Cron
 *
 * Logic:
 *   Find every user who:
 *     1. Has at least one habit
 *     2. Has NOT logged ALL their habits today
 *   Then send them a reminder email.
 *
 * We use the Supabase REST API (service role) so we can query across all users.
 * RLS is bypassed by the service role key.
 */

const { Resend } = require('resend');

const resend   = new Resend(process.env.RESEND_API_KEY);
const SB_URL   = process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL  = process.env.APP_URL || 'https://dailycompound.app';
const SECRET   = process.env.CRON_SECRET;

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

// ── Email HTML ────────────────────────────────────────────────────────────────
function streakReminderHtml(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Don't break your streak</title>
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
            <td style="background:#18181b;border-radius:12px;padding:40px 36px;text-align:center;">

              <p style="margin:0 0 16px 0;font-size:40px;">🔥</p>
              <h1 style="margin:0 0 16px 0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">
                Your streak is on the line
              </h1>
              <p style="margin:0 0 32px 0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                You haven't logged your habits yet today.<br/>
                It only takes 30 seconds — don't let a busy day break the chain.
              </p>

              <a href="${APP_URL}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
                Log today's habits →
              </a>

              <p style="margin:32px 0 0 0;font-size:13px;color:#52525b;">
                Small actions, compounded daily. That's the whole game.
              </p>

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

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Allow GET (Vercel cron) or POST (manual trigger)
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();

  // Verify cron secret — Vercel sends it as a header, manual triggers send it as a query param
  const authHeader = req.headers.authorization || '';
  const querySecret = req.query?.secret || '';
  if (
    authHeader !== `Bearer ${SECRET}` &&
    querySecret !== SECRET
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // ── Step 1: Get all users who have habits ──────────────────────────────
    // Distinct user_ids from habits table
    const habits = await sbFetch('habits', '?select=user_id&limit=10000');
    const userIdsWithHabits = [...new Set(habits.map(h => h.user_id))];

    if (userIdsWithHabits.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No users with habits' });
    }

    // ── Step 2: Get users who HAVE logged all habits today ─────────────────
    // today in ISO format, e.g. "2026-06-22"
    const today = new Date().toISOString().split('T')[0];

    const todayLogs = await sbFetch(
      'habit_logs',
      `?select=user_id&logged_date=eq.${today}&limit=10000`
    );
    const usersWhoLoggedToday = new Set(todayLogs.map(l => l.user_id));

    // ── Step 3: Users who have habits but haven't logged today ─────────────
    const needsReminder = userIdsWithHabits.filter(uid => !usersWhoLoggedToday.has(uid));

    if (needsReminder.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Everyone has logged today' });
    }

    // ── Step 4: Get email addresses for those users ────────────────────────
    // auth.users is not accessible via REST; use our profiles or fetch via admin auth API
    // We'll use the Supabase admin auth API to get user emails
    const emails = [];
    const CHUNK  = 50; // process in chunks to avoid huge URLs

    for (let i = 0; i < needsReminder.length; i += CHUNK) {
      const chunk = needsReminder.slice(i, i + CHUNK);
      // Use admin auth endpoint to list users — filter by id
      // Supabase admin: GET /auth/v1/admin/users returns paginated list
      // Simpler: fetch each user. For small user bases this is fine.
      // For scale, add an `email` column to `profiles` and query that instead.
      const fetches = chunk.map(uid =>
        fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, {
          headers: {
            apikey:        SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
          },
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      );
      const results = await Promise.all(fetches);
      for (const user of results) {
        if (user?.email) emails.push(user.email);
      }
    }

    // ── Step 5: Send emails ────────────────────────────────────────────────
    let sent = 0;
    for (const email of emails) {
      const { error } = await resend.emails.send({
        from:    'Compound <hello@dailycompound.app>',
        to:      email,
        subject: '🔥 Don\'t break your streak — log today\'s habits',
        html:    streakReminderHtml(email),
      });
      if (!error) sent++;
    }

    return res.status(200).json({ sent, total: emails.length });

  } catch (err) {
    console.error('Streak reminder error:', err);
    return res.status(500).json({ error: err.message });
  }
};
