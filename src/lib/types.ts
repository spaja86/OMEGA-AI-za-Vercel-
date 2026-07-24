/**
 * DIAJOLOGIJA – domain model
 * Conversation/session/message types shared across the entire system.
 */

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string; // ISO-8601
  tokens?: number;
  /** Optional thumb feedback the user gave this message */
  feedback?: "up" | "down" | null;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  /** Model that was used for this conversation */
  model: string;
  /** Schema version – bump when structure changes */
  schemaVersion: number;
  /** Feature-flag snapshot captured at conversation creation */
  flags: Record<string, boolean>;
}

/** Lightweight list item returned by GET /api/conversations */
export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  messageCount: number;
}

/** Request body for POST /api/conversations/[id]/messages */
export interface SendMessageRequest {
  content: string;
  /** Override model for a single turn (optional) */
  model?: string;
}

/** Standardised API error envelope */
export interface ApiError {
  error: string;
  code?: string;
  status: number;
}

/** Feedback body for POST /api/conversations/[id]/feedback */
export interface FeedbackRequest {
  messageId: string;
  value: "up" | "down";
}

/** Aggregated statistics snapshot returned by GET /api/stats */
export interface StatsSnapshot {
  totalConversations: number;
  totalMessages: number; // user + assistant only (no system)
  totalTokens: number;
  averageTokensPerReply: number;
  averageMessagesPerConversation: number;
  feedbackUp: number;
  feedbackDown: number;
  /** Ratio of positive feedback: up / (up + down), or null if no feedback given */
  feedbackRatio: number | null;
  /** model → number of conversations that used it */
  modelBreakdown: Record<string, number>;
  conversationsLast24h: number;
  conversationsLast7d: number;
  /** Top 5 conversations by non-system message count */
  topConversationsByLength: ConversationSummary[];
  generatedAt: string; // ISO-8601
}
