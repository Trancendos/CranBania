/**
 * Dispatch Forgejo Actions workflows when card events fire.
 * Configure: FORGEJO_URL, FORGEJO_OWNER, FORGEJO_REPO, FORGEJO_TOKEN
 */

import type { WebhookEvent } from "../types";
import type { WebhookPayload } from "../webhooks";

export interface ForgejoConfig {
  baseUrl: string;
  owner: string;
  repo: string;
  token: string;
  ref: string;
  workflows: Partial<Record<WebhookEvent, string>>;
}

export function getForgejoConfig(): ForgejoConfig | null {
  const baseUrl = process.env.FORGEJO_URL?.replace(/\/$/, "");
  const owner = process.env.FORGEJO_OWNER;
  const repo = process.env.FORGEJO_REPO;
  const token = process.env.FORGEJO_TOKEN;
  if (!baseUrl || !owner || !repo || !token) return null;

  return {
    baseUrl,
    owner,
    repo,
    token,
    ref: process.env.FORGEJO_REF ?? "main",
    workflows: {
      "card.in_progress":
        process.env.FORGEJO_WORKFLOW_IN_PROGRESS ?? "cranbania-agent.yml",
      "card.sla_breach":
        process.env.FORGEJO_WORKFLOW_SLA_BREACH ?? "cranbania-sla-agent.yml",
    },
  };
}

export function isForgejoConfigured(): boolean {
  return getForgejoConfig() !== null;
}

export async function dispatchForgejoWorkflow(
  payload: WebhookPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const cfg = getForgejoConfig();
  if (!cfg) return { ok: false, error: "Forgejo not configured" };

  const workflowFile = cfg.workflows[payload.event];
  if (!workflowFile) {
    return { ok: false, error: `No workflow mapped for ${payload.event}` };
  }

  const url = `${cfg.baseUrl}/api/v1/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `token ${cfg.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ref: cfg.ref,
        inputs: {
          event: payload.event,
          card_id: payload.card.id,
          card_title: payload.card.title,
          card_type: payload.card.cardType ?? "",
          priority: payload.card.priority ?? "",
          payload_json: JSON.stringify(payload),
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || res.statusText };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Forgejo dispatch failed",
    };
  }
}

export function createForgejoDispatchSidecar(
  fetchImpl: typeof fetch = fetch,
): (payload: WebhookPayload) => Promise<void> {
  return async (payload) => {
    const result = await dispatchForgejoWorkflow(payload, fetchImpl);
    if (!result.ok && result.error !== "Forgejo not configured") {
      console.warn(
        `[cranbania] Forgejo dispatch ${payload.event} failed:`,
        result.error ?? result.status,
      );
    }
  };
}
