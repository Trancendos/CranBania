/**
 * Optional API-key auth (CranBania equivalent of auth-setup — no WorkOS/Convex).
 * When env vars are unset, routes stay open (local dev). Set in production.
 */

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

/** Returns true if request is authorized (or auth is disabled). */
export function verifyCronAuth(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return true;
  return extractBearerToken(request) === secret;
}

export function verifyApiAuth(request: Request): boolean {
  const key = getApiKey();
  if (!key) return true;
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
