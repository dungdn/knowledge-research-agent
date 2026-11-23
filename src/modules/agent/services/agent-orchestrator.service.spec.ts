import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { LLM_PROVIDER_TOKEN } from '../../llm/interfaces/llm-provider.port';
import { MockLlmAdapter } from '../../llm/adapters/mock-llm.adapter';
import { ToolRegistry } from '../../tools/registry/tool.registry';
import { ToolDispatcher } from '../../tools/dispatcher/tool.dispatcher';
import { EventRecorder } from '../events/event-recorder';
import { NoProgressDetector } from '../guardrails/no-progress-detector';
import { AgentPromptBuilder } from '../prompts/agent-prompt.builder';
import { CalculatorTool } from '../../tools/implementations/calculator.tool';
import { MockSearchTool } from '../../tools/implementations/mock-search.tool';

describe('AgentOrchestratorService', () => {
  let orchestrator: AgentOrchestratorService;
  let mockLlm: MockLlmAdapter;
  let eventRecorder: EventRecorder;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    mockLlm = new MockLlmAdapter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentOrchestratorService,
        ToolRegistry,
        ToolDispatcher,
        EventRecorder,
        NoProgressDetector,
        AgentPromptBuilder,
        CalculatorTool,
        MockSearchTool,
        {
          provide: LLM_PROVIDER_TOKEN,
          useValue: mockLlm,
        },
      ],
    }).compile();

    orchestrator = module.get<AgentOrchestratorService>(AgentOrchestratorService);
    eventRecorder = module.get<EventRecorder>(EventRecorder);
    toolRegistry = module.get<ToolRegistry>(ToolRegistry);

    // Register test tools
    toolRegistry.register(module.get<CalculatorTool>(CalculatorTool));
    toolRegistry.register(module.get<MockSearchTool>(MockSearchTool));
  });

  afterEach(() => {
    mockLlm.reset();
  });

  it('should complete with direct final answer without tool calls', async () => {
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'final_answer',
        rationale: 'Direct factual response',
        content: 'TypeScript is a typed superset of JavaScript.',
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'What is TypeScript?',
    });

    expect(result.status).toBe('completed');
    expect(result.finalAnswer).toBe('TypeScript is a typed superset of JavaScript.');
    expect(result.toolCallCount).toBe(0);
    expect(result.iterations).toBe(1);

    const events = eventRecorder.getEvents(result.taskId);
    expect(events.map((e) => e.eventType)).toContain('task.started');
    expect(events.map((e) => e.eventType)).toContain('task.completed');
  });

  it('should execute a tool call, capture observation, then finish', async () => {
    // 1st iteration: tool call to calculator
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'Calculate 15 * 4',
        toolName: 'calculator',
        arguments: { expression: '15 * 4' },
      }),
      finishReason: 'stop',
    });

    // 2nd iteration: model sees observation (60) and finishes
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'final_answer',
        rationale: 'Calculation completed',
        content: '15 times 4 equals 60.',
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'What is 15 * 4?',
    });

    expect(result.status).toBe('completed');
    expect(result.toolCallCount).toBe(1);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].toolName).toBe('calculator');
    expect(result.observations[0].status).toBe('success');
    expect(result.observations[0].data).toEqual({ expression: '15 * 4', result: 60 });
    expect(result.finalAnswer).toBe('15 times 4 equals 60.');
  });

  it('should stop when iteration budget is reached', async () => {
    // Model continuously loops with distinct tool calls
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'Step 1',
        toolName: 'calculator',
        arguments: { expression: '1 + 1' },
      }),
      finishReason: 'stop',
    });
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'Step 2',
        toolName: 'calculator',
        arguments: { expression: '2 + 2' },
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'Infinite loop test',
      budget: { maxIterations: 2 },
    });

    expect(result.status).toBe('budget_exhausted');
    expect(result.stopReason).toContain('Maximum iterations limit');
    expect(result.iterations).toBe(2);
  });

  it('should stop when tool call budget is reached', async () => {
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'Call 1',
        toolName: 'calculator',
        arguments: { expression: '1 + 1' },
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'Tool budget test',
      budget: { maxToolCalls: 1, maxIterations: 5 },
    });

    expect(result.status).toBe('budget_exhausted');
    expect(result.stopReason).toContain('tool calls limit');
  });

  it('should detect no-progress and terminate on identical repeated tool call', async () => {
    // Iteration 1: call calculator with '10 / 0'
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'First divide by zero',
        toolName: 'calculator',
        arguments: { expression: '10 / 0' },
      }),
      finishReason: 'stop',
    });

    // Iteration 2: repeats exact same call without changing
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'tool_call',
        rationale: 'Repeat exact same divide by zero',
        toolName: 'calculator',
        arguments: { expression: '10 / 0' },
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'Repeat error test',
    });

    expect(result.status).toBe('failed');
    expect(result.stopReason).toContain('repeated identical tool call');
    expect(result.toolCallCount).toBe(2);
  });

  it('should handle request_clarification decision', async () => {
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        type: 'request_clarification',
        rationale: 'Ambiguous request',
        question: 'Which framework version are you targeting?',
      }),
      finishReason: 'stop',
    });

    const result = await orchestrator.run({
      query: 'Build something',
    });

    expect(result.status).toBe('completed');
    expect(result.finalAnswer).toContain('Which framework version are you targeting?');
  });
});
