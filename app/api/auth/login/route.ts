import { NextRequest, NextResponse } from "next/server";
import { inProduction } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiKey = process.env.CRANBANIA_API_KEY;

  if (!apiKey || apiKey !== body.apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("cranbania_session", apiKey, {
    httpOnly: true,
    secure: inProduction(),
    sameSite: "lax",
    path: "/",
  });

  return response;
}
