const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_EMAIL = 'vsf4046@gmail.com';
const TG          = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Escape all MarkdownV2 special characters
function esc(text) {
  return String(text).replace(/[\\`_*[\]()~>#+\-=|{}.!]/g, '\\$&');
}

async function tg(method, body) {
  const r = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error(`TG ${method} failed ${r.status}:`, await r.text());
  return r;
}

async function send(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'MarkdownV2', disable_web_page_preview: true });
}

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
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${res.status}: ${await res.text()}`);
}

async function sbDelete(path, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'DELETE',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${res.status}: ${await res.text()}`);
}

async function sbPatch(path, params = '', body = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
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

async function getTodos(uid) {
  return sbFetch('todos', `?user_id=eq.${uid}&order=created_at.asc&limit=50`);
}

async function sendTaskList(chatId, todos, prefix = '') {
  if (!todos.length) {
    const msg = prefix ? `${esc(prefix)}\n\n✅ No tasks left\\. You\'re clear\\.` : '✅ No tasks right now\\. You\'re clear\\.';
    await send(chatId, msg);
    return;
  }
  const list   = todos.map((t, i) => `${i + 1}\\. ${esc(t.text)}`).join('\n');
  const header = prefix ? `${esc(prefix)}\n\n` : '';
  const footer  = `\n\n_Reply with a number to complete • "add \\[task\\]" to add • "done all" to clear_`;
  await send(chatId, `${header}*Your tasks:*\n\n${list}${footer}`);
}

