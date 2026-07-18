const HARDCODED_CODES = ['COMPOUND19', 'APEX'];
const DEV_CODES = [
  ...HARDCODED_CODES,
  ...(process.env.DEV_CODES || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean),
];
const DEFAULT_MODEL  = 'claude-haiku-4-5';
const ALLOWED_MODELS = new Set(['claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);

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

    // Founder always has Pro access
    if (user.email === 'vsf4046@gmail.com') authorised = true;

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
    const selectedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    // Wrap system prompt as array with cache_control so the static prompt +
    // tool definitions are cached across turns (90% cheaper after first call)
    const systemText = system || 'You are a helpful productivity coach.';
    const systemBlock = [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }];

    const reqBody = {
      model:      selectedModel,
      max_tokens: 2048,
      system:     systemBlock,
      messages,
    };

    if (tools && tools.length) {
      // Add cache_control to the last tool — caches all tools in one breakpoint
      const cachedTools = tools.map((t, i) =>
        i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t
      );
      reqBody.tools = cachedTools;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':        apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':   'prompt-caching-2024-07-31',
        'content-type':     'application/json',
      },
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
