import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai-client";
import {
  getOmegaState,
  applyEvolution,
  getCurrentSystemPrompt,
  getCurrentVersion,
} from "@/lib/omega-state";
import { EvolutionEntry } from "@/types/evolution";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const EVOLUTION_META_PROMPT = `You are the OMEGA AI Self-Evolution Engine. 
Your task is to critically analyze the current AI system prompt and generate an improved version.

Analyze the current prompt for:
1. Clarity and precision of directives
2. Gaps in capability definitions
3. Missing guardrails or ethical considerations
4. Opportunities to improve response quality
5. Better alignment with user needs

Return a JSON object with exactly this structure (no markdown, raw JSON only):
{
  "newPrompt": "<the improved full system prompt>",
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "changeReason": "<one sentence explaining the main evolution driver>",
  "performanceScore": <a number 1-100 estimating the quality improvement>
}`;

export async function POST(req: NextRequest) {
  try {
    const { trigger = "auto_cycle" } = (await req.json().catch(() => ({}))) as {
      trigger?: EvolutionEntry["trigger"];
    };

    const openai = getOpenAIClient();
    const currentPrompt = getCurrentSystemPrompt();
    const currentVersion = getCurrentVersion();
    const state = getOmegaState();

    const evolutionRequest = `Current OMEGA AI System Prompt (Version ${currentVersion}):
---
${currentPrompt}
---

Context:
- Total interactions: ${state.totalInteractions}
- Average user satisfaction score: ${state.averageScore.toFixed(2)}/10
- Last evolved: ${state.lastEvolved}
- Evolution trigger: ${trigger}

Please analyze this prompt and generate an evolved, improved version.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EVOLUTION_META_PROMPT },
        { role: "user", content: evolutionRequest },
      ],
      temperature: 0.8,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    let parsed: {
      newPrompt?: string;
      improvements?: string[];
      changeReason?: string;
      performanceScore?: number;
    };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "Evolution engine returned invalid JSON", raw: rawContent },
        { status: 500 }
      );
    }

    if (!parsed.newPrompt) {
      return NextResponse.json(
        { error: "Evolution engine did not return a newPrompt" },
        { status: 500 }
      );
    }

    const entry: EvolutionEntry = {
      id: randomUUID(),
      version: currentVersion + 1,
      timestamp: new Date().toISOString(),
      trigger,
      previousPrompt: currentPrompt,
      newPrompt: parsed.newPrompt,
      improvements: parsed.improvements ?? [],
      performanceScore: parsed.performanceScore ?? 0,
      changeReason: parsed.changeReason ?? "",
    };

    applyEvolution(entry);

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        version: entry.version,
        timestamp: entry.timestamp,
        trigger: entry.trigger,
        improvements: entry.improvements,
        changeReason: entry.changeReason,
        performanceScore: entry.performanceScore,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
