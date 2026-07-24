/**
 * GET  /api/conversations  – list conversations
 * POST /api/conversations  – create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  listConversations,
} from "@/lib/store";
import { DEFAULT_MODEL, SUPPORTED_MODELS } from "@/lib/orchestration";
import { checkRateLimit, rateLimitedResponse, getIp } from "@/lib/safety";

export async function GET(request: NextRequest) {
  const { allowed, remaining, resetAt } = checkRateLimit(getIp(request));
  if (!allowed) return rateLimitedResponse(resetAt);

  try {
    const list = await listConversations();
    return NextResponse.json(list, {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json(
      { error: "Failed to list conversations", status: 500 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetAt } = checkRateLimit(getIp(request));
  if (!allowed) return rateLimitedResponse(resetAt);

  try {
    const body = await request.json().catch(() => ({}));
    const model =
      SUPPORTED_MODELS.includes(body?.model) ? body.model : DEFAULT_MODEL;

    const conv = await createConversation(model);
    return NextResponse.json(conv, {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    console.error("[POST /api/conversations]", err);
    return NextResponse.json(
      { error: "Failed to create conversation", status: 500 },
      { status: 500 }
    );
  }
}
