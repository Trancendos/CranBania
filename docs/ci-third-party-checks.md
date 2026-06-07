# Third-party GitHub checks (org configuration)

CranBania uses **Forgejo Actions** and **Woodpecker** for in-repo CI — see `.forgejo/workflows/cranbania-ci.yml` and `.woodpecker/cranbania-ci.yaml`. **Do not add GitHub Actions** (`.github/workflows/`); that violates the £0 mandate and can incur github.com Actions minutes.

Several **third-party GitHub Apps** may still report on pull requests when the repo is mirrored or hosted on github.com. Failures from plan limits or repo scope are **not code defects** and cannot be fixed in this repository.

## Known apps on Trancendos/CranBania

| Check | Typical failure | Fix (org admin) |
|-------|-----------------|-----------------|
| **CodeSlick Security** | `Repository not in Free plan scope — upgrade to scan additional repos` | Upgrade CodeSlick, add this repo to the Free allowlist, or uninstall the GitHub App |
| **Debricked / Vulnerability analysis** | Scan credits exhausted | Upgrade Debricked or disable the app |
| **Orange Pro AI** (test/story checks) | PR analysis limit (50/14 days) | Wait for reset or contact app admin |
| **GitGuardian Security Checks** | Secrets in diff | Fix leaked secrets in code (real failure) |
| **CodeRabbit** | Review skipped / pass | Informational |

## When a check fails but the PR diff is unrelated

1. Confirm **in-repo** validation on Forgejo/Woodpecker or locally: `npm test`, `npm run lint`, `npm run build`.
2. Read the check summary — plan/scope/credit messages point to **SaaS configuration**, not application bugs.
3. Org admin: adjust app installation, upgrade plan, or remove unused apps from the repo/org.
4. If branch protection requires the check: either fix org config or merge with admin override when Forgejo CI passes.

## PR #1 precedent (2026-06-07)

[PR #1](https://github.com/Trancendos/CranBania/pull/1) added initial `AGENTS.md`. **CodeSlick Security** failed on Free-plan scope; GitGuardian passed. Merged with admin override after marking the draft ready — no code change required.

## Removed: GitHub Actions CI (2026-06-07)

A `.github/workflows/ci.yml` was added in error and **removed**. CranBania CI belongs on Forgejo/Woodpecker only.
