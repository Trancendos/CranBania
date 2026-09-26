import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  deriveSessionToken,
  getApiKey,
  inProduction,
  secretsMatch,
} from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Not 401: there is no credential that could succeed here, so telling the
    // caller their key was wrong would send them looking in the wrong place.
    return NextResponse.json(
      {
        error: "Service misconfigured",
        hint: "CRANBANIA_API_KEY is not set, so no session can be issued.",
      },
      { status: 503 },
    );
  }

  let submitted: unknown;
  try {
    submitted = (await request.json())?.apiKey;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  if (typeof submitted !== "string") {
    return NextResponse.json({ error: "Expected { apiKey: string }" }, { status: 400 });
  }

  if (!(await secretsMatch(submitted, apiKey))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  // The derived token, never the key itself — see deriveSessionToken.
  response.cookies.set(SESSION_COOKIE, await deriveSessionToken(apiKey), {
    httpOnly: true,
    secure: inProduction(),
    sameSite: "strict",
    path: "/",
  });
  return response;
}
