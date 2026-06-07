import { NextResponse } from "next/server";
import { exportWorkspace } from "@/lib/export";

export async function GET() {
  const data = await exportWorkspace();
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="cranbania-export-${Date.now()}.json"`,
    },
  });
}
