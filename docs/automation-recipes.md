# CranBania automation recipes (zero-cost)

These recipes use **free** tools only: GitHub Actions, n8n self-hosted, curl, and CranBania webhooks. No Jira, ServiceNow, or paid SaaS required.

## Prerequisites

1. CranBania running and reachable (local or deployed).
2. Optional env vars:
   - `CRANBANIA_WEBHOOK_URLS` — comma-separated webhook targets (both events by default).
   - `CRANBANIA_CRON_SECRET` — protects `POST /api/itsm/sla/check` in production.

Register webhooks via API:

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-n8n.example/webhook/cranbania",
    "events": ["card.in_progress", "card.sla_breach"]
  }'
```

## Webhook events

| Event | When | Payload |
|-------|------|---------|
| `card.in_progress` | Card moved to In Progress (worktree + agent hook) | `{ event, at, card, ... }` |
| `card.sla_breach` | SLA due time passed (once per card) | `{ event, at, card, sla }` |

Header: `X-CranBania-Event: card.sla_breach`

---

## Recipe 1: GitHub Actions — SLA breach cron

Run every 5 minutes on your self-hosted runner or GitHub-hosted (free tier minutes apply).

`.github/workflows/cranbania-sla-check.yml`:

```yaml
name: CranBania SLA check

on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:

jobs:
  sla-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SLA breach scan
        run: |
          curl -sf -X POST "${{ secrets.CRANBANIA_URL }}/api/itsm/sla/check" \
            -H "Authorization: Bearer ${{ secrets.CRANBANIA_CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Secrets:

- `CRANBANIA_URL` — e.g. `https://cranbania.yourdomain.com`
- `CRANBANIA_CRON_SECRET` — same value as server env

---

## Recipe 2: GitHub Actions — start agent on `card.in_progress`

When a card enters In Progress, POST to your free agent runner (shell script, Cursor Cloud Agent webhook, etc.).

n8n or a small relay can filter on `X-CranBania-Event`. Direct GitHub dispatch example:

`.github/workflows/cranbania-agent-dispatch.yml`:

```yaml
name: CranBania agent on in_progress

on:
  repository_dispatch:
    types: [cranbania_in_progress]

jobs:
  run-agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run agent script
        env:
          CARD_ID: ${{ github.event.client_payload.card.id }}
          CARD_TITLE: ${{ github.event.client_payload.card.title }}
          WORKTREE: ${{ github.event.client_payload.card.worktree.path }}
        run: |
          echo "Agent task: $CARD_TITLE ($CARD_ID)"
          # npm run agent -- --card "$CARD_ID"
```

Bridge webhook → GitHub (n8n HTTP node or tiny Node script):

```javascript
// relay.js — run on free tier or locally
import http from "node:http";

http.createServer(async (req, res) => {
  const body = await readJson(req);
  if (body.event !== "card.in_progress") {
    res.writeHead(204).end();
    return;
  }
  await fetch(
    `https://api.github.com/repos/OWNER/REPO/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        event_type: "cranbania_in_progress",
        client_payload: body,
      }),
    },
  );
  res.writeHead(200).end("ok");
}).listen(3456);
```

---

## Recipe 3: n8n — SLA breach → Slack / email (self-hosted)

1. Install [n8n](https://n8n.io/) locally or on a free VM.
2. **Webhook** node: path `cranbania`, method POST.
3. **IF** node: `{{ $json.event }}` equals `card.sla_breach`.
4. **Slack** or **Send Email** node with card title and SLA details.

Cron alternative in n8n:

1. **Schedule Trigger** every 5 minutes.
2. **HTTP Request**: POST `http://cranbania:3000/api/itsm/sla/check` with Bearer token.

---

## Recipe 4: n8n — incident escalation

1. Webhook receives `card.sla_breach`.
2. IF `card.cardType === "incident"` AND `card.priority === "critical"`.
3. HTTP Request to PagerDuty free tier, Discord webhook, or SMS gateway you already use.

---

## Recipe 5: Local dev — test webhooks

```bash
# Terminal 1: webhook receiver
npx -y webhookrelay-cli listen --bucket cranbania

# Terminal 2: register URL
export CRANBANIA_WEBHOOK_URLS="https://hooks.webhookrelay.com/v1/..."

# Terminal 3: dev server
npm run dev

# Move an incident to in_progress or run SLA check
curl -X POST http://localhost:3000/api/itsm/sla/check
```

---

## Maven / Gradle?

**Not applicable.** CranBania is a Node.js / Next.js app. Use `npm` scripts:

| Task | Command |
|------|---------|
| Dev | `npm run dev` |
| Test | `npm test` |
| Lint | `npm run lint` |
| MCP server | `npm run mcp` |

---

## What CranBania does not require

- Convex, WorkOS, or cloud DB (JSON files under `data/`)
- Chart libraries (burndown is inline SVG)
- `@dnd-kit` (native select-based moves)
- Paid ITSM or Agile SaaS

See `README.md` and `AGENTS.md` for API reference.
