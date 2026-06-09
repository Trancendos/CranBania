# CranBania

**Zero-cost Kanban for humans and AI agents** — journal, worktrees, webhooks, Agile sprints, ITSM-lite, Prince2 tags, visual boards, and **27 workshop templates**. **No Jira. No ServiceNow.**

See [STRATEGY.md](./STRATEGY.md) for the £0 mandate and [docs/magna-carta-alignment.md](./docs/magna-carta-alignment.md) for Magna Carta framework alignment.

## Zero-cost alternatives built in

| Instead of… | Use CranBania… |
|-------------|----------------|
| Jira backlog/sprints | Backlog column + `/api/sprints` + epics |
| ServiceNow incidents | `cardType: incident` + SLA (default 4h) |
| ServiceNow changes | `cardType: change` + SLA (default 72h) |
| Prince2 tooling | `prince2Stage` on each card |
| Lucidchart / Miro | `/visual` boards + `/api/visual-boards` + MCP |
| Miro workshop kits | **27 workshop templates** — SWOT, roadmaps, wireframes, OKRs, … |
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
| `GET/POST /api/visual-boards` | Visual boards (Lucid/Miro-style) |
| `GET /api/workshops/templates` | Workshop template catalog |
| `POST /api/workshops/run` | One-shot: start + populate + record |
| `POST /api/workshops/:id/wireframe` | Add wireframe UI components |
| `POST /api/workshops/:id/populate` | AI/human fills zone stickies |
| `POST /api/workshops/:id/record` | Sync outcomes to linked card |
| `GET /api/visual-boards/:id/export` | Portable canvas JSON (Lucid/Miro alternative) |
| `POST /api/visual-boards/:id/import` | Import canvas JSON (merge or replace) |
| `PATCH /api/visual-boards/:id/presence` | Poll-based collaborator cursors (£0) |
| `POST /api/webhooks` | Register webhooks incl. `workshop.completed` |
| `GET /visual` | Visual board UI |
| `GET /api/export` | Full backup |
| `POST /api/import` | Restore merge/replace |

Plus all v0.2 routes: journal, comments, code-changes, webhooks (`card.in_progress`, `card.sla_warning`, `card.sla_breach`, **`workshop.completed`**), MCP.

## Production auth

Set `CRANBANIA_API_KEY` to require a bearer token on all mutating `/api/*` routes. Set `CRANBANIA_CRON_SECRET` for `POST /api/itsm/sla/check`.

```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer $CRANBANIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Agent task","cardType":"task"}'
```

## Automation (free)

See [docs/automation-recipes.md](./docs/automation-recipes.md) — **Forgejo/Woodpecker CI** (`.forgejo/workflows/cranbania-ci.yml`), `npm run sla:poll`, `npm run start:full`. **No GitHub Actions.**

Architecture and Convex-skill mapping: [docs/architecture.md](./docs/architecture.md).

## MCP

```bash
npm run mcp
```

New tools: `create_epic`, `create_sprint`, `list_incidents`, `get_sla_report`, `export_workspace`, `create_visual_board`, `run_workshop_for_card`, `register_webhook`, `export_visual_board`, …

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
npm run mcp
npm run sla:poll
npm run start:full
npm run webhooks:bootstrap
```

MIT · self-hosted · no SaaS required
