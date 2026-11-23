import { ToolDispatcher } from './tool.dispatcher';
import { ToolRegistry } from '../registry/tool.registry';
import { BaseTool } from '../base/base.tool';
import { z } from 'zod';
import { ToolMetadata } from '../interfaces/tool.interface';

class AddTool extends BaseTool<{ a: number; b: number }, number> {
  readonly metadata: ToolMetadata = {
    name: 'add_tool',
    description: 'Add two numbers',
    timeoutMs: 1000,
  };
  readonly inputSchema = z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  });

  async execute(input: { a: number; b: number }): Promise<number> {
    return input.a + input.b;
  }
}

class SlowTool extends BaseTool<Record<string, unknown>, string> {
  readonly metadata: ToolMetadata = {
    name: 'slow_tool',
    description: 'Slow tool',
    timeoutMs: 50,
  };
  readonly inputSchema = z.object({}).passthrough();

  async execute(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return 'done';
  }
}

class FailingTool extends BaseTool<Record<string, unknown>, void> {
  readonly metadata: ToolMetadata = {
    name: 'failing_tool',
    description: 'Failing tool',
  };
  readonly inputSchema = z.object({}).passthrough();

  async execute(): Promise<void> {
    throw new Error('Database connection failed');
  }
}

describe('ToolDispatcher', () => {
  let registry: ToolRegistry;
  let dispatcher: ToolDispatcher;

  beforeEach(() => {
    registry = new ToolRegistry();
    dispatcher = new ToolDispatcher(registry);

    registry.register(new AddTool());
    registry.register(new SlowTool());
    registry.register(new FailingTool());
  });

  it('should dispatch successfully and return normalized observation', async () => {
    const obs = await dispatcher.dispatch({
      id: 'call_1',
      name: 'add_tool',
      arguments: { a: 10, b: 25 },
    });

    expect(obs.status).toBe('success');
    expect(obs.toolName).toBe('add_tool');
    expect(obs.callId).toBe('call_1');
    expect(obs.data).toBe(35);
    expect(typeof obs.executionTimeMs).toBe('number');
  });

  it('should return error observation when tool is not found', async () => {
    const obs = await dispatcher.dispatch({
      id: 'call_2',
      name: 'non_existent_tool',
      arguments: {},
    });

    expect(obs.status).toBe('error');
    expect(obs.error?.code).toBe('TOOL_NOT_FOUND');
    expect(obs.error?.message).toContain('not registered');
  });

  it('should return error observation when tool is denied by policy allowlist', async () => {
    const obs = await dispatcher.dispatch(
      {
        id: 'call_3',
        name: 'add_tool',
        arguments: { a: 1, b: 2 },
      },
      { allowedTools: ['mock_search'] },
    );

    expect(obs.status).toBe('error');
    expect(obs.error?.code).toBe('TOOL_POLICY_DENIED');
  });

  it('should return error observation when arguments fail validation', async () => {
    const obs = await dispatcher.dispatch({
      id: 'call_4',
      name: 'add_tool',
      arguments: { a: 'not-a-number', b: 2 } as any,
    });

    expect(obs.status).toBe('error');
    expect(obs.error?.code).toBe('TOOL_ARGUMENT_VALIDATION_ERROR');
    expect(Array.isArray(obs.error?.details)).toBe(true);
  });

  it('should return error observation when tool throws an unhandled error', async () => {
    const obs = await dispatcher.dispatch({
      id: 'call_5',
      name: 'failing_tool',
      arguments: {},
    });

    expect(obs.status).toBe('error');
    expect(obs.error?.code).toBe('TOOL_EXECUTION_ERROR');
    expect(obs.error?.message).toContain('Database connection failed');
  });

  it('should return error observation when tool exceeds timeout limit', async () => {
    const obs = await dispatcher.dispatch({
      id: 'call_6',
      name: 'slow_tool',
      arguments: {},
    });

    expect(obs.status).toBe('error');
    expect(obs.error?.code).toBe('TOOL_TIMEOUT');
    expect(obs.error?.message).toContain('timed out');
  });
});
