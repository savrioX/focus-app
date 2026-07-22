const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_EMAIL = process.env.COMPOUND_ACCOUNT_EMAIL || 'vsf4046@gmail.com';
const APP_URL     = process.env.APP_URL || 'https://dailycompound.app';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
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

async function sendPlain(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

async function askApex(userMessage, uid) {
  if (!ANTHROPIC_KEY) return null;
  const [todos, goals, habits, profiles] = await Promise.all([
    sbFetch('todos', `?user_id=eq.${uid}&order=created_at.asc&limit=20`),
    sbFetch('goals', `?user_id=eq.${uid}&select=id,text,goal_subtasks(text,done)&limit=10`),
    sbFetch('habits', `?user_id=eq.${uid}&limit=10`),
    sbFetch('profiles', `?id=eq.${uid}&select=active_context&limit=1`),
  ]);
  const system = `You are Apex, the AI Chief of Staff for Savrio — a 19-year-old solo founder building Compound (dailycompound.app) at $10/month.

Current todos: ${todos.map(t => t.text).join(', ') || 'none'}
Goals: ${goals.map(g => g.text).join(', ') || 'none'}
Habits: ${habits.map(h => h.text).join(', ') || 'none'}
Focus: ${profiles[0]?.active_context || 'not set'}

Be direct and brief. Max 3 sentences unless depth is genuinely needed. Plain text only — no markdown, no asterisks, no special characters.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system, messages: [{ role: 'user', content: userMessage }] }),
    });
    const data = await res.json();
    return data.content?.find(b => b.type === 'text')?.text || null;
  } catch { return null; }
}

function formatPlanForTelegram(plan) {
  const goalIcons = { on_track: '✅', stuck: '⚠️', no_steps: '❌' };
  const parts = [`🧠 *Apex Plan*`];
  if (plan.weekly_focus) parts.push(`\n📍 *Focus this week:*\n${esc(plan.weekly_focus)}`);
  if (plan.analysis) parts.push(`\n*Assessment:*\n${esc(plan.analysis)}`);
  if (plan.goal_assessment?.length) {
    const lines = plan.goal_assessment.map(g =>
      `${goalIcons[g.status] || '•'} ${esc(g.goal)}\n   → ${esc(g.next_move || '')}`
    );
    parts.push(`\n🎯 *Goals:*\n${lines.join('\n')}`);
  }
  const drops = (plan.habits_drop || []).map(h => esc(h)).join(', ');
  const adds  = (plan.habits_add  || []).map(h => esc(h)).join(', ');
  if (drops) parts.push(`\n🗑 *Drop:* ${drops}`);
  if (adds)  parts.push(`➕ *Add:* ${adds}`);
  if (plan.self_improvement?.length) {
    const actions = plan.self_improvement.map((a, i) => `${i + 1}\\. ${esc(a)}`).join('\n');
    parts.push(`\n🔧 *Self\\-improvement:*\n${actions}`);
  }
  parts.push(`\n[View full plan on Apex →](${esc(APP_URL)}/apex)`);
  return parts.join('\n');
}

async function sendTaskList(chatId, todos, prefix = '') {
  if (!todos.length) {
    const msg = prefix ? `${esc(prefix)}\n\n✅ No tasks left\\. You\'re clear\\.` : '✅ No tasks right now\\. You\'re clear\\.';
    await send(chatId, msg);
    return;
  }
  const list   = todos.map((t, i) => `${i + 1}\\. ${esc(t.text)}`).join('\n');
  const header = prefix ? `${esc(prefix)}\n\n` : '';
  const footer  = `\n\n_Reply with a number to complete • /newtask \\[task\\] to add • "done all" to clear_`;
  await send(chatId, `${header}*Your tasks:*\n\n${list}${footer}`);
}

