import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEpic, listEpics } from "@/lib/workspace";

export async function GET() {
  const epics = await listEpics();
  return NextResponse.json({ epics });
}

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const epic = await createEpic(parsed.data.title, parsed.data.description);
  return NextResponse.json({ epic }, { status: 201 });
}
