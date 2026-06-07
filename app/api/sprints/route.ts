import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSprint, getActiveSprint, listSprints } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const sprints = await listSprints(
    status as "planning" | "active" | "closed" | undefined,
  );
  const active = await getActiveSprint();
  return NextResponse.json({ sprints, active });
}

const schema = z.object({
  name: z.string().min(1),
  goal: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  activate: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const sprint = await createSprint(parsed.data);
  return NextResponse.json({ sprint }, { status: 201 });
}
