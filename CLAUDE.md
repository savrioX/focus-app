# Compound — Project Context for All Agents

Every agent on this team loads this file automatically. Read it fully before doing any work.

---

## The Founder

**Savrio** — 19-year-old solo founder, macOS.
- Wants **production-ready output**, not instructions or options
- Moves fast, speaks directly — match that energy
- No fluff. Deliver results.

---

## The Two Products

### 1. Compound — dailycompound.app
Productivity SaaS for student entrepreneurs.

**Stack:**
- Frontend: HTML, CSS, vanilla JavaScript (93% of codebase)
- Database/Auth: Supabase
- Hosting: Vercel (auto-deploy from GitHub — pushing to `main` deploys to production)
- Payments: none. The product is free; there is no paid tier.
- Repo: `savrioX/focus-app` | Local: `~/Desktop/claude/focus-app/`

**Features:**
- Goals with AI-generated action steps
- Habit streaks
- Daily todos
- Apex Advisor AI coach (fair-use cap: `AI_DAILY_LIMIT`, default 15/day, applies to everyone)
- Focus timer
- **Everything is free.** The Pro tier, its paywall, and the Stripe integration
  were all removed (2026-09-05). There is no billing anywhere in the product.

**Current Goals:**
- ⚠️ NEEDS SAVRIO — the previous goals here were all "convert free users to
  $10/month Pro", which no longer exists. Replace with the real current goals.
- Improve onboarding and retention
- Optimize mobile UX

### 2. The Startup Journal — @thestartupjournal1
Instagram page documenting the build in public.

**Angle:** "19-year-old building a startup with AI"
**Goal:** 10,000 followers
**Content style:** viral hooks, real numbers, build updates, founder lessons

---

## Brand Identity

| Element | Value |
|:--------|:------|
| Background | `#0a0a0a` |
| Primary purple | `#7c3aed` |
| Bright purple | `#a769ff` |
| Text | `#ffffff` / `#e2e8f0` |
| Canvas (stories) | 1080×1920px |
| Canvas (posts) | 1080×1080px |
| Vibe | Dark, premium, startup energy |

Graphics are generated with Python + Pillow. Output to `instagram_content/`.

---

## The Agent Team

| Agent | Role |
|:------|:-----|
| **ceo** | Savrio's main contact. Manages team, approves all plans, synthesizes results |
| **graphic-design** | All visual assets — posts, logos, graphics |
| **publicity** | Instagram strategy, captions, marketing, growth |
| **voice-of-reason** | Reviews all plans before execution + all finished work before delivery |
| **it-dev** | Technical work on the website |
| **lawyer** | Legal review of all plans + finished content. TOS, privacy policy, compliance |

## Non-Negotiable Rules

1. **Plan first, always.** Every agent submits a plan before doing any work.
2. **Approval gate.** CEO approves every plan. Lawyer reviews anything public/legal. Voice-of-reason reviews everything.
3. **Parallel execution.** Agents work simultaneously — no waiting for the CEO to relay messages. Use SendMessage to coordinate directly.
4. **Nothing ships without final voice-of-reason + lawyer clearance.**

## Approval Flow
```
Agent gets task → Agent writes plan → Sends to CEO
CEO sends plan to voice-of-reason + lawyer simultaneously
Both review in parallel → Send verdicts to CEO
CEO approves/rejects → Agent executes
Agent finishes → Sends to voice-of-reason for final QC
voice-of-reason clears → CEO delivers to Savrio
```

---

## Key Numbers to Know

- Price: **free** — no paid tier exists
- Follower goal: **10,000**
- GitHub commits: don't hardcode this, it goes stale — run `git log --oneline | wc -l`
- First commit: **2026-05-13**

---

## File Structure (Key Files)

```
focus-app/
├── index.html          # Main app
├── api/                # Serverless functions (Vercel)
├── instagram_content/  # Generated graphics output
├── docs/               # Reference docs
├── .claude/
│   ├── agents/         # Agent definitions
│   └── settings.local.json
├── schema.sql          # Supabase schema
├── vercel.json         # Deployment config
└── CLAUDE.md           # This file
```
