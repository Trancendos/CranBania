# AGENTS.md

## CranBania v0.7.0 — Workshop templates + visual boards

**Mandate:** no Jira, ServiceNow, or paid SaaS. **Not Convex** — see `docs/architecture.md`.

**CI mandate:** do **not** add `.github/workflows/` or GitHub Actions. Use **Forgejo Actions** (`.forgejo/workflows/`) and/or **Woodpecker** (`.woodpecker/`) on your self-hosted forge — zero github.com Actions minutes.

## Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP | `npm run mcp` | stdio |
| Incident queue UI | `/incidents` | 3000 |
| **Visual boards** | `/visual` | 3000 |
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
7. **Visual boards:** `create_visual_board`, `add_visual_node`, `add_visual_edge`, `replace_visual_canvas` — Lucid/Miro-style diagrams at `/visual`
8. **Workshops from cards:** `suggest_workshop_for_card` → `start_workshop_from_card` → `populate_workshop_zones` → `record_workshop_outcomes`

## Visual boards (v0.6.0)

Lucidchart / Miro-style canvas — **zero SaaS**, JSON file storage.

| REST | Purpose |
|------|---------|
| `GET/POST /api/visual-boards` | List / create boards |
| `GET/PATCH/DELETE /api/visual-boards/:id` | Board CRUD + viewport |
| `POST /api/visual-boards/:id/nodes` | Add shape/sticky |
| `PATCH/DELETE .../nodes/:nodeId` | Move/edit/delete node |
| `POST .../edges` | Connect nodes |
| `PATCH /api/visual-boards/:id` + `{ nodes, edges }` | Full canvas replace |

Board types: `whiteboard`, `flowchart`, `mindmap`, `retro`, `architecture`.

MCP: `list_visual_boards`, `get_visual_board`, `create_visual_board`, `update_visual_board`, `delete_visual_board`, `add_visual_node`, `update_visual_node`, `delete_visual_node`, `add_visual_edge`, `delete_visual_edge`, `replace_visual_canvas`.

## Workshop templates (v0.7.0)

17 facilitation templates (SWOT, 5 Whys, Good/Bad/Ugly, ideastorm, fishbone, lean canvas, …) — AI can run a full cycle from a Kanban card.

| Step | REST | MCP |
|------|------|-----|
| Suggest | `POST /api/workshops/suggest` | `suggest_workshop_for_card` |
| Start | `POST /api/workshops/start` | `start_workshop_from_card` |
| Populate zones | `POST /api/workshops/:boardId/populate` | `populate_workshop_zones` |
| Preview | `GET /api/workshops/:boardId/record` | `get_workshop_outcomes` |
| Record to ticket | `POST /api/workshops/:boardId/record` | `record_workshop_outcomes` |

Outcomes sync to the linked card: journal comments per sticky, markdown description block, tags `workshop:{id}` and `zone:{id}`.

Card UI: open a card → **Workshops** section → start template. Canvas: **Record to card** when linked.

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
- **Visual boards** `/visual` — pan/zoom canvas, shapes, stickies, connectors (Lucid/Miro-style)

## Card fields

- `cardType`: task, feature, bug, incident, change
- `priority`: low, medium, high, critical
- `prince2Stage`: starting_up, initiation, delivery, stage_boundary, closing
- `sprintId`, `epicId`, `storyPoints`, `slaDueAt`, `slaBreachNotifiedAt`, `slaWarningNotifiedAt`

## Data files (gitignored)

- `data/board.json`
- `data/workspace.json` (epics + sprints)
- `data/visual-boards.json`
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

GitHub Apps (CodeSlick, Debricked, Orange Pro AI, GitGuardian, etc.) may report on PRs on github.com independently of CranBania. **Plan/scope/credit errors are org-config issues**, not PR bugs — see `docs/ci-third-party-checks.md`.

**In-repo verification** (before merge): run locally or on **Forgejo/Woodpecker** — `npm test`, `npm run lint`, `npm run build`. See `.forgejo/workflows/cranbania-ci.yml` and `.woodpecker/cranbania-ci.yaml`. **Never add GitHub Actions workflows** to this repo.

## Cursor Cloud specific instructions

- Use `npm` only (not Maven/Gradle). Node 18+ required.
- Dev server: `npm run dev` (port 3000). If build fails after turbopack dev, run `rm -rf .next && npm run build`.
- SLA scans run via `npm run sla:poll`, `npm run start:full`, or external cron — not inside the Next.js bundle. Per-card breach check still runs on create/move.
- Removed unused `@dnd-kit/*` packages; card moves use native `<select>`.
