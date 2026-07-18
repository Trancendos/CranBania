import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function req(path: string, init?: RequestInit) {
  return new NextRequest(new Request(`http://x${path}`, init));
}

test("open when CRANBANIA_API_KEY unset (local dev)", async () => {
  delete process.env.CRANBANIA_API_KEY;
  const res = middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 200);
});

test("GET routes are gated once the key is set (regression: used to bypass reads)", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const denied = middleware(req("/api/board", { method: "GET" }));
  assert.equal(denied.status, 401);

  const allowed = middleware(
    req("/api/board", {
      method: "GET",
      headers: { Authorization: "Bearer test-key" },
    }),
  );
  assert.equal(allowed.status, 200);
  delete process.env.CRANBANIA_API_KEY;
});

test("mutating routes are still gated when the key is set", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/api/cards", { method: "POST" }));
  assert.equal(res.status, 401);
  delete process.env.CRANBANIA_API_KEY;
});

test("cron-secret route is exempt from CRANBANIA_API_KEY regardless of method", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/api/itsm/sla/check", { method: "POST" }));
  assert.equal(res.status, 200);
  delete process.env.CRANBANIA_API_KEY;
});

test("automation/status stays public even when the key is set", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/api/automation/status", { method: "GET" }));
  assert.equal(res.status, 200);
  delete process.env.CRANBANIA_API_KEY;
});

test("non-API routes are never gated", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/board", { method: "GET" }));
  assert.equal(res.status, 200);
  delete process.env.CRANBANIA_API_KEY;
});