async function processUpdate(update) {
  const msg = update?.message;
  if (!msg) return;

  const chatId = String(msg.chat.id);
  const text   = (msg.text || '').trim();
  const lower  = text.toLowerCase();

  // /start — always works. Use plain text (no parse_mode) so MarkdownV2 can never break it.
  // Also strip @botname suffix Telegram appends in group contexts.
  const baseCmd = lower.split('@')[0];
  if (baseCmd === '/start' || baseCmd === '/hello') {
    await tg('sendMessage', {
      chat_id: chatId,
      text: `Compound OS bot is live.\n\nYour chat ID: ${chatId}\n\nAdd TELEGRAM_CHAT_ID = ${chatId} in Vercel env vars, then redeploy.\n\nCommands:\n/tasks — todo list (reply with a number to complete)\n/habits — today's habits\n/newtask [task] — add a todo\n/brain — your second brain\n/note [text] — add brain note\n/focus [text] — update what you're building\n/context — see current focus\n/debug — check bot status`,
    });
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

  // ── /newtask [text] or "add [text]" ──────────────────────────────────────
  const addMatch = text.match(/^(?:\/newtask|add)\s+(.+)/i);
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

  // ── /note [text] or "note [text]" — add to second brain ─────────────────
  const noteMatch = text.match(/^(?:\/note|note)\s+(.+)/i);
  if (noteMatch) {
    const content = noteMatch[1].trim();
    await sbInsert('brain', { user_id: uid, source: 'telegram', type: 'note', content });
    await send(chatId, `🧠 Added to brain:\n\n_${esc(content)}_`);
    return;
  }

  // ── /brain or /thoughts — show recent second brain entries ───────────────
  if (lower === '/brain' || lower === '/thoughts') {
    const rows = await sbFetch('brain', `?user_id=eq.${uid}&order=created_at.desc&limit=7`);
    if (!rows.length) {
      await send(chatId, `🧠 Your second brain is empty\\.\n\nAdd a note: \`/note \\[text\\]\`\nOr open: [dailycompound\\.app/brain](https://dailycompound.app/brain)`);
      return;
    }
    const srcLabel = { claude_code: '🤖 Claude Code', claude_chat: '🤖 Claude.ai', telegram: '📱 Telegram', compound: '⚡ Compound', savrio: '✍️ You' };
    const typeLabel = { note: 'Note', insight: 'Insight', suggestion: 'Suggestion', reflection: 'Reflection', context: 'Context' };
    const lines = rows.map(r => {
      const src     = esc(srcLabel[r.source] || r.source);
      const type    = esc(typeLabel[r.type] || r.type);
      const content = r.content.length > 250 ? r.content.slice(0, 250) + '…' : r.content;
      return `${src} — _${type}_\n${esc(content)}`;
    });
    await send(chatId, `🧠 *Second Brain \\(last ${rows.length}\\):*\n\n${lines.join('\n\n─────\n\n')}\n\n[Open →](https://dailycompound.app/brain)`);
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

  // ── /plan — generate self-improvement plan ───────────────────────────────
  if (lower === '/plan') {
    await send(chatId, `🧠 *Generating your Apex plan…*\n\n_This takes 15–20 seconds\\._`);
    try {
      const res = await fetch(`${APP_URL}/api/apex-plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const data = await res.json();
      if (data.plan) {
        await send(chatId, formatPlanForTelegram(data.plan));
      } else {
        await send(chatId, `Couldn\'t generate plan\\. Error: ${esc(data.error || 'unknown')}\\. Try again\\.`);
      }
    } catch (e) {
      await send(chatId, `Plan generation failed\\. Check Vercel logs\\.`);
    }
    return;
  }

  // ── Conversational Apex — any free-form text ──────────────────────────────
  if (ANTHROPIC_KEY && !lower.startsWith('/')) {
    const reply = await askApex(text, uid);
    if (reply) { await sendPlain(chatId, reply); return; }
  }

  // ── Fallback: help ────────────────────────────────────────────────────────
  await send(chatId,
    `Not sure what you mean\\. Here\'s what I understand:\n\n` +
    `/tasks — see your todo list\n` +
    `*1* or *2, 3* — complete tasks by number\n` +
    `*/newtask \\[task\\]* — add a todo\n` +
    `*done all* — clear everything\n` +
    `/habits — today\'s habits\n` +
    `/plan — Apex self\\-improvement plan\n` +
    `/brain — your second brain\n` +
    `*note \\[text\\]* — add brain note\n` +
    `/focus \\[text\\] — update what you\'re building\n` +
    `/debug — check bot status\n` +
    `_Or just talk to Apex freely_`
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
