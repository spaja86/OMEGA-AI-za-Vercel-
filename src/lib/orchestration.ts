/**
 * DIAJOLOGIJA – LLM orchestration layer
 *
 * Abstracts provider (OpenAI), handles streaming, context assembly,
 * token usage logging, and fallback mode.
 */

import OpenAI from "openai";
import type { Message } from "./types";
import { getFlags } from "./flags";

export const DEFAULT_MODEL = "gpt-4o-mini";
export const SUPPORTED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
] as const;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "no-key",
    });
  }
  return _client;
}

/** Assemble the last N messages to fit inside the context window. */
function assembleContext(messages: Message[], maxMessages = 20): Message[] {
  const system = messages.filter((m) => m.role === "system");
  const turns = messages
    .filter((m) => m.role !== "system")
    .slice(-maxMessages);
  return [...system, ...turns];
}

/** Moderate content using the OpenAI moderation endpoint. */
export async function moderate(text: string): Promise<string | null> {
  try {
    const result = await getClient().moderations.create({ input: text });
    const flagged = result.results[0]?.flagged;
    if (flagged) {
      const cats = result.results[0].categories as unknown as Record<string, boolean>;
      const active = Object.entries(cats)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ");
      return active;
    }
  } catch {
    // Moderation is best-effort; never block on its failure
  }
  return null;
}

/** Canned fallback response used when no API key is configured. */
function buildFallbackStream(): ReadableStream<Uint8Array> {
  const reply =
    "⚠️ **Fallback mode** – OPENAI_API_KEY is not set. " +
    "Configure it in your Vercel project settings to enable real AI responses.";

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Simulate streaming character by character
      for (const char of reply) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: char })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export interface StreamOptions {
  messages: Message[];
  model?: string;
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
}

/**
 * Returns a Server-Sent Events ReadableStream of `data: {"delta":"..."}` lines.
 * Ends with `data: [DONE]`.
 */
export async function streamCompletion(
  opts: StreamOptions
): Promise<ReadableStream<Uint8Array>> {
  const flags = getFlags();

  if (flags.fallbackModeEnabled) {
    return buildFallbackStream();
  }

  const model = opts.model ?? DEFAULT_MODEL;
  const context = assembleContext(opts.messages);
  const encoder = new TextEncoder();

  const openaiMessages = context.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  const stream = await getClient().chat.completions.create({
    model,
    messages: openaiMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  let promptTokens = 0;
  let completionTokens = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ delta })}\n\n`
              )
            );
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0;
            completionTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        if (flags.usageLoggingEnabled && (promptTokens || completionTokens)) {
          console.log(
            `[DIAJOLOGIJA] usage model=${model} prompt=${promptTokens} completion=${completionTokens}`
          );
        }

        opts.onUsage?.({ promptTokens, completionTokens });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown LLM error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
    cancel() {
      // nothing – OpenAI SDK handles cleanup
    },
  });
}

/**
 * Non-streaming single-turn completion (used internally for auto-title etc).
 */
export async function complete(
  messages: Message[],
  model = DEFAULT_MODEL
): Promise<string> {
  if (getFlags().fallbackModeEnabled) {
    return "(Fallback mode – set OPENAI_API_KEY)";
  }

  const context = assembleContext(messages);
  const res = await getClient().chat.completions.create({
    model,
    messages: context.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    temperature: 0.5,
    max_tokens: 256,
  });

  return res.choices[0]?.message?.content ?? "";
}
