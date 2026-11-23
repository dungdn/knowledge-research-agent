import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ILlmProviderPort,
} from '../interfaces/llm-provider.port';
import {
  LlmMessage,
  LlmGenerateOptions,
  LlmResponse,
} from '../interfaces/llm.types';
import {
  LlmSchemaValidationError,
  LlmTimeoutError,
} from '../errors/llm.errors';

@Injectable()
export class MockLlmAdapter implements ILlmProviderPort {
  private responseQueue: (LlmResponse | Error)[] = [];
  public callHistory: { messages: LlmMessage[]; options?: LlmGenerateOptions }[] = [];

  enqueueResponse(response: LlmResponse): void {
    this.responseQueue.push(response);
  }

  enqueueError(error: Error): void {
    this.responseQueue.push(error);
  }

  reset(): void {
    this.responseQueue = [];
    this.callHistory = [];
  }

  async generate(
    messages: LlmMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmResponse> {
    this.callHistory.push({ messages, options });

    if (options?.timeoutMs !== undefined && options.timeoutMs <= 0) {
      throw new LlmTimeoutError(options.timeoutMs);
    }

    if (this.responseQueue.length > 0) {
      const next = this.responseQueue.shift()!;
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }

    // Default response if queue is empty
    return {
      content: 'Mock default response',
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async generateStructured<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    options?: LlmGenerateOptions,
  ): Promise<{ data: T; response: LlmResponse }> {
    const response = await this.generate(messages, options);

    if (!response.content) {
      throw new LlmSchemaValidationError(
        'Response content is empty',
        [],
        undefined,
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(response.content);
    } catch (err) {
      throw new LlmSchemaValidationError(
        `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
        err,
        response.content,
      );
    }

    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new LlmSchemaValidationError(
        validationResult.error.message,
        validationResult.error.errors,
        response.content,
      );
    }

    return {
      data: validationResult.data,
      response,
    };
  }
}
