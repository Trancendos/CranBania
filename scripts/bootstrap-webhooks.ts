#!/usr/bin/env tsx
/**
 * Register default webhooks including workshop.completed (zero-cost local receiver).
 *
 * Usage:
 *   npm run webhooks:bootstrap
 *   CRANBANIA_WEBHOOK_URL=http://127.0.0.1:9999/hook npm run webhooks:bootstrap
 */

import { ensureWorkshopWebhookRegistered } from "../lib/webhook-register";

async function main() {
  const url =
    process.env.CRANBANIA_WEBHOOK_URL ??
    process.env.CRANBANIA_WEBHOOK_URLS?.split(",")[0]?.trim();

  if (!url) {
    console.error(
      "Set CRANBANIA_WEBHOOK_URL (or first entry in CRANBANIA_WEBHOOK_URLS) to your receiver URL.",
    );
    console.error(
      'Example: CRANBANIA_WEBHOOK_URL=http://127.0.0.1:9999/hook npm run webhooks:bootstrap',
    );
    process.exit(1);
  }

  const webhook = await ensureWorkshopWebhookRegistered(url);
  console.log(JSON.stringify({ ok: true, webhook }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
