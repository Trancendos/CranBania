import test from "node:test";
import assert from "node:assert";
import { branchNameForCard } from "./worktree";

// Card ids are server-generated UUIDs today, so none of these are currently
// reachable. They pin the guard so that stays true if ids ever become
// client-supplied -- which is the only way the two sinks below become live.

test("a real card id is accepted and its branch name is unchanged", () => {
  // A UUID must keep producing the same branch name as before the guard, or
  // every existing card silently moves to a new branch and worktree.
  assert.strictEqual(
    branchNameForCard("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", "Some Task"),
    "card/a1b2c3d4-some-task",
  );
});

test("an id starting with a hyphen is refused, not sanitised", () => {
  // git() passes argv to execFile, so there is no shell -- but "-b" reaching a
  // branch-name position is read by git as a flag.
  assert.throws(() => branchNameForCard("-b", "Inject"), /Unsafe card id/);
  assert.throws(
    () => branchNameForCard("--upload-pack=x", "Inject"),
    /Unsafe card id/,
  );
});

test("a traversal id is refused", () => {
  assert.throws(
    () => branchNameForCard("../../etc/passwd", "Inject"),
    /Unsafe card id/,
  );
  assert.throws(() => branchNameForCard("..", "Inject"), /Unsafe card id/);
});

test("separators and whitespace are refused", () => {
  for (const bad of ["a/b", "a\\b", "a b", "a\tb", "a;b", "a$b", ""]) {
    assert.throws(
      () => branchNameForCard(bad, "x"),
      /Unsafe card id/,
      `expected reject: ${JSON.stringify(bad)}`,
    );
  }
});

test("an absurdly long id is refused", () => {
  assert.throws(
    () => branchNameForCard("a".repeat(200), "x"),
    /Unsafe card id/,
  );
});
