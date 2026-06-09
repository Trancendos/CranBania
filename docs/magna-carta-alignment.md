# CranBania ↔ Magna Carta alignment

CranBania implements the [Trancendos Magna Carta](https://github.com/Trancendos/Magna-Carta) **zero-cost sovereignty** and **governance-lite** principles. This document maps CranBania controls to Magna Carta layers — **documentation alignment**, not ISO/SOC certification.

## Maturity (honest)

| Layer | CranBania status |
|-------|------------------|
| Magna Carta programme artefacts | ✅ This doc + STRATEGY mandate |
| Operational certification (ISO 27001, SOC 2) | 🎯 Out of CranBania scope — see Magna Carta repo |
| Tranc3 runtime enforcement (`MAGNA_CARTA_ENABLED`) | N/A — CranBania is separate product |

## Principle mapping

| Magna Carta principle | CranBania implementation |
|----------------------|---------------------------|
| **Zero-cost sovereignty** | JSON storage, no paid SaaS APIs, self-hosted Next.js |
| **Transparency** | Card journal, workshop outcomes on tickets, export v3 |
| **Minimisation** | Local `data/` only; gitignored runtime files |
| **Security by default** | Optional `CRANBANIA_API_KEY` / `CRANBANIA_CRON_SECRET` |
| **Accountability** | Journal entries, webhooks, Prince2-lite stages |
| **Human agency** | Workshops populated by humans/agents; heuristic fill is assistive only |
| **Change control** (POL-OPS-002) | Git + Forgejo/Woodpecker CI; no direct prod edits |
| **Incident response** (POL-OPS-001) | `cardType: incident`, SLA timers, `/incidents` queue |
| **Backup / portability** (PROC-BKP) | `GET /api/export`, visual board `GET .../export` |
| **AI governance** (POL-AI-001) | MCP tools; no embedded paid LLM; external agent optional |

## Control traceability (selected)

| Magna Carta / ISO theme | CranBania artefact |
|-------------------------|-------------------|
| Access control | `middleware.ts`, `lib/services/auth.ts` |
| Audit logging | Card `journal[]`, webhook journal entries |
| Change management | Git PRs, `.forgejo/workflows/cranbania-ci.yml` |
| SLA / operations | `lib/sla-monitor.ts`, `npm run sla:poll` |
| Data export (DSR helper) | `GET /api/export`, `POST /api/import` |
| Supplier / sub-processor | **None required** for core — npm OSS only |
| Workshop automation evidence | `workshop.completed` webhook (opt-in register) |

## Explicit non-goals (Magna Carta + STRATEGY)

- Full CMDB / ServiceNow parity — use tags + export JSON
- Paid Lucid/Miro/Figma sync — use CranBania JSON import/export
- Built-in cloud LLM — use Cursor MCP or `useHeuristicPopulate` (rule-based, £0)
- Real-time CRDT cursors — poll-based presence only (`/api/visual-boards/:id/presence`)

## Registering workshop webhooks (POL-OPS evidence)

```bash
# All events including workshop.completed
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url":"http://127.0.0.1:9999/hook","events":["card.in_progress","card.sla_warning","card.sla_breach","workshop.completed"]}'

# Or bootstrap script
CRANBANIA_WEBHOOK_URL=http://127.0.0.1:9999/hook npm run webhooks:bootstrap
```

MCP: `register_webhook` with optional `events` (defaults to all four).

## Review

- **Owner:** CranBania maintainers  
- **Cross-ref:** [Magna Carta FRAMEWORK.md](https://github.com/Trancendos/Magna-Carta/blob/main/FRAMEWORK.md)  
- **Next review:** Align with Magna Carta quarterly cycle (see Magna Carta README)
