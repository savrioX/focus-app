export const runtime = 'edge';

const DEV_CODES     = ['COMPOUNDPRO', 'APEX2025', 'DAILYGRIND'];
const DEFAULT_MODEL = 'claude-haiku-4-5';

export default async function handler(req) {
  if (req.method !== 'POST')
    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { messages, system, model, devCode, tools } = body;
  if (!messages || !Array.isArray(messages))
    return Response.json({ error: 'Messages required' }, { status: 400 });

  // Auth
  let authorised = false;
  if (devCode && DEV_CODES.includes(devCode.toUpperCase())) {
    authorised = true;
  } else {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (!token) return Response.json({ error: 'pro_required' }, { status: 403 });

    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (!userRes?.ok)
      return Response.json({ error: 'Invalid session — please sign in again.' }, { status: 401 });
    const user = await userRes.json();

    const profileRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_pro`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
    ).catch(() => null);
    const profiles = profileRes?.ok ? await profileRes.json() : [];
    if (profiles[0]?.is_pro) authorised = true;
  }
  if (!authorised) return Response.json({ error: 'pro_required' }, { status: 403 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'Server API key not configured.' }, { status: 500 });

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
      return Response.json({ error: `[${response.status}] ${errType}: ${errMsg}`, raw: errMsg }, { status: response.status });
    }

    return Response.json({
      content:     data.content,
      stop_reason: data.stop_reason,
      text:        data.content.find(b => b.type === 'text')?.text || '',
    });

  } catch (err) {
    return Response.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
