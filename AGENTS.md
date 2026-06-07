# AGENTS.md

Guidance for AI coding agents working in CranBania.

## Project

**CranBania** — AI-agent-ready Kanban with per-card journal, code diffs, git worktrees, and webhooks.

## Cursor Cloud specific instructions

### Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP server | `npm run mcp` | stdio |

### Lint / test / build

```bash
npm install
npm run lint
npm test
npm run build
```

### Agent workflow

1. `list_backlog` or `GET /api/backlog` — pick work
2. `move_card` → `in_progress` — creates git worktree + fires webhooks
3. Work in `data/worktrees/<card-id>/` on branch `card/<id>-<slug>`
4. `add_code_change` — record file diffs on the card
5. `add_comment` — notes and handoff context
6. `move_card` → `review` then `done`

Column IDs: `backlog`, `planning`, `in_progress`, `review`, `done`.

### Webhooks

Configure via `POST /api/webhooks` or `CRANBANIA_WEBHOOK_URLS` env var. Fires on `card.in_progress` only.

### Gotchas

- Board data: `data/board.json`; webhooks: `data/webhooks.json`; worktrees: `data/worktrees/`
- Moving to `in_progress` without git repo logs a journal entry but skips worktree
- Journal is the single source of truth for audit + comments + code events
