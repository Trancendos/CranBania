# CranBania

**Kanban board built for humans and AI agents.**

CranBania is a lightweight Kanban board where Claude, Cursor, GPT, Gemini, or any MCP-capable agent can pull tasks, update status, and move cards through your workflow — the same way Nimbalyst and Agetor orchestrate agents, but as your own open-source board.

## Columns

| Column | Purpose |
|--------|---------|
| **Backlog** | Incoming work |
| **Planning** | Specs and breakdown |
| **In Progress** | Active agent/human work |
| **Review** | Ready for human or AI review |
| **Done** | Completed |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## REST API (any AI with HTTP access)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/board` | Full board state |
| `GET` | `/api/summary` | Card counts per column |
| `GET` | `/api/cards?columnId=in_progress` | List cards |
| `POST` | `/api/cards` | Create card `{ "title", "description?", "columnId?", "assignee?", "tags?" }` |
| `GET` | `/api/cards/:id` | Get one card |
| `PATCH` | `/api/cards/:id` | Update fields |
| `POST` | `/api/cards/:id/move` | Move `{ "columnId": "review" }` |
| `DELETE` | `/api/cards/:id` | Delete card |

### Example: agent picks up a task

```bash
# Create task
curl -s -X POST http://localhost:3000/api/cards \
  -H 'Content-Type: application/json' \
  -d '{"title":"Add dark mode","assignee":"claude","tags":["feature"]}'

# Move to in progress
curl -s -X POST http://localhost:3000/api/cards/<ID>/move \
  -H 'Content-Type: application/json' \
  -d '{"columnId":"in_progress"}'

# Mark done
curl -s -X POST http://localhost:3000/api/cards/<ID>/move \
  -H 'Content-Type: application/json' \
  -d '{"columnId":"done"}'
```

## MCP server (Claude Desktop, Cursor, etc.)

```bash
npm run mcp
```

Add to your MCP config (see `.cursor/mcp.example.json`):

```json
{
  "mcpServers": {
    "cranbania": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/CranBania"
    }
  }
}
```

### MCP tools

- `list_board` — full board JSON
- `board_summary` — counts per column
- `list_cards` — optional column filter
- `get_card` / `create_card` / `update_card` / `move_card` / `delete_card`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run mcp` | MCP stdio server |

## Data

Board state is stored in `data/board.json` (gitignored). Delete it to reset.

## How this compares to Nimbalyst / Agetor

| Feature | CranBania | Nimbalyst | Agetor |
|---------|-----------|-----------|--------|
| Kanban UI | ✅ | ✅ | ✅ |
| MCP / API for agents | ✅ | Partial | ✅ |
| Git worktrees | — | ✅ | ✅ |
| Visual diffs | — | ✅ | — |
| Self-hosted & free | ✅ | ✅ | ✅ |

CranBania focuses on being a **simple, agent-native task board** you own. Pair it with your IDE or orchestrator for git isolation and code review.

## License

MIT
