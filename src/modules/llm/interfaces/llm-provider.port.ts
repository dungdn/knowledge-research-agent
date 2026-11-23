import { z } from 'zod';
import {
  LlmMessage,
  LlmGenerateOptions,
  LlmResponse,
} from './llm.types';

export const LLM_PROVIDER_TOKEN = Symbol('ILlmProviderPort');

export interface ILlmProviderPort {
  /**
   * Generates a raw or tool-call response from the language model.
   */
  generate(
    messages: LlmMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmResponse>;

  /**
   * Generates and validates structured output adhering to a given Zod schema.
   */
  generateStructured<T>(
    messages: LlmMessage[],
    schema: z.ZodType<T>,
    options?: LlmGenerateOptions,
  ): Promise<{ data: T; response: LlmResponse }>;
}
