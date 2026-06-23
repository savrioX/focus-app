const { Resend } = require('resend');

const resend  = new Resend(process.env.RESEND_API_KEY);
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'https://dailycompound.app';
const SECRET  = process.env.CRON_SECRET;
const OWNER   = 'savrio.xsi@gmail.com';

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: {
      apikey:        SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return { data: await res.json(), count: parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10) };
}

async function getUserCount() {
  // Total users via admin API
  const res = await fetch(`${SB_URL}/auth/v1/admin/users?per_page=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.total || null;
}

async function getNewUsersToday() {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`${SB_URL}/auth/v1/admin/users?per_page=100&page=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const users = data.users || [];
  return users.filter(u => u.created_at?.startsWith(today)).length;
}

async function getVercelViews() {
  // Vercel Analytics API — requires VERCEL_TOKEN + VERCEL_PROJECT_ID env vars
  const token     = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const from = yesterday.toISOString().split('T')[0];
  const to   = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(
      `https://vercel.com/api/web-analytics/timeseries?projectId=${projectId}&from=${from}&to=${to}&environment=production`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Sum all page view events across the timeseries
    const series = data?.data || [];
    return series.reduce((sum, pt) => sum + (pt.pageViews || pt.views || 0), 0);
  } catch (_) {
    return null;
  }
}

function digestHtml({ totalUsers, newToday, views, date }) {
  const viewsLine = views !== null
    ? `<tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Website views (24h)</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${views.toLocaleString()}</td></tr>`
    : `<tr><td style="padding:6px 0;color:#71717a;font-size:14px;">Website views</td><td style="padding:6px 0;font-size:14px;color:#a1a1aa;text-align:right;">Not configured*</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compound Daily — ${date}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;padding:0 24px;">

          <tr>
            <td style="padding:0 0 28px 0;display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:15px;font-weight:700;color:#7c3aed;letter-spacing:-0.3px;">Compound</span>
              <span style="font-size:12px;color:#a1a1aa;float:right;">${date}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 0 24px 0;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.03em;">Daily update</p>
            </td>
          </tr>

          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:12px;padding:20px 24px;">
                <tr>
                  <td style="padding:6px 0;color:#71717a;font-size:14px;">Total users</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${totalUsers !== null ? totalUsers.toLocaleString() : '—'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#71717a;font-size:14px;">New signups today</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:${newToday > 0 ? '#16a34a' : '#18181b'};text-align:right;">${newToday !== null ? `+${newToday}` : '—'}</td>
                </tr>
                ${viewsLine}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0 0;">
              <a href="${APP_URL}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;">Open dashboard →</a>
            </td>
          </tr>

          ${views === null ? `
          <tr>
            <td style="padding:24px 0 0 0;border-top:1px solid #f0f0f0;margin-top:24px;">
              <p style="margin:12px 0 0 0;font-size:11px;color:#d4d4d8;line-height:1.6;">
                * To enable website view counts, add <strong>VERCEL_TOKEN</strong> and <strong>VERCEL_PROJECT_ID</strong> to your Vercel environment variables.
              </p>
            </td>
          </tr>` : ''}

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
    const [totalUsers, newToday, views] = await Promise.all([
      getUserCount(),
      getNewUsersToday(),
      getVercelViews(),
    ]);

    const date = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const { error } = await resend.emails.send({
      from:    'Compound <savrio@dailycompound.app>',
      to:      OWNER,
      subject: `Compound daily — ${totalUsers !== null ? totalUsers + ' users' : new Date().toLocaleDateString()}`,
      html:    digestHtml({ totalUsers, newToday, views, date }),
    });

    if (error) return res.status(400).json({ error });
    return res.status(200).json({ ok: true, totalUsers, newToday, views });

  } catch (err) {
    console.error('Daily digest error:', err);
    return res.status(500).json({ error: err.message });
  }
};
