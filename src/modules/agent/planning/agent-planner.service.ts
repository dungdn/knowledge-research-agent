import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ILlmProviderPort,
  LLM_PROVIDER_TOKEN,
} from '../../../modules/llm/interfaces/llm-provider.port';
import { ToolRegistry } from '../../../modules/tools/registry/tool.registry';
import { EventRecorder } from '../events/event-recorder';
import { PlanValidator } from './plan-validator';
import {
  PlanDraftSchema,
  Plan,
  PlanStep,
} from './interfaces/plan.types';
import { LlmMessage } from '../../../modules/llm/interfaces/llm.types';

export interface PlanGenerationOptions {
  taskId: string;
  goal: string;
  allowedTools?: string[];
  context?: string;
}

@Injectable()
export class AgentPlannerService {
  private readonly logger = new Logger(AgentPlannerService.name);

  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: ILlmProviderPort,
    private readonly toolRegistry: ToolRegistry,
    private readonly planValidator: PlanValidator,
    private readonly eventRecorder: EventRecorder,
  ) {}

  async createPlan(options: PlanGenerationOptions): Promise<Plan> {
    this.logger.log(`Generating plan for task [${options.taskId}]: "${options.goal}"`);

    const availableTools = this.toolRegistry.getDefinitions(options.allowedTools);
    const toolsSummary = availableTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    const systemInstruction = `You are the Planner for an AI Agent.
Your job is to break down a research or computational goal into an actionable, sequential sequence of 2 to 5 steps.

Available Tools:
${toolsSummary || 'No external tools available.'}

Guidelines:
1. Decompose the goal logically into sequential steps (e.g. step_1, step_2).
2. Each step must have a clear title and actionable description.
3. If a step requires a tool, set expectedTool to the exact name of the tool.
4. Specify dependencies: each step can only depend on step IDs that precede it.
5. Keep the plan focused and bounded.`;

    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: `Create an execution plan for this goal: "${options.goal}"${
          options.context ? `\nContext: ${options.context}` : ''
        }`,
      },
    ];

    const { data: draft } = await this.llmProvider.generateStructured(
      messages,
      PlanDraftSchema,
      { systemInstruction },
    );

    // Validate the plan DAG and unique IDs
    this.planValidator.validate(draft);

    const now = new Date().toISOString();
    const planSteps: PlanStep[] = draft.steps.map((s) => ({
      ...s,
      dependencies: s.dependencies ?? [],
      status: 'pending',
    }));

    const plan: Plan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId: options.taskId,
      version: 1,
      goal: draft.goal,
      summary: draft.summary,
      status: 'active',
      steps: planSteps,
      createdAt: now,
      updatedAt: now,
    };

    this.eventRecorder.record(options.taskId, 0, 'plan.created' as any, {
      planId: plan.id,
      goal: plan.goal,
      stepCount: plan.steps.length,
      steps: plan.steps.map((s) => ({ id: s.id, title: s.title })),
    });

    this.logger.log(
      `Plan [${plan.id}] generated successfully with ${plan.steps.length} steps`,
    );

    return plan;
  }
}
