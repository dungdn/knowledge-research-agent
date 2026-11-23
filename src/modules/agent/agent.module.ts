import { Module, Global } from '@nestjs/common';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { EventRecorder } from './events/event-recorder';
import { NoProgressDetector } from './guardrails/no-progress-detector';
import { AgentPromptBuilder } from './prompts/agent-prompt.builder';
import { PlanValidator } from './planning/plan-validator';
import { AgentPlannerService } from './planning/agent-planner.service';
import { PlanExecutorService } from './planning/plan-executor.service';

@Global()
@Module({
  providers: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
    AgentPromptBuilder,
    PlanValidator,
    AgentPlannerService,
    PlanExecutorService,
  ],
  exports: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
    PlanValidator,
    AgentPlannerService,
    PlanExecutorService,
  ],
})
export class AgentModule {}
