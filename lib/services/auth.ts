/**
 * Optional API-key auth (CranBania equivalent of auth-setup — no WorkOS/Convex).
 *
 * When env vars are unset, routes stay open (local dev). In production an unset secret
 * is a misconfiguration rather than a licence to run unauthenticated, so verification
 * fails *closed* instead: no secret means no request can be authorised. Callers surface
 * that as 401 exactly as they do a wrong token — see `isAuthMisconfigured` if a route
 * wants to distinguish the two.
 */

/**
 * Single source of truth for "are we in production?".
 *
 * Exported because `middleware.ts` needs the same answer. Two independent
 * `process.env.NODE_ENV === "production"` comparisons could drift, and the
 * consequence of drift here is not cosmetic: the middleware and the route
 * helpers would disagree about whether a missing secret denies or permits.
 */
export function inProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getCronSecret(): string | undefined {
  return process.env.CRANBANIA_CRON_SECRET;
}

export function getApiKey(): string | undefined {
  return process.env.CRANBANIA_API_KEY;
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const headerKey = request.headers.get("x-cranbania-api-key");
  return headerKey ?? null;
}

/**
 * True when a secret the deployment relies on is absent in production. Routes can use
 * this to answer 503 (fix the deployment) rather than 401 (fix your credential).
 */
export function isAuthMisconfigured(kind: "cron" | "api"): boolean {
  if (!inProduction()) return false;
  return !(kind === "cron" ? getCronSecret() : getApiKey());
}

/**
 * Returns true if request is authorized (or auth is disabled outside production).
 * In production a missing secret denies rather than permits.
 */
export function verifyCronAuth(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return !inProduction();
  return extractBearerToken(request) === secret;
}

export function verifyApiAuth(request: Request): boolean {
  const key = getApiKey();
  if (!key) return !inProduction();
  return extractBearerToken(request) === key;
}

export function authRequiredResponse(kind: "cron" | "api" = "cron") {
  return {
    error: "Unauthorized",
    hint:
      kind === "cron"
        ? "Set Authorization: Bearer $CRANBANIA_CRON_SECRET"
        : "Set Authorization: Bearer $CRANBANIA_API_KEY or X-CranBania-Api-Key",
  };
}
