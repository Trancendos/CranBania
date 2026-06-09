# CranBania Strategy

## Mandate: zero cost

CranBania is built under a **£0 / $0 SaaS mandate**:

- No Jira, ServiceNow, Linear paid tiers, or other licensed ITSM/agile platforms
- No paid API keys required to operate the core product
- Self-hosted, local JSON storage, open-source stack (Next.js + Node)
- Webhooks point to **your own** free runners (local scripts, n8n self-hosted, **Forgejo Actions**, Woodpecker, systemd, built-in `npm run sla:poll`, etc.)
- **No GitHub Actions** — do not add `.github/workflows/`; CI runs on self-hosted Forgejo/Woodpecker only

Paid tools may be used optionally by teams, but **CranBania will not depend on them or integrate them as required paths**.

## What we build instead (free alternatives)

| Paid product | CranBania alternative |
|--------------|----------------------|
| Jira backlog/sprints | Built-in **Backlog** column + **Sprints** + **Epics** |
| Jira incidents | `cardType: incident` + SLA timers |
| ServiceNow change | `cardType: change` + journal audit trail |
| ServiceNow CMDB | Out of scope — use tags + description + export JSON |
| Lucidchart / Miro | Built-in **Visual boards** at `/visual` + MCP |
| Prince2 tool | **Prince2-lite stages** on cards (`starting_up` → `closing`) |
| Agent orchestrators (paid) | MCP + REST + webhooks + git worktrees |

## Product tracks (in-repo, all free)

### Track 1 — Agent Kanban (shipped)

- Board, journal, code diffs, worktrees, webhooks, MCP

### Track 2 — Agile workspace (this release)

- Epics, sprints, burndown API, story points, sprint filter

### Track 3 — ITSM-lite (this release)

- Incident & change card types
- SLA due dates (default: incident 4h, change 72h, bug 24h)
- `/api/itsm/incidents`, `/api/itsm/changes`, `/api/itsm/sla`

### Track 4 — Governance-lite (this release)

- Prince2 stage field per card
- `/api/governance/prince2` overview

### Track 5 — Data portability (shipped)

- `GET /api/export` — full JSON backup
- `POST /api/import` — merge or replace

### Track 6 — Modular automation (v0.5.0)

- Built-in SLA poller, Forgejo/Woodpecker CI recipes
- **Forgejo workflow dispatch sidecar** on card events
- **API key middleware** for mutating routes
- Event bus + JSON migrations + automation status API
- MCP: `get_automation_status`, `run_sla_check`

### Track 7 — Visual collaboration (v0.6.0–0.7.0)

- Lucidchart / Miro-style boards — shapes, stickies, frames, connectors
- Templates: flowchart, mindmap, retro, architecture, whiteboard
- **17 smart workshop templates** (SWOT, 5 Whys, ideastorm, premortem, lean canvas, …)
- **Card-linked workshop lifecycle:** suggest → start → populate → record outcomes to ticket
- REST + MCP for AI agents
- Included in workspace export v3 (`visualBoards`)
- **Not building:** real-time multiplayer cursors, paid diagram SaaS sync

See `docs/architecture.md` and `docs/automation-recipes.md`.

### Not building (unless mandate changes)

- Full ITIL certification workflows
- Full Prince2 document pack generation
- CMDB, problem management, asset lifecycle
- Paid SaaS sync adapters

## Success metrics

1. Agents can run a full task lifecycle without external tickets
2. Incidents have visible SLA state without ServiceNow
3. Sprints can be planned without Jira
4. Entire workspace export fits in one JSON file
