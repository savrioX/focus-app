# Agent Teams — Master Reference

> Experimental feature. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Claude Code v2.1.32+.

---

## What Are Agent Teams

Multiple Claude Code instances (teammates) working together under one lead session. The lead coordinates tasks, spawns teammates, and synthesizes results. Teammates are fully independent — each has its own context window and can message each other directly.

**Key difference from subagents:** teammates talk to each other. Subagents only report back to the caller.

---

## Enable

```json
// .claude/settings.local.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your shell environment.

---

## Architecture

| Component    | Role |
|:-------------|:-----|
| **Team lead** | Main session — creates team, spawns teammates, coordinates |
| **Teammates** | Separate Claude Code instances — each owns assigned tasks |
| **Task list** | Shared work queue; teammates claim and complete tasks |
| **Mailbox**   | Messaging system for direct agent-to-agent communication |

**Storage locations (auto-managed, do not hand-edit):**
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

---

## Subagents vs Agent Teams

| | Subagents | Agent Teams |
|:--|:--|:--|
| Context | Own window; results return to caller | Own window; fully independent |
| Communication | Report to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all | Shared task list, self-coordinating |
| Best for | Focused tasks where only result matters | Complex work needing discussion/collaboration |
| Token cost | Lower | Higher (each teammate = separate instance) |

**Rule of thumb:** use subagents for quick isolated workers; use agent teams when workers need to share findings or challenge each other.

---

## Starting a Team

Just describe what you want in natural language:

```
Create an agent team with 3 teammates:
- One on security review
- One on performance
- One on test coverage
Have them review PR #142 and report findings.
```

Claude creates the team, spawns teammates, assigns tasks, and cleans up when done.

---

## Display Modes

| Mode | Description | Requirement |
|:-----|:------------|:------------|
| `in-process` | All teammates in one terminal; Shift+Down to cycle | Any terminal |
| `tmux` | Each teammate in its own split pane | tmux or iTerm2 + `it2` CLI |
| `auto` (default) | Split panes if inside tmux, otherwise in-process | — |

Set in `~/.claude/settings.json`:
```json
{ "teammateMode": "in-process" }
```

Or per-session:
```bash
claude --teammate-mode in-process
```

**Navigation (in-process mode):**
- `Shift+Down` — cycle through teammates
- `Enter` — view a teammate's session
- `Escape` — interrupt current turn
- `Ctrl+T` — toggle task list

---

## Key Controls

### Spawn with specific models
```
Create a team with 4 teammates to refactor these modules. Use Sonnet for each.
```
To make teammates follow the lead's model: set **Default teammate model → Default (leader's model)** in `/config`.

### Require plan approval before implementation
```
Spawn an architect teammate to refactor auth. Require plan approval before changes.
```
Lead reviews plan → approves or rejects with feedback → teammate implements only after approval.

### Talk directly to a teammate
- **In-process:** Shift+Down to reach them, then type
- **Split pane:** click their pane

### Assign vs self-claim tasks
- **Lead assigns:** tell the lead "assign X task to Y teammate"
- **Self-claim:** teammates automatically pick up the next unblocked task after finishing

### Shut down a teammate
```
Ask the researcher teammate to shut down
```

### Clean up the whole team
```
Clean up the team
```
Always do this from the lead. Shut down all teammates first.

---

## Task System

Tasks have three states: **pending → in progress → completed**

Tasks can have dependencies — a task with unresolved dependencies cannot be claimed until those are complete. File locking prevents race conditions when multiple teammates try to claim the same task simultaneously.

**Good task size:** self-contained units with a clear deliverable (a function, a test file, a review). Too small = coordination overhead wins. Too large = risk of wasted effort before check-ins.

**Ideal ratio:** 5–6 tasks per teammate.

---

## Hooks for Quality Gates

| Hook | Trigger | Use |
|:-----|:--------|:----|
| `TeammateIdle` | Teammate about to go idle | Exit code 2 to send feedback and keep them working |
| `TaskCreated` | Task being created | Exit code 2 to block creation with feedback |
| `TaskCompleted` | Task being marked complete | Exit code 2 to block completion with feedback |

---

## Context Rules

- Teammates load `CLAUDE.md`, MCP servers, and skills from the project — same as a regular session
- Teammates **do not** inherit the lead's conversation history
- Include all relevant context in the spawn prompt

Good spawn prompt example:
```
Spawn a security reviewer with: "Review src/auth/ for vulnerabilities.
Focus on token handling, session management, input validation. App uses
JWT in httpOnly cookies. Report issues with severity ratings."
```

### Subagent definitions as teammates
Reference a named subagent type when spawning:
```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```
The teammate respects that definition's `tools` allowlist and `model`. Team tools (`SendMessage`, task management) are always available regardless of `tools` restrictions.

Note: `skills` and `mcpServers` from subagent definitions are NOT applied when running as teammates — those load from project/user settings.

---

## Permissions

- Teammates start with the lead's permission settings
- If lead uses `--dangerously-skip-permissions`, all teammates do too
- Per-teammate modes can be changed after spawning, not at spawn time
- Pre-approve common operations in permission settings before spawning to reduce friction

---

## Token Cost Awareness

- Each teammate = a separate Claude instance with its own context window
- Token cost scales linearly with teammate count
- Start with **3–5 teammates** for most workflows
- Research/review/parallel feature work → usually worth the cost
- Routine sequential tasks → single session is more cost-effective

---

## Best Practices

1. **Include task-specific context in spawn prompts** — teammates don't see the lead's history
2. **Start with 3–5 teammates** — beyond that, coordination overhead and costs increase fast
3. **5–6 tasks per teammate** — keeps everyone productive without context switching
4. **One file owner per teammate** — two teammates editing the same file causes overwrites
5. **Start with research/review tasks** if new to agent teams — clearer boundaries, no code conflict risk
6. **Tell the lead to wait** if it starts implementing instead of delegating: `"Wait for your teammates to complete their tasks before proceeding"`
7. **Monitor and steer** — check in regularly, redirect approaches that aren't working
8. **Use `CLAUDE.md`** to provide project-wide guidance to all teammates automatically

---

## Proven Prompt Patterns

### Parallel code review (different lenses)
```
Create an agent team to review PR #142. Three reviewers:
- Security implications
- Performance impact
- Test coverage
Have them each review and report findings.
```

### Competing hypothesis debugging
```
Users report the app exits after one message. Spawn 5 teammates to investigate
different hypotheses. Have them debate and try to disprove each other's theories.
Update findings.md with whatever consensus emerges.
```

### Parallel feature development
```
Create a team with 4 teammates to refactor these modules in parallel.
Each teammate owns one module with no shared files.
```

### Research from multiple angles
```
Create an agent team: one on UX, one on technical architecture,
one playing devil's advocate. Explore this CLI tool design and synthesize findings.
```

---

## Limitations (Experimental)

| Limitation | Workaround |
|:-----------|:-----------|
| No session resumption for in-process teammates | Spawn new teammates after resuming |
| Task status can lag (blocking dependent tasks) | Tell lead to nudge teammate or update status manually |
| Shutdown can be slow | Wait for current tool call to finish |
| One team at a time | Clean up before creating a new one |
| No nested teams | Only the lead can spawn teammates |
| Lead is fixed for team lifetime | Can't promote teammates to lead |
| Split panes not supported in VS Code terminal, Windows Terminal, Ghostty | Use in-process mode |

---

## Troubleshooting

| Issue | Fix |
|:------|:----|
| Teammates not appearing | Press Shift+Down; check tmux is installed (`which tmux`) |
| Too many permission prompts | Pre-approve operations in permission settings before spawning |
| Teammate stopped on error | Message them directly with new instructions or spawn a replacement |
| Lead shuts down too early | Tell it to keep going and wait for teammates |
| Orphaned tmux session | `tmux ls` → `tmux kill-session -t <name>` |

---

## Quick Decision Tree

```
Need parallel work?
├── Workers need to talk to each other? → Agent Teams
├── Workers just need to report results? → Subagents
├── Sequential tasks / same-file edits? → Single session
└── Manual parallel sessions? → Git Worktrees
```
