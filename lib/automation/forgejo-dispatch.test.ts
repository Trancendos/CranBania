import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dispatchForgejoWorkflow,
  getForgejoConfig,
  isForgejoConfigured,
} from "./forgejo-dispatch";

test("forgejo not configured by default", () => {
  const prev = { ...process.env };
  delete process.env.FORGEJO_URL;
  delete process.env.FORGEJO_OWNER;
  delete process.env.FORGEJO_REPO;
  delete process.env.FORGEJO_TOKEN;
  assert.equal(isForgejoConfigured(), false);
  Object.assign(process.env, prev);
});

test("dispatchForgejoWorkflow calls Forgejo API", async () => {
  process.env.FORGEJO_URL = "https://forge.example";
  process.env.FORGEJO_OWNER = "team";
  process.env.FORGEJO_REPO = "cranbania";
  process.env.FORGEJO_TOKEN = "secret-token";
  process.env.FORGEJO_WORKFLOW_IN_PROGRESS = "cranbania-agent.yml";

  let capturedUrl = "";
  let capturedBody = "";
  const mockFetch = async (url: string, init?: RequestInit) => {
    capturedUrl = url;
    capturedBody = String(init?.body ?? "");
    return new Response("", { status: 200 });
  };

  const result = await dispatchForgejoWorkflow(
    {
      event: "card.in_progress",
      at: new Date().toISOString(),
      card: {
        id: "card-1",
        title: "Fix login",
        description: "",
        tags: [],
        cardType: "incident",
        priority: "high",
      },
    },
    mockFetch as typeof fetch,
  );

  assert.equal(result.ok, true, result.error ?? "dispatch failed");
  assert.match(capturedUrl, /cranbania-agent\.yml\/dispatches$/);
  assert.match(capturedBody, /card-1/);

  delete process.env.FORGEJO_URL;
  delete process.env.FORGEJO_OWNER;
  delete process.env.FORGEJO_REPO;
  delete process.env.FORGEJO_TOKEN;
  delete process.env.FORGEJO_WORKFLOW_IN_PROGRESS;
});

test("getForgejoConfig maps workflow files per event", () => {
  process.env.FORGEJO_URL = "https://forge.example";
  process.env.FORGEJO_OWNER = "o";
  process.env.FORGEJO_REPO = "r";
  process.env.FORGEJO_TOKEN = "t";
  const cfg = getForgejoConfig();
  assert.ok(cfg);
  assert.equal(cfg!.workflows["card.in_progress"], "cranbania-agent.yml");
  assert.equal(cfg!.workflows["card.sla_breach"], "cranbania-sla-agent.yml");
  delete process.env.FORGEJO_URL;
  delete process.env.FORGEJO_OWNER;
  delete process.env.FORGEJO_REPO;
  delete process.env.FORGEJO_TOKEN;
});
