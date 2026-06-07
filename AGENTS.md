# AGENTS.md

Guidance for AI coding agents working in CranBania.

## Project

**CranBania** is an AI-agent-ready Kanban board (Next.js + JSON file store + MCP server).

## Cursor Cloud specific instructions

### Services

| Service | Command | Port |
|---------|---------|------|
| Web + API | `npm run dev` | 3000 |
| MCP server | `npm run mcp` | stdio (no port) |

Start the dev server in tmux before manual browser testing:

```bash
SESSION_NAME="cranbania-dev"; tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$PWD" -- "${SHELL:-zsh}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'npm run dev' C-m
```

### Lint / test / build

```bash
npm install
npm run lint
npm test
npm run build
```

### Agent workflow on this board

Agents can operate CranBania without a human UI:

1. `GET /api/board` or MCP `list_board` — read backlog
2. MCP `create_card` or `POST /api/cards` — add work
3. MCP `move_card` or `POST /api/cards/:id/move` — advance status
4. MCP `update_card` — add notes, assignee (`claude`, `cursor`, etc.)

Column IDs: `backlog`, `planning`, `in_progress`, `review`, `done`.

### Gotchas

- Board data lives in `data/board.json`; reset by deleting that file.
- MCP server must run from repo root so `data/` resolves correctly.
- Dev server hot-reloads API changes; UI polls every 5s for external agent updates.