async function processUpdate(update) {
  const msg = update?.message;
  if (!msg) return;

  const chatId = String(msg.chat.id);
  const text   = (msg.text || '').trim();
  const lower  = text.toLowerCase();

  // /start — always works, reveals chat ID
  if (lower === '/start' || lower === '/hello') {
    await send(chatId,
      `👋 *Compound OS bot is live\\.*\n\n*Your chat ID:* \`${esc(chatId)}\`\n\nAdd as \`TELEGRAM_CHAT_ID\` in Vercel env vars, then redeploy\\.\n\n` +
      `*Commands:*\n/tasks — your todo list\n/habits — today\'s habits\n/add \\[task\\] — add a todo\n/focus \\[text\\] — update your focus\n/context — what you\'re building\n/debug — check bot status`
    );
    return;
  }

  // Auth: only owner after /start
  const ownerChatId = process.env.TELEGRAM_CHAT_ID;
  if (ownerChatId && chatId !== String(ownerChatId)) {
    await send(chatId, '🔒 Private bot\\.');
    return;
  }

  const uid = await getOwnerUserId();
  if (!uid) { await send(chatId, 'Couldn\'t connect to Compound\\.'); return; }

  // ── /debug ───────────────────────────────────────────────────────────────
  if (lower === '/debug') {
    const hasToken  = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
    const hasSB     = !!(SB_URL && SB_KEY);
    let dbOk = false;
    try { await sbFetch('profiles', `?id=eq.${uid}&limit=1`); dbOk = true; } catch (_) {}
    const lines = [
      `*Compound Bot Debug*`,
      ``,
      `${hasToken  ? '✅' : '❌'} TELEGRAM_BOT_TOKEN`,
      `${hasChatId ? '✅' : '❌'} TELEGRAM_CHAT_ID ${hasChatId ? `\\(${esc(process.env.TELEGRAM_CHAT_ID)}\\)` : '\\(not set\\)'}`,
      `${hasSB     ? '✅' : '❌'} Supabase credentials`,
      `${dbOk      ? '✅' : '❌'} Database connection`,
      `${uid       ? '✅' : '❌'} Owner found ${uid ? `\\(${esc(uid.slice(0, 8))}…\\)` : ''}`,
      ``,
      `Chat ID: \`${esc(chatId)}\``,
    ].join('\n');
    await send(chatId, lines);
    return;
  }

  // ── /tasks or /list ──────────────────────────────────────────────────────
  if (lower === '/tasks' || lower === '/list') {
    const todos = await getTodos(uid);
    await sendTaskList(chatId, todos);
    return;
  }

  // ── /habits ──────────────────────────────────────────────────────────────
  if (lower === '/habits') {
    const today  = new Date().toISOString().split('T')[0];
    const habits = await sbFetch('habits', `?user_id=eq.${uid}&select=id,text,habit_logs(logged_date)&limit=20`);
    if (!habits.length) { await send(chatId, 'No habits yet\\. Open Compound to add some\\.'); return; }
    const lines = habits.map(h => {
      const done = (h.habit_logs || []).some(l => l.logged_date === today);
      return `${done ? '✅' : '⬜'} ${esc(h.text)}`;
    });
    await send(chatId, `*Today\'s habits:*\n\n${lines.join('\n')}`);
    return;
  }

  // ── /context or /brain ───────────────────────────────────────────────────
  if (lower === '/context' || lower === '/brain') {
    const rows = await sbFetch('profiles', `?id=eq.${uid}&select=active_context&limit=1`);
    const ctx  = rows[0]?.active_context;
    if (!ctx) {
      await send(chatId, 'No focus set yet\\.\n\nUse `/focus \\[what you\'re building\\]` to set it\\.');
    } else {
      await send(chatId, `*What you\'re building:*\n\n${esc(ctx)}`);
    }
    return;
  }

  // ── /focus [text] ────────────────────────────────────────────────────────
  const focusMatch = text.match(/^\/focus\s+(.+)/i);
  if (focusMatch) {
    const newCtx = focusMatch[1].trim();
    await sbPatch('profiles', `?id=eq.${uid}`, { active_context: newCtx });
    await send(chatId, `✅ Focus updated\\. Compound and Claude now know:\n\n_${esc(newCtx)}_`);
    return;
  }

  // ── /add [text] or "add [text]" ─────────────────────────────────────────
  const addMatch = text.match(/^(?:\/add|add)\s+(.+)/i);
  if (addMatch) {
    const taskText = addMatch[1].trim();
    await sbInsert('todos', { user_id: uid, text: taskText });
    const todos = await getTodos(uid);
    await sendTaskList(chatId, todos, `✅ Added: "${taskText}"`);
    return;
  }

  // ── "done all" / "clear all" ─────────────────────────────────────────────
  if (/^(?:done all|all done|clear all|finish all)$/i.test(lower)) {
    const todos = await getTodos(uid);
    if (!todos.length) { await send(chatId, '✅ Nothing to clear\\. Already empty\\.'); return; }
    await Promise.all(todos.map(t => sbDelete('todos', `?id=eq.${t.id}&user_id=eq.${uid}`)));
    await send(chatId, `✅ Cleared all ${todos.length} tasks\\. Fresh slate\\.`);
    return;
  }

  // ── "done 1" / "1" / "2, 3" / "remove 2" — complete by number ───────────
  const numMatch = text.match(/^(?:\/done\s+|done\s+|remove\s+|del\s+)?(\d[\d,\s]*)$/i);
  if (numMatch) {
    const nums     = numMatch[1].match(/\d+/g).map(n => parseInt(n) - 1);
    const todos    = await getTodos(uid);
    const toDelete = [...new Set(nums)].filter(i => i >= 0 && i < todos.length).map(i => todos[i]);
    if (!toDelete.length) {
      await send(chatId, `No task at that number\\.\n\nSend /tasks to see your list\\.`);
      return;
    }
    await Promise.all(toDelete.map(t => sbDelete('todos', `?id=eq.${t.id}&user_id=eq.${uid}`)));
    const done      = toDelete.map(t => `✅ ${esc(t.text)}`).join('\n');
    const remaining = todos.length - toDelete.length;
    const tail      = remaining > 0 ? `${remaining} task${remaining !== 1 ? 's' : ''} left\\.` : 'All done\\.';
    await send(chatId, `${done}\n\n${tail}`);
    return;
  }

  // ── /done [text] — fuzzy match (legacy / last resort) ────────────────────
  const doneCmd = text.match(/^\/done\s+(.+)/i);
  if (doneCmd) {
    const query    = doneCmd[1].toLowerCase().trim();
    const allTodos = await getTodos(uid);
    const matches  = allTodos.filter(t =>
      t.text.toLowerCase().includes(query) || query.includes(t.text.toLowerCase())
    );
    if (!matches.length) {
      const list = allTodos.slice(0, 10).map((t, i) => `${i + 1}\\. ${esc(t.text)}`).join('\n');
      await send(chatId, `Couldn\'t find that task\\.\n\n*Current tasks:*\n${list || 'None\\.'}\n\nTip: reply with a number instead\\.`);
      return;
    }
    if (matches.length > 1) {
      const list = matches.map((t, i) => `${i + 1}\\. ${esc(t.text)}`).join('\n');
      await send(chatId, `Found ${matches.length} matches — be more specific:\n\n${list}`);
      return;
    }
    await sbDelete('todos', `?id=eq.${matches[0].id}&user_id=eq.${uid}`);
    await send(chatId, `✅ Done: *${esc(matches[0].text)}*\n\nCompound updated\\.`);
    return;
  }

  // ── Fallback: help ────────────────────────────────────────────────────────
  await send(chatId,
    `Not sure what you mean\\. Here\'s what I understand:\n\n` +
    `/tasks — see your list\n` +
    `*1* or *2, 3* — complete by number\n` +
    `*add \\[task\\]* — add a todo\n` +
    `*done all* — clear everything\n` +
    `/habits — today\'s habits\n` +
    `/focus \\[text\\] — update what you\'re building\n` +
    `/debug — check bot status`
  );
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
