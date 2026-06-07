# CranBania automation (zero-cost)

**Recommended order** — no GitHub Actions required:

1. **Built-in sidecar** — `npm run sla:poll` (adaptive, self-hosted)
2. **In-process** — `CRANBANIA_SLA_POLL_INTERVAL_MS=60000 npm run start`
3. **Forgejo Actions** — `.forgejo/workflows/cranbania-sla-check.yml` (self-hosted forge)
4. **n8n schedule** — POST `/api/itsm/sla/check` or run `npm run sla:poll:once`
5. **systemd timer** — on your VM (see below)

GitHub Actions remains optional for teams already on github.com — not required.

## Prerequisites

```bash
# Optional
export CRANBANIA_WEBHOOK_URLS="https://your-n8n.example/webhook/cranbania"
export CRANBANIA_CRON_SECRET="random-secret"   # protects POST /api/itsm/sla/check
export CRANBANIA_SLA_POLL_INTERVAL_MS=60000    # enables in-process poller with next start
```

Check automation health:

```bash
curl -s http://localhost:3000/api/automation/status | jq .
```

Register webhooks:

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-n8n.example/webhook/cranbania",
    "events": ["card.in_progress", "card.sla_breach"]
  }'
```

---

## Recipe 1 (recommended): Built-in SLA poller sidecar

Runs adaptive scans without any CI platform:

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — SLA poller (adjusts 30s–10min based on breach activity)
npm run sla:poll
```

Single tick (for external cron):

```bash
npm run sla:poll:once
# {"notified":0,"nextIntervalMs":69000,"checkedAt":"..."}
```

---

## Recipe 2: In-process scheduler (`next start`)

For production on a long-running Node server:

```bash
export CRANBANIA_SLA_POLL_INTERVAL_MS=60000
npm run build && npm run start
```

Next.js loads `instrumentation.ts` and starts the adaptive poller automatically.

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

**Webhook receiver:** filter `X-CranBania-Event: card.sla_breach` → Slack/email.

**Schedule:** every 5 min → HTTP POST `/api/itsm/sla/check` with Bearer token.

---

## Recipe 6: Agent on `card.in_progress`

Point webhook at n8n, a small Node relay, or Forgejo repository_dispatch (if you use Forgejo API). Filter on `card.in_progress` in payload.

Example sidecar registration (in your fork):

```typescript
import { registerCardEventSidecar } from "@/lib/services/event-bus";

registerCardEventSidecar(async (payload) => {
  if (payload.event !== "card.in_progress") return;
  await fetch(process.env.FORGEJO_AGENT_WEBHOOK!, {
    method: "POST",
    body: JSON.stringify(payload),
  });
});
```

---

## Optional: GitHub Actions

Only if you already use github.com — see git history for examples. Prefer Recipes 1–3 for zero vendor lock-in.

---

## Tooling note

| Tool | Use with CranBania? |
|------|---------------------|
| Node / npm | **Yes** — primary stack |
| Forgejo | **Yes** — optional CI cron |
| Maven / Gradle | **No** |
| Convex / WorkOS | **No** — see `docs/architecture.md` |
