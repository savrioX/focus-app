export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Error fetching models' });
    return res.status(200).json({ models: data.data || [] });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
