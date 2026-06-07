/**
 * In-process event bus — modular hook point for webhooks, Forgejo, n8n, agents.
 */

import {
  dispatchWebhooks,
  type WebhookPayload,
  type WebhookResult,
} from "../webhooks";

export type CardEventSidecar = (payload: WebhookPayload) => Promise<void>;

interface SidecarRegistration {
  name: string;
  handler: CardEventSidecar;
}

const sidecarHandlers: SidecarRegistration[] = [];
let sidecarsInitialized = false;

async function ensureAutomationSidecars(): Promise<void> {
  if (sidecarsInitialized) return;
  sidecarsInitialized = true;
  const { registerAutomationSidecars } = await import("../automation/register-sidecars");
  await registerAutomationSidecars();
}

/** Register extra automation handlers (Forgejo relay, logging, agent triggers). */
export function registerCardEventSidecar(
  name: string,
  handler: CardEventSidecar,
): void {
  sidecarHandlers.push({ name, handler });
}

export function listSidecarHandlers(): string[] {
  return sidecarHandlers.map((s) => s.name);
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
  await ensureAutomationSidecars();
  const results = await dispatchWebhooks(payload);
  await Promise.all(
    sidecarHandlers.map(async ({ name, handler }) => {
      try {
        await handler(payload);
      } catch (err) {
        console.warn(`[cranbania] sidecar ${name} failed:`, err);
      }
    }),
  );
  return results;
}
