const DEV_CODES = ['COMPOUNDPRO', 'APEX2025', 'DAILYGRIND'];

// Try models in order until one works — cached for the lifetime of this Lambda instance
const MODEL_FALLBACKS = [
  'claude-3-5-haiku-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
];
let workingModel = null; // persists across warm invocations

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system, model, devCode, tools } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });

  let authorised = false;

  if (devCode && DEV_CODES.includes(devCode.toUpperCase())) {
    authorised = true;
  } else {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(403).json({ error: 'pro_required' });

    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    if (!userRes?.ok) return res.status(401).json({ error: 'Invalid session — please sign in again.' });
    const user = await userRes.json();

    const profileRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_pro`,
      {
        headers: {
          apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    ).catch(() => null);

    const profiles = profileRes?.ok ? await profileRes.json() : [];
    if (profiles[0]?.is_pro) authorised = true;
  }

  if (!authorised) return res.status(403).json({ error: 'pro_required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server API key not configured.' });

  const modelsToTry = model ? [model] : (workingModel ? [workingModel] : MODEL_FALLBACKS);

  try {
    for (const m of modelsToTry) {
      const body = {
        model:      m,
        max_tokens: 1024,
        system:     system || 'You are a helpful productivity coach.',
        messages,
      };
      if (tools && tools.length) body.tools = tools;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // If model not found, try next one
      if (!response.ok && data.error?.type === 'not_found_error') continue;

      if (response.ok && !model) workingModel = m; // cache for future warm invocations

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
    }

    return res.status(500).json({ error: 'No available models found on this API key. Check console.anthropic.com for your account\'s model access.' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
