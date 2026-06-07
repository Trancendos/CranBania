import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyCronAuth,
  extractBearerToken,
} from "./auth";

test("cron auth open when secret unset", () => {
  const prev = process.env.CRANBANIA_CRON_SECRET;
  delete process.env.CRANBANIA_CRON_SECRET;
  assert.equal(
    verifyCronAuth(new Request("http://x", { method: "POST" })),
    true,
  );
  if (prev) process.env.CRANBANIA_CRON_SECRET = prev;
});

test("cron auth requires bearer when secret set", () => {
  process.env.CRANBANIA_CRON_SECRET = "test-secret";
  assert.equal(
    verifyCronAuth(new Request("http://x", { method: "POST" })),
    false,
  );
  assert.equal(
    verifyCronAuth(
      new Request("http://x", {
        method: "POST",
        headers: { Authorization: "Bearer test-secret" },
      }),
    ),
    true,
  );
  delete process.env.CRANBANIA_CRON_SECRET;
});

test("extractBearerToken from header or api key", () => {
  const req = new Request("http://x", {
    headers: { "X-CranBania-Api-Key": "abc" },
  });
  assert.equal(extractBearerToken(req), "abc");
});
