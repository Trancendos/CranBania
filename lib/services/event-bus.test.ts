import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { registerCardEventSidecar, emitCardEvent, type WebhookPayload } from "./event-bus";

describe("event-bus", () => {
  it("should catch sidecar handler errors", async () => {
    const originalConsoleWarn = console.warn;
    const warnCalls: unknown[][] = [];
    console.warn = (...args) => {
      warnCalls.push(args);
    };

    registerCardEventSidecar("failing-sidecar", async () => {
      throw new Error("Sidecar failed intentionally");
    });

    const payload: WebhookPayload = {
      event: "card.in_progress",
      card: {
        id: "test-card-1",
        title: "Test Card",
        cardType: "task",
        status: "in_progress",
        createdAt: new Date().toISOString(),
      },
    };

    // This should resolve without throwing, despite the sidecar failing
    await emitCardEvent(payload);

    console.warn = originalConsoleWarn;

    assert.equal(warnCalls.length, 1);
    const firstCall = warnCalls[0];
    assert.match(String(firstCall[0]), /sidecar failing-sidecar failed/);
    assert.equal((firstCall[1] as Error).message, "Sidecar failed intentionally");
  });
});
