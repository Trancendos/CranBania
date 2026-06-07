import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importWorkspace } from "@/lib/export";
import type { WorkspaceExport } from "@/lib/types";

const schema = z.object({
  data: z.record(z.unknown()),
  mode: z.enum(["merge", "replace"]).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await importWorkspace(
      parsed.data.data as unknown as WorkspaceExport,
      parsed.data.mode ?? "merge",
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}
