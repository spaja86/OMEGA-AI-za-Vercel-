import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai-client";
import {
  getCurrentSystemPrompt,
  getCurrentVersion,
  recordInteraction,
} from "@/lib/omega-state";
import { ConversationMessage } from "@/types/evolution";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, feedbackScore } = (await req.json()) as {
      messages: ConversationMessage[];
      feedbackScore?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const systemPrompt = getCurrentSystemPrompt();
    const version = getCurrentVersion();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = completion.choices[0]?.message?.content ?? "";

    recordInteraction(feedbackScore);

    return NextResponse.json({
      message: assistantMessage,
      version,
      usage: completion.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
