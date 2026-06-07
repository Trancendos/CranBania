import { NextResponse } from "next/server";
import { activateSprint } from "@/lib/workspace";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sprint = await activateSprint(id);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }
  return NextResponse.json({ sprint });
}
