import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import type { WorktreeInfo } from "./types";

const execFileAsync = promisify(execFile);

function worktreesRoot() {
  return path.join(process.cwd(), "data", "worktrees");
}

function repoRoot() {
  return process.cwd();
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function branchNameForCard(cardId: string, title: string): string {
  const short = cardId.slice(0, 8);
  const slug = slugify(title) || "task";
  return `card/${short}-${slug}`;
}

async function git(args: string[], cwd = repoRoot()) {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

export async function isGitRepo(): Promise<boolean> {
  try {
    await git(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

export async function createWorktreeForCard(
  cardId: string,
  title: string,
): Promise<WorktreeInfo> {
  if (!(await isGitRepo())) {
    throw new Error("Not a git repository — cannot create worktree");
  }

  const branch = branchNameForCard(cardId, title);
  const worktreePath = path.join(worktreesRoot(), cardId);
  await fs.mkdir(worktreesRoot(), { recursive: true });

  if (await pathExists(worktreePath)) {
    return {
      path: worktreePath,
      branch,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    await git(["branch", branch, "HEAD"]);
  } catch {
    // branch may already exist
  }

  try {
    await git(["worktree", "add", "-B", branch, worktreePath, "HEAD"]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already checked out")) {
      await git(["worktree", "add", worktreePath, branch]);
    } else {
      throw err;
    }
  }

  return {
    path: worktreePath,
    branch,
    createdAt: new Date().toISOString(),
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function removeWorktreeForCard(
  worktree: WorktreeInfo,
): Promise<void> {
  if (!(await isGitRepo())) return;
  if (!(await pathExists(worktree.path))) return;

  try {
    await git(["worktree", "remove", "--force", worktree.path]);
  } catch {
    await fs.rm(worktree.path, { recursive: true, force: true });
  }
}
