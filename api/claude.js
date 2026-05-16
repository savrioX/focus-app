export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, messages, system } = req.body;

  if (!apiKey)                              return res.status(400).json({ error: 'API key required' });
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system:     system || 'You are a helpful productivity coach.',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errType = data.error?.type || '';
      const errMsg  = data.error?.message || JSON.stringify(data);

      // Give the frontend a clear, specific message
      let friendly = errMsg;
      if (errType === 'authentication_error' || response.status === 401) {
        friendly = 'Invalid API key — copy it from console.anthropic.com/settings/keys';
      } else if (errType === 'permission_error' || response.status === 403) {
        friendly = 'Your account does not have access to this model. Make sure you have added credits at console.anthropic.com and your account is active.';
      } else if (errMsg.includes('model')) {
        friendly = `Model not available on your account (${errMsg}). Go to console.anthropic.com and check your tier / usage limits.`;
      } else if (response.status === 429) {
        friendly = 'Rate limit hit — wait a moment and try again.';
      }

      return res.status(response.status).json({ error: friendly, raw: errMsg });
    }

    return res.status(200).json({ content: data.content[0].text });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
