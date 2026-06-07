import { NextResponse } from "next/server";
import { listCardsByType } from "@/lib/board";
import { computeSlaStatus } from "@/lib/sla";

export async function GET() {
  const changes = await listCardsByType("change");
  return NextResponse.json({
    changes: changes.map((c) => ({
      card: c,
      sla: computeSlaStatus(c),
    })),
  });
}
