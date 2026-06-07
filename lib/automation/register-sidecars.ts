/**
 * Sidecar registration (dynamic imports only — safe for Next.js instrumentation).
 */

let registered = false;

export async function registerAutomationSidecars(): Promise<void> {
  if (registered) return;
  registered = true;

  const forgejo = await import("./forgejo-dispatch");
  if (!forgejo.isForgejoConfigured()) return;

  const { registerCardEventSidecar } = await import("../services/event-bus");
  registerCardEventSidecar(
    "forgejo-workflow-dispatch",
    forgejo.createForgejoDispatchSidecar(),
  );
  console.info("[cranbania] Forgejo workflow dispatch sidecar registered");
}
