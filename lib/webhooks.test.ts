import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchWebhooks, readWebhooks, writeWebhooks } from "./webhooks";
import { promises as fs } from "fs";
import path from "path";

test("dispatchWebhooks catches fetch errors", async (t) => {
  const dataDir = path.join(process.cwd(), "data");
  const webhooksPath = path.join(dataDir, "webhooks.json");

  // Setup temp webhooks for testing
  await fs.mkdir(dataDir, { recursive: true });
  await writeWebhooks([
    {
      id: "test-webhook",
      url: "http://invalid.url.that.will.fail",
      enabled: true,
      events: ["card.in_progress"],
    }
  ]);

  // Mock global fetch to throw
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Network error");
  };

  try {
    const payload = {
      event: "card.in_progress" as const,
      at: new Date().toISOString(),
      card: {
        id: "c1",
        title: "Test Card",
        description: "Test Desc",
        tags: [],
      }
    };

    const results = await dispatchWebhooks(payload);

    assert.equal(results.length, 1);
    assert.equal(results[0].webhookId, "test-webhook");
    assert.equal(results[0].ok, false);
    assert.equal(results[0].error, "Network error");

  } finally {
    // Cleanup
    global.fetch = originalFetch;
    await writeWebhooks([]);
  }
});
