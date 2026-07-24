/**
 * POST /api/conversations/[id]/feedback
 *
 * Store a thumb-up or thumb-down for a specific message.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversation, setMessageFeedback } from "@/lib/store";
import { checkRateLimit, rateLimitedResponse, getIp } from "@/lib/safety";
import type { FeedbackRequest } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { allowed, resetAt } = checkRateLimit(getIp(request));
  if (!allowed) return rateLimitedResponse(resetAt);

  const { id } = await params;

  const conv = await getConversation(id);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found", status: 404 },
      { status: 404 }
    );
  }

  let body: FeedbackRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", status: 400 },
      { status: 400 }
    );
  }

  if (!body.messageId || !["up", "down"].includes(body.value)) {
    return NextResponse.json(
      { error: "messageId and value ('up'|'down') are required", status: 400 },
      { status: 400 }
    );
  }

  try {
    await setMessageFeedback(id, body.messageId, body.value);
    console.log(
      `[DIAJOLOGIJA] feedback conv=${id} msg=${body.messageId} value=${body.value}`
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, status: 404 }, { status: 404 });
  }
}
