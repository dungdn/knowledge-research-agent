export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmMessage {
  role: LlmRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface LlmToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, LlmToolParameterProperty>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface LlmToolCallProposal {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export type LlmFinishReason =
  | 'stop'
  | 'tool_calls'
  | 'length'
  | 'content_filter'
  | 'error'
  | 'other';

export interface LlmResponse {
  content?: string;
  toolCalls?: LlmToolCallProposal[];
  usage?: LlmUsage;
  finishReason: LlmFinishReason;
  raw?: unknown;
}

export interface LlmGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: LlmToolDefinition[];
  timeoutMs?: number;
  systemInstruction?: string;
}
