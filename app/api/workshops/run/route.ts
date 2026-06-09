import { NextRequest, NextResponse } from "next/server";
import { runWorkshopSchema } from "@/lib/schemas/workshop";
import { runWorkshopForCard } from "@/lib/workshop";
import type { WireframeComponentSpec } from "@/lib/wireframe";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = runWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await runWorkshopForCard({
    ...parsed.data,
    wireframeComponents: parsed.data.wireframeComponents as WireframeComponentSpec[] | undefined,
  });
  if (!result) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(result, { status: 201 });
}
