# Third-party GitHub checks (org configuration)

CranBania uses **in-repo** CI where possible (Forgejo Actions, Woodpecker — see `docs/automation-recipes.md`). Several **third-party GitHub Apps** may also report on pull requests. Failures from plan limits or repo scope are **not code defects** and cannot be fixed in this repository.

## Known apps on Trancendos/CranBania

| Check | Typical failure | Fix (org admin) |
|-------|-----------------|-----------------|
| **CodeSlick Security** | `Repository not in Free plan scope — upgrade to scan additional repos` | Upgrade CodeSlick, add this repo to the Free allowlist, or uninstall the GitHub App |
| **Debricked / Vulnerability analysis** | Scan credits exhausted | Upgrade Debricked or disable the app |
| **Orange Pro AI** (test/story checks) | PR analysis limit (50/14 days) | Wait for reset or contact app admin |
| **GitGuardian Security Checks** | Secrets in diff | Fix leaked secrets in code (real failure) |
| **CodeRabbit** | Review skipped / pass | Informational |

## When a check fails but the PR diff is unrelated

1. Confirm **in-repo** validation: `npm test`, `npm run lint`, `npm run build`.
2. Read the check summary — plan/scope/credit messages point to **SaaS configuration**, not application bugs.
3. Org admin: adjust app installation, upgrade plan, or remove unused apps from the repo/org.
4. If branch protection requires the check: either fix org config or merge with admin override when other gates pass.

## PR #1 precedent (2026-06-07)

[PR #1](https://github.com/Trancendos/CranBania/pull/1) added initial `AGENTS.md`. **CodeSlick Security** failed on Free-plan scope; GitGuardian passed. Merged with admin override after marking the draft ready — no code change required.
