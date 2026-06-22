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
  <title>Welcome to Compound</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / header -->
          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#7c3aed;letter-spacing:-0.5px;">Compound</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#18181b;border-radius:12px;padding:40px 36px;">

              <p style="margin:0 0 8px 0;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Welcome aboard</p>
              <h1 style="margin:0 0 20px 0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">
                Hey ${name}, let's build something great.
              </h1>
              <p style="margin:0 0 32px 0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                You just joined Compound — the habit tracker built for student entrepreneurs who are serious about compounding progress every single day.
              </p>

              <!-- Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;padding:16px 20px;">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:1px;">
                          <span style="font-size:18px;">01</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Add your first habit today</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">Start with one habit you want to do every day. Streaks start with a single log.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;padding:16px 20px;">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:1px;">
                          <span style="font-size:18px;">02</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Set a goal with AI action steps</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">Type your goal — Apex Advisor breaks it into concrete subtasks automatically.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border-radius:8px;padding:16px 20px;">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:1px;">
                          <span style="font-size:18px;">03</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Check in every day — even for 30 seconds</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#71717a;line-height:1.5;">Log your habits, tick your todos, check your streak. Consistency is the whole game.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
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

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                You're receiving this because you signed up for Compound.<br/>
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, firstName } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  try {
    const { data, error } = await resend.emails.send({
      from: 'Compound <hello@dailycompound.app>',
      to: email,
      subject: 'Welcome to Compound — let\'s build the habit',
      html: welcomeHtml(firstName),
    });

    if (error) return res.status(400).json({ error });
    return res.status(200).json({ id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
