import { z } from 'zod';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying';

export type PlanStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'failed'
  | 'superseded';

export const StepDraftSchema = z.object({
  id: z.string().min(1).describe('Unique step identifier e.g. "step_1"'),
  title: z.string().min(1).describe('Brief imperative title for the step'),
  description: z
    .string()
    .min(1)
    .describe('Detailed explanation of the work to be done in this step'),
  expectedTool: z
    .string()
    .optional()
    .describe('Name of the tool anticipated to be used, if any'),
  dependencies: z
    .array(z.string())
    .default([])
    .describe('List of preceding step IDs that must be completed first'),
});

export const PlanDraftSchema = z.object({
  goal: z.string().min(1).describe('The overall objective of the plan'),
  summary: z.string().min(1).describe('Overview strategy of this plan'),
  steps: z
    .array(StepDraftSchema)
    .min(1, 'A plan must contain at least 1 step')
    .max(10, 'A plan should not exceed 10 steps to maintain bounded execution'),
});

export type StepDraft = z.output<typeof StepDraftSchema>;
export type PlanDraft = z.output<typeof PlanDraftSchema>;

export interface PlanStep extends StepDraft {
  status: StepStatus;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Plan {
  id: string;
  taskId: string;
  version: number;
  goal: string;
  summary: string;
  status: PlanStatus;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
}
