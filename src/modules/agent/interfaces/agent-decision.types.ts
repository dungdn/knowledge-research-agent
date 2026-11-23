import { z } from 'zod';

export const ToolCallDecisionSchema = z.object({
  type: z.literal('tool_call'),
  rationale: z
    .string()
    .min(1)
    .describe('Brief observable rationale for why this tool is selected'),
  toolName: z.string().min(1).describe('Name of the tool to invoke'),
  arguments: z
    .record(z.unknown())
    .describe('Arguments required by the tool input schema'),
});

export const FinalAnswerDecisionSchema = z.object({
  type: z.literal('final_answer'),
  rationale: z
    .string()
    .min(1)
    .describe('Brief rationale explaining how the goal was achieved'),
  content: z
    .string()
    .min(1)
    .describe('The comprehensive final answer or synthesized response'),
});

export const RequestClarificationDecisionSchema = z.object({
  type: z.literal('request_clarification'),
  rationale: z
    .string()
    .min(1)
    .describe('Why clarification is needed to proceed safely'),
  question: z.string().min(1).describe('Specific clarifying question for user'),
});

export const AgentDecisionSchema = z.discriminatedUnion('type', [
  ToolCallDecisionSchema,
  FinalAnswerDecisionSchema,
  RequestClarificationDecisionSchema,
]);

export type ToolCallDecision = z.infer<typeof ToolCallDecisionSchema>;
export type FinalAnswerDecision = z.infer<typeof FinalAnswerDecisionSchema>;
export type RequestClarificationDecision = z.infer<
  typeof RequestClarificationDecisionSchema
>;
export type AgentDecision = z.infer<typeof AgentDecisionSchema>;
