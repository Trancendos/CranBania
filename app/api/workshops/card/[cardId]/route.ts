import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/board";
import { listWorkshopsForCard, suggestWorkshopsForCardId } from "@/lib/workshop";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const workshops = await listWorkshopsForCard(cardId);
  const suggestions = await suggestWorkshopsForCardId(cardId, 5);

  return NextResponse.json({ card: { id: card.id, title: card.title }, workshops, suggestions });
}
