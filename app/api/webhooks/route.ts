import { NextRequest, NextResponse } from "next/server";
import { readWebhooks } from "@/lib/webhooks";
import { registerWebhook } from "@/lib/webhook-register";
import { webhookRegisterSchema } from "@/lib/schemas/card";
import type { WebhookEvent } from "@/lib/types";

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

  const webhook = await registerWebhook({
    url: parsed.data.url,
    enabled: parsed.data.enabled ?? true,
    secret: parsed.data.secret,
    events: parsed.data.events as WebhookEvent[],
  });
  return NextResponse.json({ webhook }, { status: 201 });
}
