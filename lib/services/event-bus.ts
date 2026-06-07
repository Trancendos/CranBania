/**
 * In-process event bus — modular hook point for webhooks, Forgejo, n8n, agents.
 */

import {
  dispatchWebhooks,
  type WebhookPayload,
  type WebhookResult,
} from "../webhooks";

export type CardEventSidecar = (payload: WebhookPayload) => Promise<void>;

const sidecarHandlers: CardEventSidecar[] = [];

/** Register extra automation handlers (Forgejo relay, logging, agent triggers). */
export function registerCardEventSidecar(handler: CardEventSidecar): void {
  sidecarHandlers.push(handler);
}

export function listSidecarHandlerCount(): number {
  return sidecarHandlers.length;
}

/**
 * Dispatch webhooks and run sidecar handlers.
 * Returns webhook HTTP results for journal audit entries.
 */
export async function emitCardEvent(
  payload: WebhookPayload,
): Promise<WebhookResult[]> {
  const results = await dispatchWebhooks(payload);
  await Promise.all(sidecarHandlers.map((h) => h(payload)));
  return results;
}
