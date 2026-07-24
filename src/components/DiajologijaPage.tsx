"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";

export default function DiajologijaPage() {
  const {
    conversation,
    isStreaming,
    error,
    streamingContent,
    startConversation,
    sendMessage,
    stopStreaming,
    sendFeedback,
    resetConversation,
  } = useChat();

  // Auto-start a conversation on mount
  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            Ω
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">OMEGA AI</h1>
            <p className="text-xs text-gray-500">
              DIAJOLOGIJA · Continuous dialogue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation && (
            <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[200px]">
              {conversation.title}
            </span>
          )}
          <Link
            href="/statisticka-matrica"
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Matrica
          </Link>
          <button
            onClick={() => resetConversation()}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            New chat
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-red-600 underline text-xs"
          >
            Reload
          </button>
        </div>
      )}

      {/* Message area */}
      <main className="flex flex-col flex-1 overflow-hidden max-w-3xl w-full mx-auto">
        <MessageList
          messages={conversation?.messages ?? []}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          onFeedback={sendFeedback}
        />
      </main>

      {/* Input */}
      <ChatInput
        onSend={(content) => sendMessage(content)}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!conversation}
      />
    </div>
  );
}
