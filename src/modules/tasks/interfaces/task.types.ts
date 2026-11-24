import { z } from 'zod';
import { Plan } from '../../agent/planning/interfaces/plan.types';
import { ResearchReport } from '../../research/interfaces/research-report.types';
import { AgentBudgetConfig } from '../../agent/interfaces/agent-state.types';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const TASK_STATUSES: TaskStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
];

export interface TaskMetrics {
  durationMs?: number;
  iterationsUsed?: number;
  toolCallsCount?: number;
  retriesUsed?: number;
  replanCount?: number;
}

export interface TaskBudgetConfig extends Partial<AgentBudgetConfig> {
  maxRetriesPerStep?: number;
  maxReplans?: number;
}

export interface TaskEntity {
  id: string;
  goal: string;
  status: TaskStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt?: string;
  budget?: TaskBudgetConfig;
  metrics?: TaskMetrics;
  plan?: Plan;
  report?: ResearchReport;
  markdown?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilter {
  status?: TaskStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Zod schemas for validation
export const CreateTaskSchema = z.object({
  goal: z
    .string()
    .min(3, 'Goal must be at least 3 characters long')
    .max(1000, 'Goal cannot exceed 1000 characters'),
  budget: z
    .object({
      maxIterations: z.number().int().positive().optional(),
      maxToolCalls: z.number().int().positive().optional(),
      maxTotalDurationMs: z.number().int().positive().optional(),
      maxConsecutiveErrors: z.number().int().positive().optional(),
      maxRetriesPerStep: z.number().int().nonnegative().optional(),
      maxReplans: z.number().int().nonnegative().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  executeImmediately: z.boolean().optional().default(true),
});

export type CreateTaskInput = z.input<typeof CreateTaskSchema>;
export type CreateTaskOutput = z.output<typeof CreateTaskSchema>;

export const QueryTasksSchema = z.object({
  status: z
    .enum(['queued', 'running', 'completed', 'failed', 'cancelled'])
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type QueryTasksInput = z.input<typeof QueryTasksSchema>;
export type QueryTasksOutput = z.output<typeof QueryTasksSchema>;
