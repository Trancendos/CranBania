import { NextRequest, NextResponse } from "next/server";
import { suggestWorkshopSchema } from "@/lib/schemas/workshop";
import { suggestWorkshopsForCardId } from "@/lib/workshop";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = suggestWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const suggestions = await suggestWorkshopsForCardId(
    parsed.data.cardId,
    parsed.data.limit ?? 5,
  );
  if (!suggestions) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ suggestions });
}
