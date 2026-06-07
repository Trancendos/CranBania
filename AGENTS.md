# AGENTS.md

## CranBania v0.4 — priority features

**Mandate:** no Jira, ServiceNow, or paid SaaS dependencies. Everything agents need is in-repo.

## Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP | `npm run mcp` | stdio |
| Incident queue UI | `/incidents` | 3000 |

## Agent workflow

1. `list_backlog` / `create_sprint` / `create_epic`
2. `create_card` — auto-assigns **active sprint** if `sprintId` omitted
3. `move_card` → `in_progress` (worktree + `card.in_progress` webhooks)
4. `add_code_change` + `add_comment`
5. `get_sla_report` or `POST /api/itsm/sla/check` for breach webhooks
6. `export_workspace` for backup

## Webhooks

| Event | Trigger |
|-------|---------|
| `card.in_progress` | Card enters In Progress |
| `card.sla_breach` | SLA due passed (once per card) |

Env: `CRANBANIA_WEBHOOK_URLS` (comma-separated). Cron auth: `CRANBANIA_CRON_SECRET` for SLA check.

Automation recipes: `docs/automation-recipes.md` (n8n, GitHub Actions).

## UI

- Kanban board `/` — sprint filter + **burndown chart** when sprint selected
- Incident queue `/incidents` — ITSM-lite triage table

## Card fields

- `cardType`: task, feature, bug, incident, change
- `priority`: low, medium, high, critical
- `prince2Stage`: starting_up, initiation, delivery, stage_boundary, closing
- `sprintId`, `epicId`, `storyPoints`, `slaDueAt`, `slaBreachNotifiedAt`

## Data files (gitignored)

- `data/board.json`
- `data/workspace.json` (epics + sprints)
- `data/webhooks.json`
- `data/worktrees/`

## Lint / test / build

```bash
npm install
npm run lint
npm test
npm run build
```

## Cursor Cloud specific instructions

- Use `npm` only (not Maven/Gradle). Node 18+ required.
- Dev server: `npm run dev` (port 3000). If build fails after turbopack dev, run `rm -rf .next && npm run build`.
- SLA breach scan is not automatic unless something calls `POST /api/itsm/sla/check` (or card create/move triggers per-card check). Schedule via GitHub Actions or n8n per `docs/automation-recipes.md`.
- Removed unused `@dnd-kit/*` packages; card moves use native `<select>`.
