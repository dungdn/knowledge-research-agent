import { z } from 'zod';
import { LlmToolDefinition } from '../../llm/interfaces/llm.types';

export interface ToolMetadata {
  name: string;
  description: string;
  timeoutMs?: number;
  isSideEffecting?: boolean;
  requiredPermissions?: string[];
}

export interface ToolExecutionContext {
  taskId?: string;
  stepId?: string;
  signal?: AbortSignal;
}

export interface ToolObservation<TData = unknown> {
  toolName: string;
  callId: string;
  status: 'success' | 'error';
  data?: TData;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  executionTimeMs: number;
  timestamp: string;
}

export interface ITool<TInput = unknown, TOutput = unknown> {
  readonly metadata: ToolMetadata;
  readonly inputSchema: z.ZodType<TInput, any, any>;
  execute(input: TInput, context?: ToolExecutionContext): Promise<TOutput>;
  toLlmDefinition(): LlmToolDefinition;
}
