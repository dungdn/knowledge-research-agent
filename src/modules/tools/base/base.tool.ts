import { z } from 'zod';
import { ITool, ToolMetadata, ToolExecutionContext } from '../interfaces/tool.interface';
import { LlmToolDefinition } from '../../llm/interfaces/llm.types';
import { zodToJsonSchema } from '../utils/zod-to-json-schema';

export abstract class BaseTool<TInput = unknown, TOutput = unknown> implements ITool<TInput, TOutput> {
  abstract readonly metadata: ToolMetadata;
  abstract readonly inputSchema: z.ZodType<TInput, any, any>;

  abstract execute(input: TInput, context?: ToolExecutionContext): Promise<TOutput>;

  toLlmDefinition(): LlmToolDefinition {
    const parameters = zodToJsonSchema(this.inputSchema);
    return {
      name: this.metadata.name,
      description: this.metadata.description,
      parameters,
    };
  }
}
