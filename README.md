# CranBania

**Zero-cost Kanban for humans and AI agents** — journal, worktrees, webhooks, Agile sprints, ITSM-lite, Prince2 tags. **No Jira. No ServiceNow.**

See [STRATEGY.md](./STRATEGY.md) for the £0 mandate and roadmap.

## Zero-cost alternatives built in

| Instead of… | Use CranBania… |
|-------------|----------------|
| Jira backlog/sprints | Backlog column + `/api/sprints` + epics |
| ServiceNow incidents | `cardType: incident` + SLA (default 4h) |
| ServiceNow changes | `cardType: change` + SLA (default 72h) |
| Prince2 tooling | `prince2Stage` on each card |
| Paid backups | `GET /api/export` JSON |

## Columns

Backlog → Planning → In Progress (worktree + webhooks) → Review → Done

## Quick start

```bash
npm install
npm run dev
```

## Card types

`task` | `feature` | `bug` | `incident` | `change`

Incidents/changes get automatic SLA due dates. Journal records breaches.

## Key APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/backlog` | Backlog queue |
| `GET/POST /api/epics` | Agile epics |
| `GET/POST /api/sprints` | Sprints + burndown |
| `GET /api/sprints/:id/burndown` | Sprint burndown (story points + chart series) |
| `GET /api/itsm/incidents` | Free incident queue (API) |
| `GET /incidents` | Incident queue dashboard (UI) |
| `POST /api/itsm/sla/check` | Cron SLA breach scan + webhooks |
| `GET /api/automation/status` | Scheduler + webhook health |
| `GET /api/itsm/changes` | Change records |
| `GET /api/itsm/sla` | SLA report |
| `GET /api/governance/prince2` | Stage overview |
| `GET /api/export` | Full backup |
| `POST /api/import` | Restore merge/replace |

Plus all v0.2 routes: journal, comments, code-changes, webhooks (`card.in_progress`, `card.sla_warning`, `card.sla_breach`), MCP.

## Production auth

Set `CRANBANIA_API_KEY` to require a bearer token on all mutating `/api/*` routes. Set `CRANBANIA_CRON_SECRET` for `POST /api/itsm/sla/check`.

```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer $CRANBANIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Agent task","cardType":"task"}'
```

## Automation (free)

See [docs/automation-recipes.md](./docs/automation-recipes.md) — **built-in `npm run sla:poll`**, `npm run start:full`, Forgejo Actions, Woodpecker, n8n, systemd. GitHub Actions optional, not required.

Architecture and Convex-skill mapping: [docs/architecture.md](./docs/architecture.md).

## MCP

```bash
npm run mcp
```

New tools: `create_epic`, `create_sprint`, `list_incidents`, `get_sla_report`, `export_workspace`, …

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
npm run mcp
npm run sla:poll
npm run start:full
```

MIT · self-hosted · no SaaS required
