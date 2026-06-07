# CranBania automation (zero-cost)

**Recommended order** — no GitHub Actions required:

1. **Built-in sidecar** — `npm run sla:poll` (adaptive, self-hosted)
2. **App + poller** — `npm run start:full` after `npm run build`
3. **Forgejo Actions** — `.forgejo/workflows/cranbania-sla-check.yml` (self-hosted forge)
4. **Woodpecker CI** — `.woodpecker/cranbania-sla.yaml`
5. **n8n schedule** — POST `/api/itsm/sla/check` or run `npm run sla:poll:once`
6. **systemd timer** — on your VM (see below)

GitHub Actions remains optional for teams already on github.com — not required.

## Prerequisites

```bash
# Optional
export CRANBANIA_WEBHOOK_URLS="https://your-n8n.example/webhook/cranbania"
export CRANBANIA_CRON_SECRET="random-secret"   # protects POST /api/itsm/sla/check
export CRANBANIA_API_KEY="api-key"             # protects POST/PATCH/DELETE /api/* (middleware)
export CRANBANIA_SLA_POLL_INTERVAL_MS=60000    # default tick for npm run sla:poll (sidecar)
export CRANBANIA_SLA_WARNING_PERCENT=25        # card.sla_warning in final 25% of SLA window

# Forgejo agent dispatch (optional — triggers workflows on card events)
export FORGEJO_URL="https://forge.example"
export FORGEJO_OWNER="your-org"
export FORGEJO_REPO="cranbania"
export FORGEJO_TOKEN="your-forgejo-token"
export FORGEJO_REF="main"
```

Check automation health:

```bash
curl -s http://localhost:3000/api/automation/status | jq .
```

Mutating API example (when `CRANBANIA_API_KEY` is set):

```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Authorization: Bearer $CRANBANIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Agent task","cardType":"task"}'
```

Register webhooks:

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-n8n.example/webhook/cranbania",
    "events": ["card.in_progress", "card.sla_warning", "card.sla_breach"]
  }'
```

---

## Recipe 1 (recommended): Built-in SLA poller sidecar

Runs adaptive scans without any CI platform:

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — SLA poller (adjusts 30s–10min based on breach/warning activity)
npm run sla:poll
```

Single tick (for external cron):

```bash
npm run sla:poll:once
# {"notified":0,"warningsNotified":0,"nextIntervalMs":69000,"checkedAt":"..."}
```

---

## Recipe 2: Production app + poller (`start:full`)

For production on a long-running Node server — **two processes, one command**:

```bash
export CRANBANIA_API_KEY="your-key"   # recommended in production
npm run build && npm run start:full
```

This runs `next start` and `npm run sla:poll` together. Sidecars (Forgejo dispatch) register lazily on the first card event.

> **Note:** SLA polling is intentionally **not** bundled into the Next.js webpack build. Use the sidecar or external cron — keeps `fs`/`crypto` out of the app bundle.

---

## Recipe 3: Forgejo Actions (self-hosted)

