import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from '../registry/tool.registry';
import { ToolObservation, ToolExecutionContext } from '../interfaces/tool.interface';
import { LlmToolCallProposal } from '../../llm/interfaces/llm.types';

export interface DispatchOptions {
  allowedTools?: string[];
  timeoutMs?: number;
  taskId?: string;
  stepId?: string;
}

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name);
  private readonly defaultTimeoutMs = 15000;

  constructor(private readonly registry: ToolRegistry) {}

  async dispatch(
    proposal: LlmToolCallProposal,
    options?: DispatchOptions,
  ): Promise<ToolObservation> {
    const startTime = Date.now();
    const toolName = proposal.name;
    const callId = proposal.id;

    // 1. Tool existence check
    const tool = this.registry.get(toolName);
    if (!tool) {
      this.logger.warn(`Tool dispatch failed: Tool '${toolName}' not found in registry`);
      return this.createObservation(toolName, callId, startTime, {
        status: 'error',
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool '${toolName}' is not registered in the system`,
        },
      });
    }

    // 2. Policy / Allowlist check
    if (options?.allowedTools && !options.allowedTools.includes(toolName)) {
      this.logger.warn(`Tool dispatch denied by policy: '${toolName}' is not in allowed list`);
      return this.createObservation(toolName, callId, startTime, {
        status: 'error',
        error: {
          code: 'TOOL_POLICY_DENIED',
          message: `Execution of tool '${toolName}' is not permitted for this task/step`,
        },
      });
    }

    // 3. Schema validation for input arguments
    const validationResult = tool.inputSchema.safeParse(proposal.arguments);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`,
      );
      this.logger.warn(
        `Tool argument validation failed for '${toolName}': ${formattedErrors.join(', ')}`,
      );
      return this.createObservation(toolName, callId, startTime, {
        status: 'error',
        error: {
          code: 'TOOL_ARGUMENT_VALIDATION_ERROR',
          message: `Invalid arguments for tool '${toolName}'`,
          details: formattedErrors,
        },
      });
    }

    // 4. Execution with timeout & error boundary
    const effectiveTimeout = options?.timeoutMs ?? tool.metadata.timeoutMs ?? this.defaultTimeoutMs;
    const abortController = new AbortController();
    const context: ToolExecutionContext = {
      taskId: options?.taskId,
      stepId: options?.stepId,
      signal: abortController.signal,
    };

    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abortController.abort();
        const err = new Error(`Tool '${toolName}' exceeded timeout limit of ${effectiveTimeout}ms`);
        err.name = 'ToolTimeout';
        reject(err);
      }, effectiveTimeout);
    });

    try {
      const data = await Promise.race([
        tool.execute(validationResult.data, context),
        timeoutPromise,
      ]);

      if (timer) clearTimeout(timer);

      this.logger.debug(`Tool '${toolName}' executed successfully in ${Date.now() - startTime}ms`);
      return this.createObservation(toolName, callId, startTime, {
        status: 'success',
        data,
      });
    } catch (error: unknown) {
      if (timer) clearTimeout(timer);

      const isTimeout =
        error instanceof Error &&
        (error.name === 'ToolTimeout' || error.name === 'AbortError');

      if (isTimeout) {
        this.logger.error(`Tool '${toolName}' timed out after ${effectiveTimeout}ms`);
        return this.createObservation(toolName, callId, startTime, {
          status: 'error',
          error: {
            code: 'TOOL_TIMEOUT',
            message: `Tool execution timed out after ${effectiveTimeout}ms`,
          },
        });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error executing tool '${toolName}': ${errorMessage}`);

      return this.createObservation(toolName, callId, startTime, {
        status: 'error',
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: errorMessage,
          details: error instanceof Error ? error.stack : undefined,
        },
      });
    }
  }

  private createObservation(
    toolName: string,
    callId: string,
    startTime: number,
    payload: {
      status: 'success' | 'error';
      data?: unknown;
      error?: { code: string; message: string; details?: unknown };
    },
  ): ToolObservation {
    return {
      toolName,
      callId,
      status: payload.status,
      data: payload.data,
      error: payload.error,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
