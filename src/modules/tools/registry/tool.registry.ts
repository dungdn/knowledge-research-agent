import { Injectable, Logger } from '@nestjs/common';
import { ITool } from '../interfaces/tool.interface';
import { LlmToolDefinition } from '../../llm/interfaces/llm.types';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, ITool>();

  register(tool: ITool): void {
    const name = tool.metadata.name;
    if (this.tools.has(name)) {
      this.logger.warn(`Tool with name '${name}' is already registered. Overwriting existing tool.`);
    }
    this.tools.set(name, tool);
    this.logger.debug(`Registered tool: ${name}`);
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): ITool[] {
    return Array.from(this.tools.values());
  }

  getDefinitions(allowedToolNames?: string[]): LlmToolDefinition[] {
    const tools = this.list();
    const filtered = allowedToolNames
      ? tools.filter((t) => allowedToolNames.includes(t.metadata.name))
      : tools;

    return filtered.map((t) => t.toLlmDefinition());
  }

  clear(): void {
    this.tools.clear();
  }
}
