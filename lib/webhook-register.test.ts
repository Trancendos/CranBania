import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import {
  registerWebhook,
  ensureWorkshopWebhookRegistered,
  ALL_WEBHOOK_EVENTS,
} from "./webhook-register";
import { readWebhooks } from "./webhooks";

test("webhook registration workflow", async () => {
  // Use dependency injection via mocking `fs` to isolate file operations.
  // This avoids altering `process.cwd()` which can cause issues with test runners.
  let webhookFile = JSON.stringify({ webhooks: [] });
  mock.method(fs, "readFile", async () => webhookFile);
  mock.method(fs, "writeFile", async (_path: any, data: any) => { webhookFile = data; });
  mock.method(fs, "mkdir", async () => {});

  try {
    // 1. Register a webhook with default values
    // Using correct object signature for `registerWebhook`
    const hook1 = await registerWebhook({ url: "https://example.com/hook1" });
    assert.equal(hook1.url, "https://example.com/hook1");
    assert.equal(hook1.enabled, true);
    assert.deepEqual(hook1.events, ALL_WEBHOOK_EVENTS);
    assert.equal(hook1.secret, undefined);

    // Verify it was written to file
    let hooks = await readWebhooks();
    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].id, hook1.id);

    // 2. Register a webhook with custom values
    const hook2 = await registerWebhook({
      url: "https://example.com/hook2",
      enabled: false,
      events: ["card.in_progress"],
      secret: "my-secret",
    });
    assert.equal(hook2.url, "https://example.com/hook2");
    assert.equal(hook2.enabled, false);
    assert.deepEqual(hook2.events, ["card.in_progress"]);
    assert.equal(hook2.secret, "my-secret");

    hooks = await readWebhooks();
    assert.equal(hooks.length, 2);

    // 3. Ensure workshop webhook registered (should create new)
    const hook3 = await ensureWorkshopWebhookRegistered("https://example.com/workshop");
    assert.ok(hook3);
    assert.equal(hook3.url, "https://example.com/workshop");
    assert.ok(hook3.events.includes("workshop.completed"));

    hooks = await readWebhooks();
    assert.equal(hooks.length, 3);

    // 4. Ensure workshop webhook registered (should return existing)
    const hook4 = await ensureWorkshopWebhookRegistered("https://example.com/workshop");
    assert.ok(hook4);
    assert.equal(hook4.id, hook3.id); // Same ID

    hooks = await readWebhooks();
    assert.equal(hooks.length, 3); // Still 3 hooks
  } finally {
    mock.restoreAll();
  }
});
