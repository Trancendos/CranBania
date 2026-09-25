import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { dispatchWebhooks, writeWebhooks } from "./webhooks";

// As every other suite in lib/: the module resolves data/webhooks.json against
// process.cwd(), so a test that does not move cwd first writes into the real
// repository and, on the way out, leaves whatever it wrote there. #15 ran
// against the working tree and ended by truncating data/webhooks.json to [],
// which deletes a developer's local registrations as a side effect of running
// the suite. The temp-cwd pattern here is the one board/export/visual-board
// already use.
const originalCwd = process.cwd();

test("dispatchWebhooks reports a failing endpoint instead of throwing", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cranbania-webhooks-"));
  process.chdir(tmp);

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("Network error");
  };

  try {
    await writeWebhooks([
      {
        id: "test-webhook",
        url: "http://invalid.url.that.will.fail",
        enabled: true,
        events: ["card.in_progress"],
      },
    ]);

    const results = await dispatchWebhooks({
      event: "card.in_progress" as const,
      at: new Date().toISOString(),
      card: {
        id: "c1",
        title: "Test Card",
        description: "Test Desc",
        tags: [],
      },
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].webhookId, "test-webhook");
    assert.equal(results[0].ok, false);
    assert.equal(results[0].error, "Network error");
  } finally {
    global.fetch = originalFetch;
    process.chdir(originalCwd);
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
