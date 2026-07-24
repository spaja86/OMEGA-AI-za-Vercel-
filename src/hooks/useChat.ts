/**
 * DIAJOLOGIJA – useChat hook
 *
 * Manages conversation state and streams assistant responses via SSE.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { Conversation, Message } from "@/lib/types";

export interface ChatState {
  conversation: Conversation | null;
  isStreaming: boolean;
  error: string | null;
  streamingContent: string;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    conversation: null,
    isStreaming: false,
    error: null,
    streamingContent: "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const startConversation = useCallback(async (model?: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) throw new Error(`Failed to create conversation (${res.status})`);
      const conv: Conversation = await res.json();
      setState((s) => ({ ...s, conversation: conv }));
      return conv;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState((s) => ({ ...s, error: msg }));
      return null;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!state.conversation) return;
      if (state.isStreaming) return;

      // Optimistically add user message to local state
      const optimisticUser: Message = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        isStreaming: true,
        error: null,
        streamingContent: "",
        conversation: s.conversation
          ? {
              ...s.conversation,
              messages: [...s.conversation.messages, optimisticUser],
            }
          : null,
      }));

      abortRef.current = new AbortController();

      try {
        const res = await fetch(
          `/api/conversations/${state.conversation.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, model }),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            json.error ?? `Request failed (${res.status})`
          );
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.delta) {
                assistantText += parsed.delta;
                setState((s) => ({
                  ...s,
                  streamingContent: assistantText,
                }));
              }
            } catch (parseErr) {
              // Only re-throw non-JSON-parse errors
              if (!(parseErr instanceof SyntaxError)) {
                throw parseErr;
              }
            }
          }
        }

        // Reload conversation from server to get persisted messages
        const conv = await reloadConversation(state.conversation.id);
        setState((s) => ({
          ...s,
          conversation: conv ?? s.conversation,
          isStreaming: false,
          streamingContent: "",
        }));
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setState((s) => ({ ...s, isStreaming: false, streamingContent: "" }));
          return;
        }
        const msg = err instanceof Error ? err.message : "Unknown error";
        setState((s) => ({ ...s, isStreaming: false, streamingContent: "", error: msg }));
      }
    },
    [state.conversation, state.isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendFeedback = useCallback(
    async (messageId: string, value: "up" | "down") => {
      if (!state.conversation) return;
      await fetch(
        `/api/conversations/${state.conversation.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, value }),
        }
      );
      // Update feedback in local state
      setState((s) => ({
        ...s,
        conversation: s.conversation
          ? {
              ...s.conversation,
              messages: s.conversation.messages.map((m) =>
                m.id === messageId ? { ...m, feedback: value } : m
              ),
            }
          : null,
      }));
    },
    [state.conversation]
  );

  const resetConversation = useCallback(async (model?: string) => {
    const conv = await startConversation(model);
    return conv;
  }, [startConversation]);

  return {
    ...state,
    startConversation,
    sendMessage,
    stopStreaming,
    sendFeedback,
    resetConversation,
  };
}

async function reloadConversation(id: string): Promise<Conversation | null> {
  try {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
