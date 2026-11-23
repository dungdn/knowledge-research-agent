import { Module, Global } from '@nestjs/common';
import { LLM_PROVIDER_TOKEN } from './interfaces/llm-provider.port';
import { GeminiProviderAdapter } from './adapters/gemini-provider.adapter';
import { MockLlmAdapter } from './adapters/mock-llm.adapter';

@Global()
@Module({
  providers: [
    GeminiProviderAdapter,
    MockLlmAdapter,
    {
      provide: LLM_PROVIDER_TOKEN,
      useClass: GeminiProviderAdapter,
    },
  ],
  exports: [
    LLM_PROVIDER_TOKEN,
    GeminiProviderAdapter,
    MockLlmAdapter,
  ],
})
export class LlmModule {}
