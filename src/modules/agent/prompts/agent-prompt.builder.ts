import { Injectable } from '@nestjs/common';
import { LlmMessage, LlmToolDefinition } from '../../llm/interfaces/llm.types';
import { ToolCallDecision } from '../interfaces/agent-decision.types';
import { ToolObservation } from '../../tools/interfaces/tool.interface';

export interface PromptContext {
  query: string;
  tools: LlmToolDefinition[];
  history: {
    decision: ToolCallDecision;
    observation: ToolObservation;
  }[];
}

@Injectable()
export class AgentPromptBuilder {
  buildSystemInstruction(tools: LlmToolDefinition[]): string {
    const toolsDescription = tools
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(
            t.parameters.properties,
          )}`,
      )
      .join('\n');

    return `You are Knowledge Research Agent (KRA), an evidence-based research and analysis assistant.
Your goal is to answer the user's objective thoroughly and accurately.

You must operate in a step-by-step decision loop. In each turn, you MUST output a single valid JSON decision matching one of these types:

1. Invoking a tool:
{
  "type": "tool_call",
  "rationale": "Clear, concise reason why you are calling this tool",
  "toolName": "name_of_the_tool",
  "arguments": { ...tool parameters... }
}

2. Finalizing your answer:
{
  "type": "final_answer",
  "rationale": "Clear summary of how the research or computation achieved the goal",
  "content": "Comprehensive, structured, evidence-based final answer"
}

3. Requesting clarification:
{
  "type": "request_clarification",
  "rationale": "Reason why the request cannot proceed safely",
  "question": "Specific question for the user"
}

Available approved tools:
${toolsDescription || 'No tools available.'}

CRITICAL RULES:
- Only call tools that are listed in the approved tools above.
- Never repeat the exact same tool call with identical arguments if it previously produced an error or no new info.
- Always explain your rationale concisely.
- When you have sufficient evidence or result, return "final_answer".`;
  }

  buildMessages(context: PromptContext): LlmMessage[] {
    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: `User Goal: ${context.query}`,
      },
    ];

    for (const step of context.history) {
      // Record model's prior decision as assistant message
      messages.push({
        role: 'assistant',
        content: JSON.stringify(step.decision),
      });

      // Record tool execution observation as tool response
      const obsContent =
        step.observation.status === 'success'
          ? JSON.stringify(step.observation.data)
          : `Error (${step.observation.error?.code}): ${step.observation.error?.message}`;

      messages.push({
        role: 'tool',
        name: step.observation.toolName,
        content: obsContent,
      });
    }

    return messages;
  }
}
