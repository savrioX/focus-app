# How to Launch the Agent Team

## Open Claude Code from the focus-app folder

**Option A — PowerShell:**
```powershell
cd C:\Users\klszo\focus-app
claude
```

**Option B — Quick launcher (double-click):**
File already exists at `C:\Users\klszo\focus-app\open-claude.bat`:
```bat
@echo off
cd /d C:\Users\klszo\focus-app
claude
```

Claude Code must start from inside this folder to load CLAUDE.md and all agent definitions automatically.

---

## Launch Prompt (paste this into Claude Code)

This follows the structure from Nate Herk's video: **goal → agents → deliverables**

```
GOAL: Help Savrio grow @thestartupjournal1 to 10,000 Instagram followers and
grow dailycompound.app signups. The product is free — there is no paid tier
and nothing to monetize. All agents work in
parallel and message each other directly. All agents plan first and need
CEO + voice-of-reason + lawyer approval before executing.

Create a team of 6 agents using claude-sonnet-4-6.
Name them exactly: ceo, graphic-design, publicity, voice-of-reason, it-dev, lawyer.
Use the agent definitions from .claude/agents/ for each.
Require plan approval before any agent executes.

Agent 1 — ceo
Role: Savrio's only contact. Manages all agents, approves all plans,
synthesizes results. Owns docs/ceo-strategy.md and docs/ceo-tasks.md.
When done with any task, deliver clean summary to Savrio.

Agent 2 — graphic-design
Role: Creates all visual assets. Owns instagram_content/graphics/ and
instagram_content/scripts/. When done, message publicity and voice-of-reason directly.

Agent 3 — publicity
Role: Instagram strategy and all post copy. Owns instagram_content/copy/.
When done, message graphic-design with exact slide text and message
voice-of-reason and lawyer for review.

Agent 4 — voice-of-reason
Role: Reviews all plans before execution and all finished work before delivery.
Owns docs/reviews/. Works in parallel with lawyer. Message CEO with every verdict.

Agent 5 — it-dev
Role: All technical work on dailycompound.app. Owns index.html and api/.
When done, message voice-of-reason and lawyer, then CEO with what was built.

Agent 6 — lawyer
Role: Legal review of all plans and finished content. Owns docs/legal/.
Works in parallel with voice-of-reason. Message CEO with verdict and originating
agent with exact fixes needed.

DELIVERABLES for every session:
- Finished assets saved to their owner's file territory
- Review reports in docs/reviews/ and docs/legal/
- CEO summary delivered to Savrio
- All agents confirm ready before shutdown

Have the CEO introduce the team and ask Savrio what we're working on first.
```

---

## How the Workflow Runs

```
Savrio → CEO
           ↓ messages all agents simultaneously
  [gfx] [pub] [it-dev] each write a plan → send to CEO
           ↓ CEO sends all plans to voice-of-reason + lawyer IN PARALLEL
  [vor] reviews quality    [lawyer] reviews legal risk
           ↓ both message CEO with verdicts
  CEO approves/rejects → agents execute in parallel
           ↓ agents message each other directly as needed
  [pub] → [gfx]: "here's the slide text"
  [it-dev] → [lawyer]: "this touches user data, review?"
           ↓ finished work
  each agent → [vor]: "ready for final review"
           ↓ vor clears → CEO delivers to Savrio
```

---

## Navigation
- `Shift+Down` — cycle through all teammates
- `Ctrl+T` — toggle task list
- Type to message whoever you're viewing
- You only need to talk to the CEO

---

## Example First Tasks for the CEO

**Content sprint:**
```
I want 3 Instagram posts this week targeting student entrepreneurs.
Mix of carousel and single image. Goal: new followers + website signups.
Get the full team started.
```

**Activation fix:**
```
What's the #1 thing stopping new signups from becoming daily users?
Have it-dev and publicity investigate in parallel.
```

**Legal audit:**
```
Review my TOS and Privacy Policy. What's missing, risky, or outdated?
```

**Full sprint:**
```
Ship one new website feature AND run a 3-post Instagram campaign this week.
Both focused on driving signups and daily use. Plan it and get everyone moving.
```

---

## Shutdown (always say this to the CEO)
```
Session ending. Have all teammates save their work and confirm ready for shutdown,
then clean up the team.
```

---

## Common Fixes (from Nate Herk's video)

| Problem | Fix |
|:--------|:----|
| Agents keep asking for permissions | Already pre-approved in `settings.local.json` |
| Agent sitting idle | Tell CEO to assign it a specific task with a dependency |
| Agents overwriting each other | Each agent owns specific files — remind them |
| Too many tokens | Reduce to 3 agents, use Haiku for simpler roles |
| Agent lost work | Tell agents to save to their temp file (`docs/temp/[agent]-wip.md`) |
| Wrong plan approved | Have Savrio be the approver instead of CEO for that session |
