/**
 * DIAJOLOGIJA – in-process conversation store
 *
 * For the MVP this is an in-memory Map (persists for the lifetime of the
 * serverless function warm instance).  Replace the `store` Map with a real
 * database (e.g. Vercel Postgres, Upstash Redis) when you need true
 * persistence across requests/instances.
 *
 * The interface is intentionally async so callers never need to change when
 * the underlying persistence layer is swapped out.
 */

import { v4 as randomUUID } from "uuid";
import type { Conversation, ConversationSummary, Message, StatsSnapshot } from "./types";
import { getFlags } from "./flags";

const store = new Map<string, Conversation>();

export async function createConversation(model: string): Promise<Conversation> {
  const flags = getFlags();
  const id = randomUUID();
  const now = new Date().toISOString();

  const systemMessage: Message = {
    id: randomUUID(),
    role: "system",
    content:
      "You are OMEGA AI – an evolving, helpful, and honest assistant. " +
      "You communicate clearly and adapt to what the user needs. " +
      "You are powered by DIAJOLOGIJA, a continuous-improvement dialogue layer.",
    createdAt: now,
  };

  const conv: Conversation = {
    id,
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [systemMessage],
    model,
    schemaVersion: 1,
    flags: {
      streamingEnabled: flags.streamingEnabled,
      moderationEnabled: flags.moderationEnabled,
    },
  };

  store.set(id, conv);
  return conv;
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  return store.get(id) ?? null;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return Array.from(store.values())
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      model: c.model,
      messageCount: c.messages.filter((m) => m.role !== "system").length,
    }));
}

export async function appendMessage(
  conversationId: string,
  message: Omit<Message, "id" | "createdAt">
): Promise<Message> {
  const conv = store.get(conversationId);
  if (!conv) throw new Error(`Conversation not found: ${conversationId}`);

  const msg: Message = {
    ...message,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // Auto-title from the first user turn
  if (message.role === "user" && conv.title === "New conversation") {
    conv.title =
      message.content.slice(0, 60) +
      (message.content.length > 60 ? "…" : "");
  }

  conv.messages.push(msg);
  conv.updatedAt = new Date().toISOString();
  return msg;
}

export async function setMessageFeedback(
  conversationId: string,
  messageId: string,
  value: "up" | "down"
): Promise<void> {
  const conv = store.get(conversationId);
  if (!conv) throw new Error(`Conversation not found: ${conversationId}`);
  const msg = conv.messages.find((m) => m.id === messageId);
  if (!msg) throw new Error(`Message not found: ${messageId}`);
  msg.feedback = value;
  conv.updatedAt = new Date().toISOString();
}

export async function deleteConversation(id: string): Promise<void> {
  store.delete(id);
}

export async function getStats(): Promise<StatsSnapshot> {
  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;

  let totalMessages = 0;
  let totalTokens = 0;
  let assistantReplies = 0;
  let feedbackUp = 0;
  let feedbackDown = 0;
  let conversationsLast24h = 0;
  let conversationsLast7d = 0;
  const modelBreakdown: Record<string, number> = {};

  for (const conv of store.values()) {
    // Model breakdown
    modelBreakdown[conv.model] = (modelBreakdown[conv.model] ?? 0) + 1;

    // Time windows
    const age = now - new Date(conv.createdAt).getTime();
    if (age <= ms24h) conversationsLast24h++;
    if (age <= ms7d) conversationsLast7d++;

    for (const msg of conv.messages) {
      if (msg.role === "system") continue;
      totalMessages++;

      if (msg.role === "assistant") {
        assistantReplies++;
        totalTokens += msg.tokens ?? 0;
      }

      if (msg.feedback === "up") feedbackUp++;
      else if (msg.feedback === "down") feedbackDown++;
    }
  }

  const totalConversations = store.size;
  const averageTokensPerReply =
    assistantReplies > 0 ? totalTokens / assistantReplies : 0;
  const averageMessagesPerConversation =
    totalConversations > 0 ? totalMessages / totalConversations : 0;
  const totalFeedback = feedbackUp + feedbackDown;
  const feedbackRatio = totalFeedback > 0 ? feedbackUp / totalFeedback : null;

  const topConversationsByLength = Array.from(store.values())
    .map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      model: c.model,
      messageCount: c.messages.filter((m) => m.role !== "system").length,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5);

  return {
    totalConversations,
    totalMessages,
    totalTokens,
    averageTokensPerReply,
    averageMessagesPerConversation,
    feedbackUp,
    feedbackDown,
    feedbackRatio,
    modelBreakdown,
    conversationsLast24h,
    conversationsLast7d,
    topConversationsByLength,
    generatedAt: new Date().toISOString(),
  };
}
