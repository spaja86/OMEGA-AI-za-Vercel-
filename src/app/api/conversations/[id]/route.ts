/**
 * GET    /api/conversations/[id]  – get full conversation
 * DELETE /api/conversations/[id]  – delete conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversation, deleteConversation } from "@/lib/store";
import { checkRateLimit, rateLimitedResponse, getIp } from "@/lib/safety";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
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
  return NextResponse.json(conv);
}

export async function DELETE(request: NextRequest, { params }: Params) {
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
  await deleteConversation(id);
  return new Response(null, { status: 204 });
}
