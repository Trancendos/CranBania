import { NextRequest, NextResponse } from "next/server";
import { readWebhooks, writeWebhooks } from "@/lib/webhooks";
import { webhookRegisterSchema } from "@/lib/schemas/card";
import type { WebhookEvent } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET() {
  const webhooks = await readWebhooks();
  return NextResponse.json({ webhooks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = webhookRegisterSchema.safeParse(body);
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
    events: parsed.data.events as WebhookEvent[],
    secret: parsed.data.secret,
  };
  await writeWebhooks([...fileWebhooks, webhook]);
  return NextResponse.json({ webhook }, { status: 201 });
}
