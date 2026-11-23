import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { GeminiProviderAdapter } from './gemini-provider.adapter';
import {
  LlmRateLimitError,
  LlmSchemaValidationError,
} from '../errors/llm.errors';

describe('GeminiProviderAdapter', () => {
  let adapter: GeminiProviderAdapter;
  let mockConfigService: Partial<ConfigService>;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    adapter = new GeminiProviderAdapter(mockConfigService as ConfigService);

    // Mock internal aiClient.models.generateContent
    mockGenerateContent = jest.fn();
    (adapter as any).aiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  });

  it('should be defined and initialize client', () => {
    expect(adapter).toBeDefined();
  });

  it('should generate and normalize text content and usage', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ text: 'Gemini says hello!' }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 8,
        totalTokenCount: 23,
      },
    });

    const response = await adapter.generate([
      { role: 'system', content: 'Be concise' },
      { role: 'user', content: 'Hi' },
    ]);

    expect(response.content).toBe('Gemini says hello!');
    expect(response.finishReason).toBe('stop');
    expect(response.usage).toEqual({
      promptTokens: 15,
      completionTokens: 8,
      totalTokens: 23,
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should normalize tool call proposals correctly', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'web_search',
                  args: { query: 'NestJS Clean Architecture' },
                },
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    });

    const response = await adapter.generate(
      [{ role: 'user', content: 'Search for NestJS Clean Architecture' }],
      {
        tools: [
          {
            name: 'web_search',
            description: 'Search the web',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
              },
              required: ['query'],
            },
          },
        ],
      },
    );

    expect(response.finishReason).toBe('tool_calls');
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls![0].name).toBe('web_search');
    expect(response.toolCalls![0].arguments).toEqual({
      query: 'NestJS Clean Architecture',
    });
  });

  it('should parse and validate structured output', async () => {
    const PlanSchema = z.object({
      steps: z.array(z.string()),
    });

    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ steps: ['Step 1', 'Step 2'] }) }],
          },
          finishReason: 'STOP',
        },
      ],
    });

    const result = await adapter.generateStructured(
      [{ role: 'user', content: 'Generate plan' }],
      PlanSchema,
    );

    expect(result.data.steps).toEqual(['Step 1', 'Step 2']);
  });

  it('should throw LlmSchemaValidationError when structured JSON violates schema', async () => {
    const PlanSchema = z.object({
      steps: z.array(z.string()),
    });

    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ invalidField: true }) }],
          },
          finishReason: 'STOP',
        },
      ],
    });

    await expect(
      adapter.generateStructured(
        [{ role: 'user', content: 'Generate plan' }],
        PlanSchema,
      ),
    ).rejects.toThrow(LlmSchemaValidationError);
  });

  it('should convert 429 errors into LlmRateLimitError', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('429 RESOURCE_EXHAUSTED: Rate limit exceeded'),
    );

    await expect(
      adapter.generate([{ role: 'user', content: 'Hi' }]),
    ).rejects.toThrow(LlmRateLimitError);
  });
});
