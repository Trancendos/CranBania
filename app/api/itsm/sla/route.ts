import { NextResponse } from "next/server";
import { getSlaReport } from "@/lib/board";

export async function GET() {
  const sla = await getSlaReport();
  return NextResponse.json({ sla });
}
