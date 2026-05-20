const DEV_CODES = ['COMPOUNDPRO', 'APEX2025', 'DAILYGRIND'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey: userKey, messages, system, model, devCode } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });

  let apiKey = userKey; // BYOK: user supplied their own key

  if (!apiKey) {
    // Path 1: valid dev/promo code
    if (devCode && DEV_CODES.includes(devCode.toUpperCase())) {
      apiKey = process.env.ANTHROPIC_API_KEY;
    } else {
      // Path 2: paid pro — verify Supabase JWT + is_pro
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
      if (!profiles[0]?.is_pro) return res.status(403).json({ error: 'pro_required' });

      apiKey = process.env.ANTHROPIC_API_KEY;
    }

    if (!apiKey) return res.status(500).json({ error: 'Server API key not configured — add ANTHROPIC_API_KEY to Vercel env vars.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system:     system || 'You are a helpful productivity coach.',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errType = data.error?.type || '';
      const errMsg  = data.error?.message || JSON.stringify(data);
      let friendly = errMsg;
      if (errType === 'authentication_error' || response.status === 401)
        friendly = 'Invalid API key — check your Vercel ANTHROPIC_API_KEY env var.';
      else if (errType === 'permission_error' || response.status === 403)
        friendly = 'API key does not have access to this model.';
      else if (errMsg.includes('model'))
        friendly = `Model not available (${errMsg}).`;
      else if (response.status === 429)
        friendly = 'Rate limit hit — wait a moment and try again.';
      return res.status(response.status).json({ error: friendly, raw: errMsg });
    }

    return res.status(200).json({ content: data.content[0].text });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
