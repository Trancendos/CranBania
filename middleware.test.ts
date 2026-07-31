import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function req(path: string, init?: RequestInit) {
  return new NextRequest(new Request(`http://x${path}`, init));
}

let originalApiKey: string | undefined;
let originalNodeEnv: string | undefined;

beforeEach(() => {
  originalApiKey = process.env.CRANBANIA_API_KEY;
  originalNodeEnv = process.env.NODE_ENV;
});

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.CRANBANIA_API_KEY;
  } else {
    process.env.CRANBANIA_API_KEY = originalApiKey;
  }
  if (originalNodeEnv === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  }
});

/** NODE_ENV is readonly in Next's ambient types; tests need to drive it directly. */
function setNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  }
}

test("open when CRANBANIA_API_KEY unset (local dev)", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("development");
  const res = middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 200);
});

test("mutating routes fail closed in production when the key is unset", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = middleware(req("/api/cards", { method: "POST" }));
  assert.equal(res.status, 503);
});

test("cron-exempt route is not 503'd in production when the API key is unset", async () => {
  // It authenticates with CRANBANIA_CRON_SECRET, so a missing CRANBANIA_API_KEY says
  // nothing about whether it is safe to serve. Gating it on the wrong secret would
  // silently stop SLA scans on a correctly configured deployment.
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = middleware(req("/api/itsm/sla/check", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("the cron exemption stays method-scoped on the production fail-closed path", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = middleware(req("/api/itsm/sla/check", { method: "PUT" }));
  assert.equal(res.status, 503);
});

test("reads stay open in production when the key is unset (no session layer to gate on)", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 200);
});

test("non-API routes are unaffected by the production fail-closed path", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = middleware(req("/board", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("GET/read routes stay open even when the key is set (no session mechanism for the browser UI to use)", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 200);
});

test("mutating routes are gated when the key is set", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const denied = middleware(req("/api/cards", { method: "POST" }));
  assert.equal(denied.status, 401);

  const allowed = middleware(
    req("/api/cards", {
      method: "POST",
      headers: { Authorization: "Bearer test-key" },
    }),
  );
  assert.equal(allowed.status, 200);
});

test("cron-secret POST route is exempt from CRANBANIA_API_KEY", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/api/itsm/sla/check", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("the cron exemption is scoped to POST, not the whole path", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  // No handler actually exports PUT for this route (Next 405s it downstream), but the
  // middleware itself must not blanket-exempt the path regardless of method.
  const res = middleware(req("/api/itsm/sla/check", { method: "PUT" }));
  assert.equal(res.status, 401);
});

test("non-API routes are never gated", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = middleware(req("/board", { method: "GET" }));
  assert.equal(res.status, 200);
});
