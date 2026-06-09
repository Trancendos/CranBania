import { NextRequest, NextResponse } from "next/server";
import { startWorkshopSchema } from "@/lib/schemas/workshop";
import { startWorkshopFromCard } from "@/lib/workshop";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = startWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const board = await startWorkshopFromCard(parsed.data);
  if (!board) {
    return NextResponse.json({ error: "Card or template not found" }, { status: 404 });
  }

  return NextResponse.json({ board }, { status: 201 });
}
