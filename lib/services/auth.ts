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

/** Name of the browser session cookie the dashboard authenticates with. */
export const SESSION_COOKIE = "cranbania_session";

/**
 * The session cookie holds a value *derived* from the API key, never the key.
 *
 * Storing the key itself would hand every browser that logs in the platform's
 * shared secret in a cookie the page's own scripts sit beside — and that key is
 * accepted as `Authorization: Bearer` on every mutating route, by any client,
 * from anywhere. A derived token is accepted on one path only (the cookie), so
 * a leaked cookie replays as a browser session and nothing else.
 *
 * HMAC-SHA256 over a fixed label, keyed by the API key: one-way, so the cookie
 * does not yield the key, and stable, so no server-side session store is needed
 * for what is still a single shared credential. This is a stopgap that should
 * be replaced by Infinity-One, the platform-wide SSO layer, not a session
 * system in its own right.
 *
 * WebCrypto rather than node:crypto because middleware runs on the Edge
 * runtime, where `crypto.subtle` is what exists. It is also present in Node 18+,
 * so the route handlers and the tests use the same function.
 */
const SESSION_TOKEN_LABEL = "cranbania-session-v1";

export async function deriveSessionToken(apiKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(SESSION_TOKEN_LABEL),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison.
 *
 * `===` on a secret returns as soon as two bytes differ, so the time it takes
 * to reject a guess reports how much of the guess was right. Both values here
 * are fixed-length hex, so comparing every character costs nothing.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
