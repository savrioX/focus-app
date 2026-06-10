const DEV_CODES     = ['COMPOUNDPRO', 'APEX2025', 'DAILYGRIND'];
const DEFAULT_MODEL = 'claude-haiku-4-5';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, model, devCode, tools } = req.body || {};
  if (!messages || !Array.isArray(messages))
    return res.status(400).json({ error: 'Messages required' });

  // Auth
  let authorised = false;
  if (devCode && DEV_CODES.includes(String(devCode).toUpperCase())) {
    authorised = true;
  } else {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(403).json({ error: 'pro_required' });

    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (!userRes?.ok)
      return res.status(401).json({ error: 'Invalid session — please sign in again.' });
    const user = await userRes.json();

    const profileRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_pro`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    ).catch(() => null);
    const profiles = profileRes?.ok ? await profileRes.json() : [];
    if (profiles[0]?.is_pro) authorised = true;
  }
  if (!authorised) return res.status(403).json({ error: 'pro_required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured.' });

  try {
    const selectedModel = model || DEFAULT_MODEL;

    const reqBody = {
      model:      selectedModel,
      max_tokens: 512,
      system:     system || 'You are a helpful productivity coach.',
      messages,
    };
    if (tools && tools.length) reqBody.tools = tools;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body:    JSON.stringify(reqBody),
    });
    const data = await response.json();

    if (!response.ok) {
      const errType = data.error?.type || '';
      const errMsg  = data.error?.message || JSON.stringify(data);
      return res.status(response.status).json({ error: `[${response.status}] ${errType}: ${errMsg}`, raw: errMsg });
    }

    return res.status(200).json({
      content:     data.content,
      stop_reason: data.stop_reason,
      text:        data.content.find(b => b.type === 'text')?.text || '',
    });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
