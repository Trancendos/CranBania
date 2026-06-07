import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readWebhooks, writeWebhooks } from "@/lib/webhooks";
import { randomUUID } from "crypto";

const webhookSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().optional().default(true),
  secret: z.string().optional(),
});

export async function GET() {
  const webhooks = await readWebhooks();
  return NextResponse.json({ webhooks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fileWebhooks = (await readWebhooks()).filter((w) => !w.id.startsWith("env-"));
  const webhook = {
    id: randomUUID(),
    url: parsed.data.url,
    enabled: parsed.data.enabled ?? true,
    events: ["card.in_progress" as const],
    secret: parsed.data.secret,
  };
  await writeWebhooks([...fileWebhooks, webhook]);
  return NextResponse.json({ webhook }, { status: 201 });
}
