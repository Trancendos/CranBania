# CranBania

**Kanban board built for humans and AI agents** — with per-card journal, code diffs, git worktrees, and webhooks.

## Columns

| Column | Purpose | Side effects |
|--------|---------|--------------|
| **Backlog** | Incoming work (default for new cards) | — |
| **Planning** | Specs and breakdown | — |
| **In Progress** | Active agent/human work | **Git worktree** + **webhooks** |
| **Review** | Human or AI review | — |
| **Done** | Completed | — |

## Per-card journal (recommended)

Each card carries a unified **journal** — audit log + comments + code events:

| Entry type | What it records |
|------------|-----------------|
| `created` / `moved` / `updated` | Board changes |
| `comment` | Notes from humans or agents |
| `code_change` | File diffs (added / edited / deleted segments) |
| `worktree` | Git branch isolation when entering In Progress |
| `webhook` | Delivery status for external triggers |

**Yes — a journal per card is worth it.** It gives agents continuity without a separate ticketing system.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click a card to open its journal panel.

### Webhooks (on `in_progress`)

```bash
# Register a webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-agent-runner.example/hook"}'

# Or set env (comma-separated)
export CRANBANIA_WEBHOOK_URLS="https://hook1.example,https://hook2.example"
```

Payload:

```json
{
  "event": "card.in_progress",
  "card": { "id", "title", "worktree": { "path", "branch" } }
}
```

### Git worktree per card

When a card moves to **In Progress**, CranBania creates:

- Branch: `card/<short-id>-<slugified-title>`
- Worktree: `data/worktrees/<card-id>/`

Agents can work in isolation without touching your main checkout.

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/backlog` | Backlog cards only |
| `GET` | `/api/board` | Full board |
| `GET` | `/api/cards/:id/journal` | Audit log |
| `POST` | `/api/cards/:id/comments` | `{ "message", "actor?" }` |
| `POST` | `/api/cards/:id/code-changes` | `{ "filePath", "changeType", "content", ... }` |
| `POST` | `/api/cards/:id/move` | `{ "columnId", "actor?" }` — triggers worktree + webhooks on `in_progress` |
| `GET/POST` | `/api/webhooks` | Webhook config |

## MCP tools

`npm run mcp` — see `.cursor/mcp.example.json`

Includes: `list_backlog`, `get_journal`, `add_comment`, `add_code_change`, `move_card`, …

## Product scope: Agile / Prince2 / ITIL?

| Scope | Worth building into CranBania? |
|-------|-------------------------------|
| **Card journal + code diffs** | ✅ Yes — core value for AI agents |
| **Kanban + backlog** | ✅ Yes — already here |
| **Git worktree + webhooks** | ✅ Yes — agent orchestration |
| **Full Agile ceremonies** | ⚠️ Later — sprints, velocity, burndown as optional modules |
| **Prince2 stage gates** | ❌ Not yet — different audience; integrate via tags/columns first |
| **Full ITSM / ITIL** | ❌ Not in v1 — use Jira/ServiceNow + MCP sync instead |

**Recommendation:** Keep CranBania focused as an **agent-native task board**. Add ITIL/Prince2 only when you have a concrete customer need — otherwise you rebuild ServiceNow poorly.

## Scripts

```bash
npm run dev      # port 3000
npm run mcp      # MCP stdio
npm test
npm run lint
npm run build
```

## License

MIT
