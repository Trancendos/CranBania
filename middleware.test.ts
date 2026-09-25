import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { SESSION_COOKIE, deriveSessionToken, timingSafeEqual } from "./lib/services/auth";

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
  const res = await middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 200);
});

test("mutating routes fail closed in production when the key is unset", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = await middleware(req("/api/cards", { method: "POST" }));
  assert.equal(res.status, 503);
});

test("cron-exempt route is not 503'd in production when the API key is unset", async () => {
  // It authenticates with CRANBANIA_CRON_SECRET, so a missing CRANBANIA_API_KEY says
  // nothing about whether it is safe to serve. Gating it on the wrong secret would
  // silently stop SLA scans on a correctly configured deployment.
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = await middleware(req("/api/itsm/sla/check", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("the cron exemption stays method-scoped on the production fail-closed path", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = await middleware(req("/api/itsm/sla/check", { method: "PUT" }));
  assert.equal(res.status, 503);
});

test("reads also fail closed in production when the key is unset", async () => {
  // Was 200 while there was no session mechanism a browser could use. #35
  // supplies one, so an unset key in production now denies reads too rather
  // than leaving every board readable to anyone who finds the URL.
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = await middleware(req("/api/board", { method: "GET" }));
  assert.equal(res.status, 503);
});

test("non-API routes are unaffected by the production fail-closed path", async () => {
  delete process.env.CRANBANIA_API_KEY;
  setNodeEnv("production");
  const res = await middleware(req("/board", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("read routes are gated once the key is set", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const denied = await middleware(req("/api/board", { method: "GET" }));
  assert.equal(denied.status, 401);

  const allowed = await middleware(
    req("/api/board", {
      method: "GET",
      headers: { Authorization: "Bearer test-key" },
    }),
  );
  assert.equal(allowed.status, 200);
});

test("mutating routes are gated when the key is set", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const denied = await middleware(req("/api/cards", { method: "POST" }));
  assert.equal(denied.status, 401);

  const allowed = await middleware(
    req("/api/cards", {
      method: "POST",
      headers: { Authorization: "Bearer test-key" },
    }),
  );
  assert.equal(allowed.status, 200);
});

test("cron-secret POST route is exempt from CRANBANIA_API_KEY", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = await middleware(req("/api/itsm/sla/check", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("the cron exemption is scoped to POST, not the whole path", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  // No handler actually exports PUT for this route (Next 405s it downstream), but the
  // middleware itself must not blanket-exempt the path regardless of method.
  const res = await middleware(req("/api/itsm/sla/check", { method: "PUT" }));
  assert.equal(res.status, 401);
});

test("an unauthenticated page request is redirected to the login page", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = await middleware(req("/board", { method: "GET" }));
  assert.equal(res.status, 307);
  assert.equal(new URL(res.headers.get("location")!).pathname, "/login");
});

test("the session cookie authenticates, and it is not the API key", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const token = await deriveSessionToken("test-key");
  assert.notEqual(token, "test-key");

  const allowed = await middleware(
    req("/api/board", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    }),
  );
  assert.equal(allowed.status, 200);
});

test("a cookie holding the API key itself is refused", async () => {
  // This is what #35 shipped: the cookie WAS the key. Any client holding it
  // could send it as `Authorization: Bearer` on every mutating route. The two
  // credentials are checked on separate paths now, so the key is not a session
  // and a session is not the key.
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = await middleware(
    req("/api/board", {
      method: "GET",
      headers: { cookie: `${SESSION_COOKIE}=test-key` },
    }),
  );
  assert.equal(res.status, 401);
});

test("a session cookie is not accepted as a Bearer token", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const token = await deriveSessionToken("test-key");
  const res = await middleware(
    req("/api/cards", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  assert.equal(res.status, 401);
});

test("the login route stays reachable unauthenticated, or nobody can log in", async () => {
  process.env.CRANBANIA_API_KEY = "test-key";
  const res = await middleware(req("/api/auth/login", { method: "POST" }));
  assert.equal(res.status, 200);
});

test("the derived token is stable, so no server-side session store is needed", async () => {
  assert.equal(await deriveSessionToken("k"), await deriveSessionToken("k"));
  assert.notEqual(await deriveSessionToken("k"), await deriveSessionToken("k2"));
});

test("the container health probe stays open, with and without a key", async () => {
  // The Dockerfile's HEALTHCHECK runs `wget --spider /api/health` with no
  // credential. Gating read routes turned the old probe path (/api/board) into
  // a 401 with the key set and a 503 without it, so every container reported
  // unhealthy while serving traffic normally. (chatgpt-codex-connector)
  process.env.CRANBANIA_API_KEY = "test-key";
  setNodeEnv("production");
  const gated = await middleware(req("/api/health", { method: "GET" }));
  assert.equal(gated.status, 200);

  delete process.env.CRANBANIA_API_KEY;
  const ungated = await middleware(req("/api/health", { method: "GET" }));
  assert.equal(ungated.status, 200);
});

test("the health probe is the only read route left open", async () => {
  // Otherwise the exemption above could widen without anything noticing.
  process.env.CRANBANIA_API_KEY = "test-key";
  setNodeEnv("production");
  for (const path of ["/api/board", "/api/cards", "/api/workspace", "/api/summary"]) {
    const res = await middleware(req(path, { method: "GET" }));
    assert.equal(res.status, 401, `${path} should be gated`);
  }
});

test("timingSafeEqual does not report the secret's length", async () => {
  // It compares a login body against CRANBANIA_API_KEY, whose length is not
  // fixed, so returning early on a length mismatch leaked it. (sourcery-ai)
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
  assert.equal(timingSafeEqual("abc", "abcd"), false);
  assert.equal(timingSafeEqual("abcd", "abc"), false);
  assert.equal(timingSafeEqual("", ""), true);
  assert.equal(timingSafeEqual("", "a"), false);
});
