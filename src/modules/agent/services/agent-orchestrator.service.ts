import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ILlmProviderPort,
  LLM_PROVIDER_TOKEN,
} from '../../llm/interfaces/llm-provider.port';
import { ToolRegistry } from '../../tools/registry/tool.registry';
import { ToolDispatcher } from '../../tools/dispatcher/tool.dispatcher';
import { EventRecorder } from '../events/event-recorder';
import { NoProgressDetector } from '../guardrails/no-progress-detector';
import { AgentPromptBuilder } from '../prompts/agent-prompt.builder';
import {
  AgentDecisionSchema,
  ToolCallDecision,
} from '../interfaces/agent-decision.types';
import {
  AgentBudgetConfig,
  AgentRunResult,
  AgentRunStatus,
  DEFAULT_AGENT_BUDGET,
} from '../interfaces/agent-state.types';
import { ToolObservation } from '../../tools/interfaces/tool.interface';

export interface RunTaskOptions {
  taskId?: string;
  query: string;
  budget?: Partial<AgentBudgetConfig>;
  allowedTools?: string[];
}

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: ILlmProviderPort,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolDispatcher: ToolDispatcher,
    private readonly eventRecorder: EventRecorder,
    private readonly noProgressDetector: NoProgressDetector,
    private readonly promptBuilder: AgentPromptBuilder,
  ) {}

  async run(options: RunTaskOptions): Promise<AgentRunResult> {
    const taskId =
      options.taskId ||
      `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const budget: AgentBudgetConfig = {
      ...DEFAULT_AGENT_BUDGET,
      ...options.budget,
    };
    const startTime = Date.now();

    this.logger.log(`Starting agent run for task [${taskId}]: "${options.query}"`);
    this.eventRecorder.record(taskId, 0, 'task.started', {
      query: options.query,
      budget,
      allowedTools: options.allowedTools,
    });

    let status: AgentRunStatus = 'running';
    let currentIteration = 1;
    let toolCallCount = 0;
    let finalAnswer: string | undefined;
    let stopReason: string | undefined;

    const toolHistory: {
      decision: ToolCallDecision;
      observation: ToolObservation;
    }[] = [];
    const observations: ToolObservation[] = [];

    const availableToolDefs = this.toolRegistry.getDefinitions(
      options.allowedTools,
    );
    const systemInstruction =
      this.promptBuilder.buildSystemInstruction(availableToolDefs);

    while (currentIteration <= budget.maxIterations && status === 'running') {
      // 1. Budget checks
      const elapsed = Date.now() - startTime;
      if (elapsed > budget.maxTotalDurationMs) {
        status = 'budget_exhausted';
        stopReason = `Total duration limit of ${budget.maxTotalDurationMs}ms exceeded`;
        this.eventRecorder.record(taskId, currentIteration, 'budget.exhausted', {
          reason: stopReason,
          elapsed,
        });
        break;
      }

      if (toolCallCount >= budget.maxToolCalls) {
        status = 'budget_exhausted';
        stopReason = `Maximum tool calls limit of ${budget.maxToolCalls} reached`;
        this.eventRecorder.record(taskId, currentIteration, 'budget.exhausted', {
          reason: stopReason,
          toolCallCount,
        });
        break;
      }

      this.eventRecorder.record(taskId, currentIteration, 'iteration.started', {
        iteration: currentIteration,
      });

      // 2. Build prompt messages & obtain decision
      const messages = this.promptBuilder.buildMessages({
        query: options.query,
        tools: availableToolDefs,
        history: toolHistory,
      });

      this.eventRecorder.record(taskId, currentIteration, 'llm.requested', {
        messageCount: messages.length,
      });

      let decision;
      try {
        const result = await this.llmProvider.generateStructured(
          messages,
          AgentDecisionSchema,
          { systemInstruction },
        );
        decision = result.data;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Decision error on iteration ${currentIteration}: ${errorMsg}`);
        status = 'failed';
        stopReason = `Model decision generation failed: ${errorMsg}`;
        break;
      }

      this.eventRecorder.record(taskId, currentIteration, 'decision.made', {
        type: decision.type,
        rationale: decision.rationale,
      });

      // 3. Process decision branch
      if (decision.type === 'final_answer') {
        status = 'completed';
        finalAnswer = decision.content;
        stopReason = 'Goal achieved with final answer';
        this.eventRecorder.record(taskId, currentIteration, 'iteration.completed', {
          outcome: 'final_answer',
        });
        break;
      }

      if (decision.type === 'request_clarification') {
        status = 'completed';
        finalAnswer = `[Clarification requested]: ${decision.question}`;
        stopReason = 'Agent requested clarification from user';
        this.eventRecorder.record(taskId, currentIteration, 'iteration.completed', {
          outcome: 'request_clarification',
        });
        break;
      }

      if (decision.type === 'tool_call') {
        toolCallCount += 1;

        this.eventRecorder.record(taskId, currentIteration, 'tool.dispatched', {
          toolName: decision.toolName,
          arguments: decision.arguments,
        });

        const toolArguments = decision.arguments ?? {};

        const observation = await this.toolDispatcher.dispatch(
          {
            id: `call_${currentIteration}`,
            name: decision.toolName,
            arguments: toolArguments,
          },
          {
            allowedTools: options.allowedTools,
            taskId,
            stepId: `iter_${currentIteration}`,
          },
        );

        this.eventRecorder.record(taskId, currentIteration, 'tool.observed', {
          toolName: observation.toolName,
          status: observation.status,
          executionTimeMs: observation.executionTimeMs,
        });

        toolHistory.push({
          decision: {
            ...decision,
            arguments: toolArguments,
          },
          observation,
        });
        observations.push(observation);

        // Check no-progress guardrails
        const progressCheck = this.noProgressDetector.checkProgress(toolHistory);
        if (!progressCheck.hasProgress) {
          status = 'failed';
          stopReason = `Terminated: ${progressCheck.reason}`;
          this.eventRecorder.record(taskId, currentIteration, 'loop.no_progress', {
            reason: progressCheck.reason,
          });
          break;
        }

        this.eventRecorder.record(taskId, currentIteration, 'iteration.completed', {
          outcome: 'tool_call',
          toolName: decision.toolName,
        });
        currentIteration += 1;
      }
    }

    // If loop naturally terminated on iteration limit without finishing
    if (status === 'running' && currentIteration > budget.maxIterations) {
      status = 'budget_exhausted';
      stopReason = `Maximum iterations limit of ${budget.maxIterations} reached without final answer`;
      this.eventRecorder.record(taskId, currentIteration - 1, 'budget.exhausted', {
        reason: stopReason,
      });
    }

    const durationMs = Date.now() - startTime;
    const finalEvent = status === 'completed' ? 'task.completed' : 'task.failed';
    this.eventRecorder.record(taskId, currentIteration, finalEvent, {
      status,
      stopReason,
      durationMs,
      toolCallCount,
      iterations: Math.min(currentIteration, budget.maxIterations),
    });

    this.logger.log(
      `Task [${taskId}] finished with status: ${status} (${stopReason}) in ${durationMs}ms`,
    );

    return {
      taskId,
      status,
      finalAnswer,
      stopReason,
      iterations: Math.min(currentIteration, budget.maxIterations),
      toolCallCount,
      durationMs,
      observations,
    };
  }
}
