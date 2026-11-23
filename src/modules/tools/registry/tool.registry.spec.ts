import { ToolRegistry } from './tool.registry';
import { BaseTool } from '../base/base.tool';
import { z } from 'zod';
import { ToolMetadata } from '../interfaces/tool.interface';

class DummyTool extends BaseTool<{ text: string }, { result: string }> {
  readonly metadata: ToolMetadata = {
    name: 'dummy_tool',
    description: 'A dummy tool for testing',
  };
  readonly inputSchema = z.object({
    text: z.string().describe('Input text'),
  });

  async execute(input: { text: string }): Promise<{ result: string }> {
    return { result: input.text.toUpperCase() };
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let tool: DummyTool;

  beforeEach(() => {
    registry = new ToolRegistry();
    tool = new DummyTool();
  });

  it('should register and retrieve tools', () => {
    expect(registry.has('dummy_tool')).toBe(false);
    registry.register(tool);
    expect(registry.has('dummy_tool')).toBe(true);
    expect(registry.get('dummy_tool')).toBe(tool);
    expect(registry.list()).toHaveLength(1);
  });

  it('should generate valid LLM tool definitions', () => {
    registry.register(tool);
    const definitions = registry.getDefinitions();
    expect(definitions).toHaveLength(1);
    expect(definitions[0].name).toBe('dummy_tool');
    expect(definitions[0].description).toBe('A dummy tool for testing');
    expect(definitions[0].parameters.type).toBe('object');
    expect(definitions[0].parameters.properties.text).toBeDefined();
    expect(definitions[0].parameters.required).toContain('text');
  });

  it('should filter definitions based on allowedToolNames', () => {
    registry.register(tool);
    const emptyDef = registry.getDefinitions(['other_tool']);
    expect(emptyDef).toHaveLength(0);

    const matchedDef = registry.getDefinitions(['dummy_tool']);
    expect(matchedDef).toHaveLength(1);
  });

  it('should clear all tools', () => {
    registry.register(tool);
    expect(registry.list().length).toBe(1);
    registry.clear();
    expect(registry.list().length).toBe(0);
  });
});
