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
import type { Conversation, ConversationSummary, Message } from "./types";
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
