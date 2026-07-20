const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_EMAIL = 'vsf4046@gmail.com';
const TG          = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tg(method, body) {
  await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function send(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true });
}

async function sbFetch(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

async function sbDelete(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${res.status}`);
}

async function sbPatch(path, params = '', body = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}`);
}

async function getOwnerContext(uid) {
  const rows = await sbFetch('profiles', `?id=eq.${uid}&select=active_context&limit=1`);
  return rows[0]?.active_context || null;
}

// Find Savrio's Supabase UUID by email (searches up to 500 users)
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

async function processUpdate(update) {
  const msg = update?.message;
  if (!msg) return;

  const chatId  = String(msg.chat.id);
  const text    = (msg.text || '').trim();

  // /start always works — reveals chat ID so it can be added to Vercel env vars
  if (text === '/start' || text === '/hello') {
    await send(chatId,
      `👋 Compound OS bot is live\\.\n\n*Your chat ID:* \`${chatId}\`\n\nAdd this to Vercel → Settings → Environment Variables as \`TELEGRAM_CHAT_ID\`, then redeploy\\.\n\n*Commands:*\n/list — current todos\n/habits — today\'s habits\n/done \\[task\\] — complete a todo\n/context — what you\'re building\n/focus \\[text\\] — update your focus \\(syncs to Compound\\)`
    );
    return;
  }

  // All other commands: only respond to the owner
  const ownerChatId = process.env.TELEGRAM_CHAT_ID;
  if (ownerChatId && chatId !== String(ownerChatId)) {
    await send(chatId, '🔒 Private bot.');
    return;
  }

  const uid = await getOwnerUserId();
  if (!uid) { await send(chatId, 'Couldn\'t connect to Compound. Try again.'); return; }

  // /list — show current todos
  if (text === '/list') {
    const rows = await sbFetch('todos', `?user_id=eq.${uid}&order=created_at.asc&limit=20`);
    if (!rows.length) { await send(chatId, '✅ No todos right now\\. You\'re clear\\.'); return; }
    const list = rows.map((t, i) => `${i + 1}\\. ${t.text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}`).join('\n');
    await send(chatId, `*Your todos:*\n\n${list}\n\nSend \`/done [task]\` to complete one\\.`);
    return;
  }

  // /habits — show today's habits + done status
  if (text === '/habits') {
    const today  = new Date().toISOString().split('T')[0];
    const habits = await sbFetch('habits', `?user_id=eq.${uid}&select=id,text,habit_logs(logged_date)&limit=20`);
    if (!habits.length) { await send(chatId, 'No habits yet\\. Open Compound to add some\\.'); return; }
    const lines = habits.map(h => {
      const done = (h.habit_logs || []).some(l => l.logged_date === today);
      const t = h.text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      return `${done ? '✅' : '⬜'} ${t}`;
    });
    await send(chatId, `*Today\'s habits:*\n\n${lines.join('\n')}`);
    return;
  }

  // /context or /brain — show active context
  if (text === '/context' || text === '/brain') {
    const ctx = await getOwnerContext(uid);
    if (!ctx) {
      await send(chatId, 'No focus set yet\\.\n\nUse `/focus [what you\'re building]` to set it\\.');
    } else {
      const escaped = ctx.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      await send(chatId, `*What you\'re building:*\n\n${escaped}`);
    }
    return;
  }

  // /focus [text] — update active context (syncs to Compound app)
  if (/^\/focus\s+/i.test(text)) {
    const newCtx = text.replace(/^\/focus\s+/i, '').trim();
    if (!newCtx) { await send(chatId, 'What are you building? Send:\n`/focus [description]`'); return; }
    await sbPatch('profiles', `?id=eq.${uid}`, { active_context: newCtx });
    const escaped = newCtx.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
    await send(chatId, `✅ Focus updated\\. Compound and Claude now know:\n\n_${escaped}_`);
    return;
  }

  // /done [text] or free-form → fuzzy-match and complete a todo
  const query = text.replace(/^\/done\s*/i, '').toLowerCase().trim();
  if (!query) {
    await send(chatId, 'What task did you complete? Send:\n`/done [task name]`');
    return;
  }

  const allTodos = await sbFetch('todos', `?user_id=eq.${uid}&order=created_at.asc&limit=100`);
  const matches  = allTodos.filter(t =>
    t.text.toLowerCase().includes(query) || query.includes(t.text.toLowerCase())
  );

  if (!matches.length) {
    const list = allTodos.slice(0, 10).map((t, i) => `${i + 1}. ${t.text}`).join('\n');
    await send(chatId, `Couldn\'t find that task\\.\n\n*Current todos:*\n${list || 'None\\.'}\n\nTry again with more of the task name\\.`);
    return;
  }

  if (matches.length > 1) {
    const list = matches.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
    await send(chatId, `Found ${matches.length} matches — be more specific:\n\n${list}`);
    return;
  }

  // Exactly one match — delete it (complete it)
  await sbDelete('todos', `?id=eq.${matches[0].id}&user_id=eq.${uid}`);
  const escaped = matches[0].text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  await send(chatId, `✅ Done: *${escaped}*\n\nCompound updated\\.`);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();
  try {
    await processUpdate(req.body);
  } catch (e) {
    console.error('Telegram handler error:', e);
  }
  res.status(200).json({ ok: true });
};
