const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://dailycompound.app';

function welcomeHtml(firstName) {
  const name = firstName || 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Here's your first move</title>
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
                Hey ${name},
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#18181b;line-height:1.7;">
                You just joined Compound — the system I built because I needed it. I'm 19, building a startup in public, and this is how I actually follow through on goals and habits every day.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#18181b;line-height:1.7;">
                Your first move: add one habit. Just one. The compound effect starts when you show up every single day — not when you set up the perfect system.
              </p>
              <p style="margin:0 0 32px 0;font-size:15px;color:#18181b;line-height:1.7;">
                <a href="${APP_URL}" style="color:#7c3aed;font-weight:600;text-decoration:none;">Open Compound and add your first habit →</a>
              </p>
              <p style="margin:0 0 6px 0;font-size:15px;color:#18181b;line-height:1.7;">
                — Compound<br/>
                <span style="color:#71717a;font-size:13px;">Founder, dailycompound.app</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 0 0 0;border-top:1px solid #f0f0f0;margin-top:32px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                P.S. I'm documenting the whole build publicly — follow along at
                <a href="https://www.instagram.com/thestartupjournal1/" style="color:#7c3aed;text-decoration:none;">@thestartupjournal1</a>
              </p>
              <p style="margin:12px 0 0 0;font-size:11px;color:#d4d4d8;">
                You're receiving this because you signed up at
                <a href="${APP_URL}" style="color:#d4d4d8;text-decoration:none;">dailycompound.app</a>
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
  if (req.method !== 'POST') return res.status(405).end();

  const { email, firstName } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  try {
    const { data, error } = await resend.emails.send({
      from: 'Compound <savrio@dailycompound.app>',
      to: email,
      subject: "Here's your first move",
      html: welcomeHtml(firstName),
    });

    if (error) return res.status(400).json({ error });
    return res.status(200).json({ id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
