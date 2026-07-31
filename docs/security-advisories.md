# CranBania — Security Advisory Dispositions

Standing record of `npm audit` findings that remain open after remediation, with the
reasoning for each. Reviewed whenever the lockfile changes or a new advisory lands.

**Last reviewed:** 2026-07-31 (Next.js 15.5.19 → 15.5.22)

## Summary

| Date | Total | Fixed | Accepted |
|---|---|---|---|
| 2026-07-31 (before) | 11 (2 low, 2 moderate, 7 high) | — | — |
| 2026-07-31 (after) | 3 high | 8 | 3 |

`npm audit fix` moved Next.js from 15.5.19 to 15.5.22, closing all eight advisories
filed against Next.js itself — including *Unauthenticated disclosure of internal Server
Function endpoints* (GHSA-955p-x3mx-jcvp), the SSRF pair, and the Server Actions DoS —
plus the js-yaml quadratic-CPU advisory. The build, the 38-test suite and the Docker
image were all re-verified against the new lockfile.

## Accepted findings

The three that remain are **transitive dependencies of Next.js**, not direct
dependencies of this application. `npm audit fix --force` reports it would resolve them
by installing `next@9.3.3` — a six-major-version downgrade that would remove the App
Router this application is built on. That is not a remediation, so the findings are
accepted with the mitigations below.

### 1. `sharp` <0.35.0 — libvips CVEs (high)

- **Advisory:** GHSA-f88m-g3jw-g9cj (CVE-2026-33327/33328/35590/35591)
- **Disposition:** ACCEPT — not reachable
- **Reasoning:** `sharp` is an optional Next.js dependency used solely by the
  `/_next/image` optimization endpoint. No component in this application imports
  `next/image` (verified by grep across `app/`, `components/`, `lib/`). As of this
  review `next.config.ts` also sets `images: { unoptimized: true }`, which disables the
  optimizer endpoint outright — so the code path that would reach libvips is not merely
  unused, it is not served. Re-evaluate if `next/image` is ever adopted.

### 2. `postcss` <=8.5.17 — XSS, arbitrary file read, path traversal (high)

- **Advisories:** GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849
- **Disposition:** ACCEPT — build-time only, no attacker-controlled input
- **Reasoning:** All three require attacker-controlled CSS — either a malicious
  `sourceMappingURL` comment or hostile stylesheet content. PostCSS runs at build time
  over this repository's own Tailwind sources, which are trusted and version-controlled.
  It is a `devDependency` path: `next.config.ts` sets `output: "standalone"`, so the
  production image copies runtime dependencies only and PostCSS is not present in the
  running container. There is no runtime path that feeds user input to PostCSS.

### 3. `next` — flagged via the two above (high)

- **Disposition:** ACCEPT — derived finding
- **Reasoning:** `npm audit` attributes this entry to `next` only because it *"depends on
  vulnerable versions of postcss and sharp"*. Every advisory filed against Next.js itself
  was closed by 15.5.22. This entry clears automatically when either dependency above is
  bumped upstream.

## Review triggers

Re-run `npm audit` and revisit this file when:

- `package-lock.json` changes for any reason;
- a Next.js release bumps its bundled `sharp` or `postcss`;
- this application starts using `next/image` (invalidates finding 1);
- any user-supplied content reaches the CSS pipeline (invalidates finding 2).
