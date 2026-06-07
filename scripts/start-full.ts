#!/usr/bin/env npx tsx
/**
 * Production helper: Next.js server + adaptive SLA poller in one command.
 * Usage: npm run build && npm run start:full
 */

import { spawn, type ChildProcess } from "child_process";

const children: ChildProcess[] = [];

function run(label: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[cranbania] ${label} exited (${signal})`);
    } else if (code && code !== 0) {
      console.error(`[cranbania] ${label} exited with code ${code}`);
    }
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[cranbania] starting Next.js + SLA poller (Ctrl+C to stop both)");
run("next", "npm", ["run", "start"]);
run("sla-poller", "npm", ["run", "sla:poll"]);
