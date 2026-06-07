# AGENTS.md

## CranBania v0.3 — zero-cost workspace

**Mandate:** no Jira, ServiceNow, or paid SaaS dependencies. Everything agents need is in-repo.

## Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP | `npm run mcp` | stdio |

## Agent workflow

1. `list_backlog` / `create_sprint` / `create_epic`
2. `create_card` with `cardType: incident|change|feature` and optional `sprintId`
3. `move_card` → `in_progress` (worktree + webhooks)
4. `add_code_change` + `add_comment`
5. `get_sla_report` for ITSM-lite monitoring
6. `export_workspace` for backup

## Card fields

- `cardType`: task, feature, bug, incident, change
- `priority`: low, medium, high, critical
- `prince2Stage`: starting_up, initiation, delivery, stage_boundary, closing
- `sprintId`, `epicId`, `storyPoints`, `slaDueAt`

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
