import { promises as fs } from "fs";
import path from "path";
import type { WebhookConfig, WebhookEvent, WebhooksFile } from "./types";
import type { SlaStatus } from "./types";

function webhooksPath() {
  return path.join(process.cwd(), "data", "webhooks.json");
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

const DEFAULT_EVENTS: WebhookEvent[] = [
  "card.in_progress",
  "card.sla_warning",
  "card.sla_breach",
];

export async function readWebhooks(): Promise<WebhookConfig[]> {
  await ensureDataDir();
  const fromEnv = process.env.CRANBANIA_WEBHOOK_URLS;
  const envWebhooks: WebhookConfig[] = fromEnv
    ? fromEnv.split(",").map((url, i) => ({
        id: `env-${i}`,
        url: url.trim(),
        enabled: true,
        events: DEFAULT_EVENTS,
      }))
    : [];

  try {
    const raw = await fs.readFile(webhooksPath(), "utf-8");
    const parsed = JSON.parse(raw) as WebhooksFile;
    return [...(parsed.webhooks ?? []), ...envWebhooks];
  } catch {
    if (envWebhooks.length > 0) return envWebhooks;
    return [];
  }
}

export async function writeWebhooks(webhooks: WebhookConfig[]): Promise<void> {
  await ensureDataDir();
  const file: WebhooksFile = { webhooks };
  await fs.writeFile(webhooksPath(), JSON.stringify(file, null, 2), "utf-8");
}

export interface WebhookCardPayload {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  tags: string[];
  cardType?: string;
  priority?: string;
  slaDueAt?: string;
  worktree?: { path: string; branch: string };
}

export interface WebhookPayload {
  event: WebhookEvent;
  at: string;
  card: WebhookCardPayload;
  sla?: SlaStatus;
}

export interface WebhookResult {
  webhookId: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

export async function dispatchWebhooks(
  payload: WebhookPayload,
): Promise<WebhookResult[]> {
  const webhooks = await readWebhooks();
  const active = webhooks.filter(
    (w) => w.enabled && w.events.includes(payload.event),
  );

  const results = await Promise.all(
    active.map(async (webhook) => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "CranBania/0.5",
          "X-CranBania-Event": payload.event,
        };
        if (webhook.secret) {
          headers["X-CranBania-Secret"] = webhook.secret;
        }
        const res = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        return {
          webhookId: webhook.id,
          url: webhook.url,
          ok: res.ok,
          status: res.status,
        };
      } catch (err) {
        return {
          webhookId: webhook.id,
          url: webhook.url,
          ok: false,
          error: err instanceof Error ? err.message : "Webhook failed",
        };
      }
    }),
  );

  return results;
}
