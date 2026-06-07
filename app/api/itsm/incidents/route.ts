import { NextResponse } from "next/server";
import { listCardsByType } from "@/lib/board";
import { computeSlaStatus } from "@/lib/sla";

export async function GET() {
  const incidents = await listCardsByType("incident");
  return NextResponse.json({
    incidents: incidents.map((c) => ({
      card: c,
      sla: computeSlaStatus(c),
    })),
  });
}
