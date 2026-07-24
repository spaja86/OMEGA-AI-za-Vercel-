/**
 * POST /api/conversations/[id]/messages
 *
 * Accepts a user message and streams back the assistant reply as SSE.
 * Response body:  data: {"delta":"..."}  ...  data: [DONE]
 */

import { NextRequest } from "next/server";
import { getConversation, appendMessage } from "@/lib/store";
import { streamCompletion, moderate } from "@/lib/orchestration";
import { getFlags } from "@/lib/flags";
import { checkRateLimit, rateLimitedResponse, getIp } from "@/lib/safety";
import type { SendMessageRequest } from "@/lib/types";

interface Params {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: Params) {
  const { allowed, resetAt } = checkRateLimit(getIp(request));
  if (!allowed) return rateLimitedResponse(resetAt);

  const { id } = await params;

  const conv = await getConversation(id);
  if (!conv) {
    return new Response(
      JSON.stringify({ error: "Conversation not found", status: 404 }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: SendMessageRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", status: 400 }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const content = (body.content ?? "").trim();
  if (!content) {
    return new Response(
      JSON.stringify({ error: "content is required", status: 400 }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const flags = getFlags();

  // Content moderation (optional)
  if (flags.moderationEnabled) {
    const categories = await moderate(content);
    if (categories) {
      return new Response(
        JSON.stringify({
          error: `Message was flagged: ${categories}`,
          code: "MODERATED",
          status: 422,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Persist user message
  const userMsg = await appendMessage(id, { role: "user", content });

  // Build updated message list
  const updatedConv = await getConversation(id);
  if (!updatedConv) {
    return new Response(null, { status: 500 });
  }

  // Collect the full assistant reply in memory so we can persist it
  let assistantText = "";

  const llmStream = await streamCompletion({
    messages: updatedConv.messages,
    model: body.model ?? conv.model,
    onUsage: async ({ promptTokens, completionTokens }) => {
      // Persist assistant message with token counts after streaming completes
      await appendMessage(id, {
        role: "assistant",
        content: assistantText,
        tokens: promptTokens + completionTokens,
      });
    },
  });

  // Wrap stream to intercept deltas and build assistantText
  const encoder = new TextEncoder();
  const transformedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit the user message id so the client can track it
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "user_message", id: userMsg.id })}\n\n`
        )
      );

      const reader = llmStream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        // Collect assistant content from delta events
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.delta) assistantText += parsed.delta;
            } catch {
              // ignore
            }
          }
        }

        controller.enqueue(value);
      }
      controller.close();
    },
  });

  return new Response(transformedStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
