"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@/lib/types";

interface Props {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  onFeedback: (messageId: string, value: "up" | "down") => void;
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  onFeedback,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const visible = messages.filter((m) => m.role !== "system");

  if (visible.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
        Start a conversation below…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {visible.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onFeedback={onFeedback}
        />
      ))}

      {isStreaming && streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-gray-200 text-gray-900 text-sm whitespace-pre-wrap shadow-sm">
            {streamingContent}
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-500 animate-pulse rounded-sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  onFeedback,
}: {
  message: Message;
  onFeedback: (id: string, v: "up" | "down") => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="group relative max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-900"
          }`}
        >
          {message.content}
        </div>

        {/* Feedback buttons – assistant only */}
        {!isUser && (
          <div className="mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <FeedbackButton
              active={message.feedback === "up"}
              onClick={() => onFeedback(message.id, "up")}
              label="👍"
              title="Good response"
            />
            <FeedbackButton
              active={message.feedback === "down"}
              onClick={() => onFeedback(message.id, "down")}
              label="👎"
              title="Bad response"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
        active
          ? "bg-blue-100 border-blue-300 text-blue-700"
          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
