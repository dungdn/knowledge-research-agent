import { Module, Global } from '@nestjs/common';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { EventRecorder } from './events/event-recorder';
import { NoProgressDetector } from './guardrails/no-progress-detector';
import { AgentPromptBuilder } from './prompts/agent-prompt.builder';
import { PlanValidator } from './planning/plan-validator';
import { AgentPlannerService } from './planning/agent-planner.service';
import { PlanExecutorService } from './planning/plan-executor.service';
import { RetryPolicy } from './evaluation/policies/retry.policy';
import { AgentEvaluatorService } from './evaluation/agent-evaluator.service';

@Module({
  providers: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
    AgentPromptBuilder,
    PlanValidator,
    AgentPlannerService,
    PlanExecutorService,
    RetryPolicy,
    AgentEvaluatorService,
  ],
  exports: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
    PlanValidator,
    AgentPlannerService,
    PlanExecutorService,
    RetryPolicy,
    AgentEvaluatorService,
  ],
})
export class AgentModule {}
