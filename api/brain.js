const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SECRET      = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.COMPOUND_ACCOUNT_EMAIL;

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbInsert(path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbDelete(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${res.status}: ${await res.text()}`);
}

let _ownerUid = null;
async function getOwnerUserId() {
  if (_ownerUid) return _ownerUid;
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${SB_URL}/auth/v1/admin/users?per_page=100&page=${page}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const data = await res.json();
    const found = (data.users || []).find(u => u.email === OWNER_EMAIL);
    if (found) { _ownerUid = found.id; return found.id; }
    if ((data.users || []).length < 100) break;
  }
  return null;
}

async function getUserFromJWT(token) {
  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let uid = null;
  const authHeader = req.headers.authorization || '';
  const secret     = req.body?.secret || req.query?.secret;

  if (secret === SECRET) {
    uid = req.body?.user_id || await getOwnerUserId();
  } else if (authHeader.startsWith('Bearer ')) {
    uid = await getUserFromJWT(authHeader.slice(7));
  }

  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
      const source = req.query.source;
      const type   = req.query.type;
      let params   = `?user_id=eq.${uid}&order=created_at.desc&limit=${limit}`;
      if (source) params += `&source=eq.${source}`;
      if (type)   params += `&type=eq.${type}`;
      const rows = await sbFetch('brain', params);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { source = 'owner', type = 'note', content, pinned = false } = req.body || {};
      if (!content?.trim()) return res.status(400).json({ error: 'content required' });
      const rows = await sbInsert('brain', { user_id: uid, source, type, content: content.trim(), pinned });
      return res.status(201).json(rows[0] || { ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await sbDelete('brain', `?id=eq.${id}&user_id=eq.${uid}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('Brain API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
