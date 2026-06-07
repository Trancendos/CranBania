# AGENTS.md

## CranBania v0.5.0 — Forgejo agents + API auth

**Mandate:** no Jira, ServiceNow, or paid SaaS. **Not Convex** — see `docs/architecture.md`.

## Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP | `npm run mcp` | stdio |
| Incident queue UI | `/incidents` | 3000 |
| **SLA poller** | `npm run sla:poll` | sidecar |
| **App + poller** | `npm run start:full` | 3000 + sidecar |
| Automation status | `GET /api/automation/status` | 3000 |

## Auth (production)

| Env | Protects |
|-----|----------|
| `CRANBANIA_API_KEY` | All mutating `/api/*` (middleware) |
| `CRANBANIA_CRON_SECRET` | `POST /api/itsm/sla/check` only |

Headers: `Authorization: Bearer …` or `X-CranBania-Api-Key`.

## Forgejo agent dispatch

Set `FORGEJO_URL`, `FORGEJO_OWNER`, `FORGEJO_REPO`, `FORGEJO_TOKEN` — CranBania dispatches `.forgejo/workflows/cranbania-agent.yml` on `card.in_progress` and `cranbania-sla-agent.yml` on breach.

Woodpecker: `.woodpecker/cranbania-sla.yaml` + `cranbania-agent.yaml`.

MCP: `get_automation_status`, `run_sla_check`.

## SLA polling (no GitHub Actions required)

| Method | When |
|--------|------|
| `npm run sla:poll` | **Recommended** — adaptive sidecar |
| `npm run start:full` | Production: Next.js + poller together |
| Forgejo Actions | `.forgejo/workflows/` — self-hosted |
| Woodpecker | `.woodpecker/cranbania-sla.yaml` |
| `npm run sla:poll:once` | systemd / n8n / Forgejo curl |

Details: `docs/automation-recipes.md`

## Agent workflow

1. `list_backlog` / `create_sprint` / `create_epic`
2. `create_card` — auto-assigns **active sprint** if `sprintId` omitted
3. `move_card` → `in_progress` (worktree + `card.in_progress` webhooks)
4. `add_code_change` + `add_comment`
5. `get_sla_report` or `POST /api/itsm/sla/check` for breach/warning webhooks
6. `export_workspace` for backup

## Webhooks

| Event | Trigger |
|-------|---------|
| `card.in_progress` | Card enters In Progress |
| `card.sla_warning` | Final 25% of SLA window (`CRANBANIA_SLA_WARNING_PERCENT`) |
| `card.sla_breach` | SLA due passed (once per card) |

Env: `CRANBANIA_WEBHOOK_URLS` (comma-separated). Cron auth: `CRANBANIA_CRON_SECRET` for SLA check.

Automation recipes: `docs/automation-recipes.md` (Forgejo, Woodpecker, n8n, systemd).

## UI

- Kanban board `/` — sprint filter + **burndown chart** when sprint selected
- Incident queue `/incidents` — ITSM-lite triage table

## Card fields

- `cardType`: task, feature, bug, incident, change
- `priority`: low, medium, high, critical
- `prince2Stage`: starting_up, initiation, delivery, stage_boundary, closing
- `sprintId`, `epicId`, `storyPoints`, `slaDueAt`, `slaBreachNotifiedAt`, `slaWarningNotifiedAt`

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

## Third-party CI checks

GitHub Apps (CodeSlick, Debricked, Orange Pro AI, GitGuardian, etc.) may report on PRs independently of in-repo scripts. **Plan/scope/credit errors are org-config issues**, not PR bugs — see `docs/ci-third-party-checks.md`.

Required in-repo gates before merge: `npm test`, `npm run lint`, `npm run build`.

## Cursor Cloud specific instructions

- Use `npm` only (not Maven/Gradle). Node 18+ required.
- Dev server: `npm run dev` (port 3000). If build fails after turbopack dev, run `rm -rf .next && npm run build`.
- SLA scans run via `npm run sla:poll`, `npm run start:full`, or external cron — not inside the Next.js bundle. Per-card breach check still runs on create/move.
- Removed unused `@dnd-kit/*` packages; card moves use native `<select>`.
