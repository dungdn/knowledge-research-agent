import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { ILlmProviderPort } from '../interfaces/llm-provider.port';
import {
  LlmMessage,
  LlmGenerateOptions,
  LlmResponse,
  LlmToolDefinition,
  LlmToolCallProposal,
  LlmFinishReason,
} from '../interfaces/llm.types';
import {
  LlmProviderError,
  LlmRateLimitError,
  LlmSchemaValidationError,
  LlmTimeoutError,
} from '../errors/llm.errors';

@Injectable()
export class GeminiProviderAdapter implements ILlmProviderPort {
  private readonly logger = new Logger(GeminiProviderAdapter.name);
  private readonly aiClient: GoogleGenAI;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. GeminiProviderAdapter may fail on real requests.');
    }
    this.defaultModel = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.5-flash');
    this.aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async generate(
    messages: LlmMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmResponse> {
    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || 30000;

    const { contents, systemInstruction } = this.formatMessages(messages, options?.systemInstruction);
    const toolsConfig = options?.tools ? this.formatTools(options.tools) : undefined;

    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await this.aiClient.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          tools: toolsConfig,
          abortSignal: abortController.signal,
        },
      });

      clearTimeout(timer);
      return this.normalizeResponse(response);
    } catch (error: unknown) {
      clearTimeout(timer);
      this.handleError(error, timeoutMs);
    }
  }

  async generateStructured<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    options?: LlmGenerateOptions,
  ): Promise<{ data: T; response: LlmResponse }> {
    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || 30000;

    const { contents, systemInstruction } = this.formatMessages(messages, options?.systemInstruction);

    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await this.aiClient.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: options?.temperature ?? 0.1,
          maxOutputTokens: options?.maxTokens,
          responseMimeType: 'application/json',
          abortSignal: abortController.signal,
        },
      });

      clearTimeout(timer);
      const normalized = this.normalizeResponse(response);

      if (!normalized.content) {
        throw new LlmSchemaValidationError(
          'Model returned empty response content for structured output',
          [],
          undefined,
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(normalized.content);
      } catch (parseErr) {
        throw new LlmSchemaValidationError(
          `Model output was not valid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          parseErr,
          normalized.content,
        );
      }

      const validation = schema.safeParse(parsedJson);
      if (!validation.success) {
        throw new LlmSchemaValidationError(
          `JSON did not match required schema: ${validation.error.message}`,
          validation.error.errors,
          normalized.content,
        );
      }

      return {
        data: validation.data,
        response: normalized,
      };
    } catch (error: unknown) {
      clearTimeout(timer);
      if (error instanceof LlmSchemaValidationError) {
        throw error;
      }
      this.handleError(error, timeoutMs);
    }
  }

  private formatMessages(
    messages: LlmMessage[],
    explicitSystemInstruction?: string,
  ): { contents: any[]; systemInstruction?: string } {
    let systemInstruction = explicitSystemInstruction;
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n${msg.content}`
          : msg.content;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.name || 'unknown_tool',
                response: { output: msg.content },
              },
            },
          ],
        });
      }
    }

    return { contents, systemInstruction };
  }

  private formatTools(tools: LlmToolDefinition[]): any[] {
    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    return [{ functionDeclarations }];
  }

  private normalizeResponse(rawResponse: any): LlmResponse {
    const candidate = rawResponse.candidates?.[0];
    const contentPart = candidate?.content?.parts?.[0];

    let content: string | undefined;
    const toolCalls: LlmToolCallProposal[] = [];

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          content = (content ? `${content}\n` : '') + part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: part.functionCall.name + '_' + Date.now(),
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }
    }

    let finishReason: LlmFinishReason = 'stop';
    if (toolCalls.length > 0) {
      finishReason = 'tool_calls';
    } else if (candidate?.finishReason) {
      const reasonStr = String(candidate.finishReason).toUpperCase();
      if (reasonStr.includes('STOP')) finishReason = 'stop';
      else if (reasonStr.includes('MAX_TOKENS') || reasonStr.includes('LENGTH')) finishReason = 'length';
      else if (reasonStr.includes('SAFETY')) finishReason = 'content_filter';
      else finishReason = 'other';
    }

    const usageMetadata = rawResponse.usageMetadata;

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: usageMetadata
        ? {
            promptTokens: usageMetadata.promptTokenCount,
            completionTokens: usageMetadata.candidatesTokenCount,
            totalTokens: usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason,
      raw: rawResponse,
    };
  }

  private handleError(error: unknown, timeoutMs: number): never {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmTimeoutError(timeoutMs);
    }

    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new LlmRateLimitError(`Rate limit reached: ${errorMsg}`, error);
    }

    throw new LlmProviderError('Gemini', errorMsg, error);
  }
}
