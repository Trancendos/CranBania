# CranBania — Security Advisory Dispositions

Standing record of `npm audit` findings that remain open after remediation, with the
reasoning for each. Reviewed whenever the lockfile changes or a new advisory lands.

**Last reviewed:** 2026-09-25 (PR #45)

## Summary

| Date | Total | Fixed | Accepted |
|---|---|---|---|
| 2026-07-31 (before) | 11 (2 low, 2 moderate, 7 high) | — | — |
| 2026-07-31 (after) | 3 high | 8 | 3 |
| 2026-09-11 (before) | 1 critical | — | — |
| 2026-09-11 (after) | 3 high | 1 | 3 |
| 2026-09-25 (before) | 3 high | — | — |
| 2026-09-25 (after) | 0 | 3 | 0 |

`npm audit fix` moved Next.js from 15.5.19 to 15.5.22, closing all eight advisories
filed against Next.js itself — including *Unauthenticated disclosure of internal Server
Function endpoints* (GHSA-955p-x3mx-jcvp), the SSRF pair, and the Server Actions DoS —
plus the js-yaml quadratic-CPU advisory. The build, the 38-test suite and the Docker
image were all re-verified against the new lockfile.

**2026-09-11 update:** Next.js was upgraded from 15.5.23 to 15.5.25 to remediate
GHSA-2xp9-vwfh-vxw4, a critical remote code execution vulnerability in image optimization
affecting AVIF file processing via the underlying libheif library.

**2026-09-25 update (PR #45):** Dependency updates from PRs #21 and #22 resolved the three
remaining high-severity findings (`hono` 4.13.3 → 4.13.9, `js-yaml` 4.3.1 → 4.3.2,
`qs` 6.15.2 → 6.16.0, `side-channel` 1.1.0 → 1.1.1). `npm audit` reports **0 vulnerabilities**.

## Previously accepted findings

All three previously accepted findings (`sharp` <0.35.0, `postcss` ≤8.5.17, and the
derived `next` entry) were resolved by dependency updates in PR #45 (incorporating
PRs #21 and #22). No findings remain open.

## Remediated Next.js advisories

### GHSA-2xp9-vwfh-vxw4 — Remote code execution in AVIF processing (critical)

- **CVE:** None assigned
- **Severity:** Critical
- **Description:** A vulnerability in the underlying `libheif` library used by `sharp` which
  Next.js uses for image optimization can lead to remote code execution when AVIF files are
  optimized. Until a fix propagated, optimization of AVIF files was disabled by the Next.js
  team.
- **Affected versions:** < 15.5.25
- **Remediation:** Upgraded Next.js from 15.5.23 to 15.5.25 on 2026-09-11
- **Status:** Resolved

## Review triggers

Re-run `npm audit` and revisit this file when:

- `package-lock.json` changes for any reason;
- a new advisory lands for any dependency;
- this application starts using `next/image` (image optimization path);
- any user-supplied content reaches the CSS pipeline (PostCSS attack surface).
