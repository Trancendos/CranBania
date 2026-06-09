import { randomUUID } from "crypto";
import type { WebhookConfig, WebhookEvent } from "./types";
import { readWebhooks, writeWebhooks } from "./webhooks";

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  "card.in_progress",
  "card.sla_warning",
  "card.sla_breach",
  "workshop.completed",
];

export interface RegisterWebhookInput {
  url: string;
  enabled?: boolean;
  secret?: string;
  events?: WebhookEvent[];
}

export async function registerWebhook(
  input: RegisterWebhookInput,
): Promise<WebhookConfig> {
  const fileWebhooks = (await readWebhooks()).filter((w) => !w.id.startsWith("env-"));
  const webhook: WebhookConfig = {
    id: randomUUID(),
    url: input.url,
    enabled: input.enabled ?? true,
    events: input.events ?? ALL_WEBHOOK_EVENTS,
    secret: input.secret,
  };
  await writeWebhooks([...fileWebhooks, webhook]);
  return webhook;
}

export async function ensureWorkshopWebhookRegistered(
  url: string,
): Promise<WebhookConfig | null> {
  const existing = (await readWebhooks()).filter((w) => !w.id.startsWith("env-"));
  const match = existing.find(
    (w) => w.url === url && w.events.includes("workshop.completed"),
  );
  if (match) return match;
  return registerWebhook({
    url,
    events: ALL_WEBHOOK_EVENTS,
  });
}
