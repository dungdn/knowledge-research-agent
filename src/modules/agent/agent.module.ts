import { Module, Global } from '@nestjs/common';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { EventRecorder } from './events/event-recorder';
import { NoProgressDetector } from './guardrails/no-progress-detector';
import { AgentPromptBuilder } from './prompts/agent-prompt.builder';

@Global()
@Module({
  providers: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
    AgentPromptBuilder,
  ],
  exports: [
    AgentOrchestratorService,
    EventRecorder,
    NoProgressDetector,
  ],
})
export class AgentModule {}