If you host code on [Forgejo](https://forgejo.org/) (Gitea fork), commit:

`.forgejo/workflows/cranbania-sla-check.yml` (included in repo)

Forgejo secrets (repository settings):

| Secret | Value |
|--------|--------|
| `CRANBANIA_URL` | `https://cranbania.yourdomain.com` |
| `CRANBANIA_CRON_SECRET` | same as server env |

Enable Actions in Forgejo admin. Workflow runs every 5 minutes and POSTs to `/api/itsm/sla/check`.

**Forgejo vs GitHub:** same YAML shape; Forgejo uses `.forgejo/workflows/` and your own runners — no github.com dependency.

---

## Recipe 3b: Woodpecker CI (self-hosted)

Pipelines in `.woodpecker/`:

| File | Purpose |
|------|---------|
| `cranbania-sla.yaml` | Cron every 5 min → POST `/api/itsm/sla/check` |
| `cranbania-agent.yaml` | Manual smoke test + automation status |

Woodpecker secrets: `cranbania_url`, `cranbania_cron_secret`, optional `cranbania_api_key`.

Enable both pipelines in your Woodpecker project. Works alongside Forgejo on the same repo.

---

## Recipe 3c: Forgejo agent dispatch (built-in)

When a card fires `card.in_progress` or `card.sla_breach`, CranBania can **automatically dispatch** Forgejo workflows (no separate relay script).

Set env on the CranBania server:

```bash
export FORGEJO_URL="https://forge.example"
export FORGEJO_OWNER="team"
export FORGEJO_REPO="cranbania"
export FORGEJO_TOKEN="..."
export FORGEJO_REF="main"
# optional overrides:
# FORGEJO_WORKFLOW_IN_PROGRESS=cranbania-agent.yml
# FORGEJO_WORKFLOW_SLA_BREACH=cranbania-sla-agent.yml
```

Workflows included:

- `.forgejo/workflows/cranbania-agent.yml` — agent runner on in_progress
- `.forgejo/workflows/cranbania-sla-agent.yml` — escalation on SLA breach

Verify: `curl -s http://localhost:3000/api/automation/status | jq .integrations.forgejo`

---

## Recipe 4: systemd timer (Linux VM)

`/etc/systemd/system/cranbania-sla.service`:

```ini
[Unit]
Description=CranBania SLA breach check

[Service]
Type=oneshot
Environment=CRANBANIA_URL=http://127.0.0.1:3000
Environment=CRANBANIA_CRON_SECRET=your-secret
ExecStart=/usr/bin/curl -sf -X POST ${CRANBANIA_URL}/api/itsm/sla/check -H "Authorization: Bearer ${CRANBANIA_CRON_SECRET}"
```

`/etc/systemd/system/cranbania-sla.timer`:

```ini
[Unit]
Description=Run CranBania SLA check every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now cranbania-sla.timer
```

Or invoke the sidecar directly:

```ini
ExecStart=/usr/bin/npm run sla:poll:once --prefix /opt/cranbania
```

---

## Recipe 5: n8n — webhooks + schedule

**Webhook receiver:** filter `X-CranBania-Event: card.sla_warning` or `card.sla_breach` → Slack/email.

**Schedule:** every 5 min → HTTP POST `/api/itsm/sla/check` with Bearer token.

---

## Recipe 6: Agent on `card.in_progress`

**Built-in (recommended):** set `FORGEJO_*` env vars — CranBania registers the `forgejo-workflow-dispatch` sidecar on the first card event.

**Alternatives:** n8n webhook receiver, or custom sidecar:

```typescript
import { registerCardEventSidecar } from "@/lib/services/event-bus";

registerCardEventSidecar("my-agent", async (payload) => {
  if (payload.event !== "card.in_progress") return;
  await fetch(process.env.MY_AGENT_URL!, {
    method: "POST",
    body: JSON.stringify(payload),
  });
});
```

MCP agents can also call `run_sla_check` or `get_automation_status` without HTTP.

---

## Webhook events

| Event | When |
|-------|------|
| `card.in_progress` | Card enters In Progress |
| `card.sla_warning` | Final `CRANBANIA_SLA_WARNING_PERCENT` of SLA window (default 25%) |
| `card.sla_breach` | SLA due passed (once per card) |

---

## Optional: GitHub Actions

Only if you already use github.com — see git history for examples. Prefer Recipes 1–3 for zero vendor lock-in.

---

## Tooling note

| Tool | Use with CranBania? |
|------|---------------------|
| Node / npm | **Yes** — primary stack |
| Forgejo | **Yes** — CI cron + **workflow dispatch sidecar** |
| Woodpecker | **Yes** — `.woodpecker/*.yaml` cron pipelines |
| Maven / Gradle | **No** |
| Convex / WorkOS | **No** — see `docs/architecture.md` |
