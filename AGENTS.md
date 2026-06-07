# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project status

**CranBania** is a Kanban board application at **initial-commit stage**. The repository currently contains only `README.md` — no application code, package manifests, Docker config, or CI workflows yet.

When application code is added, update this file with stack-specific run/lint/test commands.

## Cursor Cloud specific instructions

### Runnable services

There are **no services to start** until the application is scaffolded. No dev server, API, database, or Docker Compose stack exists in the repo.

### Toolchain available on the VM

The cloud VM includes:

- **Node.js** (via nvm) with `npm`, `pnpm`, and `yarn`
- **Python 3**
- **Git**

No project-level dependency installation is required until a `package.json`, `requirements.txt`, or similar manifest is committed.

### VM startup (update script)

The update script is a no-op (`true`) because the repo has no installable dependencies yet. When dependencies are added, extend the update script accordingly (e.g. `npm install`, `pnpm install`).

### Lint / test / build / run

Not applicable until application code and scripts exist. After scaffolding, document the standard commands here (e.g. `npm run dev`, `npm test`, `npm run lint`).

### Gotchas

- Do not assume a tech stack from the README alone; confirm `package.json` or other manifests before choosing frameworks.
- If Docker is introduced later, nested Docker in Cloud Agent VMs may need `fuse-overlayfs` and `iptables-legacy` (see platform docs).
