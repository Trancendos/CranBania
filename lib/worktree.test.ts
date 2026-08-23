import test from "node:test";
import assert from "node:assert";
import { branchNameForCard } from "./worktree";

test("branchNameForCard sanitizes cardId and prevents command injection elements", () => {
  const result1 = branchNameForCard("normal-1234", "Some Task");
  assert.strictEqual(result1, "card/normal12-some-task");

  const result2 = branchNameForCard("--help", "Inject");
  assert.strictEqual(result2, "card/help-inject");

  const result3 = branchNameForCard("-b", "Inject");
  assert.strictEqual(result3, "card/b-inject");

  const result4 = branchNameForCard("../../etc/passwd", "Inject");
  assert.strictEqual(result4, "card/etcpassw-inject");
});
