import { NextRequest, NextResponse } from "next/server";
import { listWorkshopTemplates } from "@/lib/workshop";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const valid = [
    "brainstorm",
    "retro",
    "analysis",
    "planning",
    "roadmap",
    "timeline",
    "design",
  ] as const;
  if (category && !valid.includes(category as (typeof valid)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const templates = listWorkshopTemplates(
    category ? { category: category as (typeof valid)[number] } : undefined,
  ).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    purpose: t.purpose,
    zones: t.zones.map((z) => ({ id: z.id, label: z.label, hint: z.hint })),
    suggestedCardTypes: t.suggestedCardTypes,
    keywords: t.keywords,
  }));

  return NextResponse.json({ templates });
}
