import { Injectable, Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from '../../tools/base/base.tool';
import { ToolMetadata } from '../../tools/interfaces/tool.interface';
import {
  ISearchProviderAdapter,
  SEARCH_PROVIDER_TOKEN,
} from '../interfaces/search-provider.port';
import { WebSearchResult } from '../interfaces/evidence.types';

const webSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('Search query keyword, topic, or question to research'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum number of results to retrieve (1-10)'),
});

export type WebSearchInput = z.infer<typeof webSearchInputSchema>;

@Injectable()
export class WebSearchTool extends BaseTool<WebSearchInput, WebSearchResult> {
  private readonly logger = new Logger(WebSearchTool.name);

  readonly metadata: ToolMetadata = {
    name: 'web_search',
    description:
      'Search the web for up-to-date documentation, technical articles, and factual sources with domain and snippet metadata.',
    timeoutMs: 12000,
    isSideEffecting: false,
  };

  readonly inputSchema = webSearchInputSchema;

  constructor(
    @Inject(SEARCH_PROVIDER_TOKEN)
    private readonly searchProvider: ISearchProviderAdapter,
  ) {
    super();
  }

  async execute(input: WebSearchInput): Promise<WebSearchResult> {
    this.logger.debug(`WebSearchTool invoked with query: "${input.query}" (limit: ${input.maxResults})`);
    const rawSources = await this.searchProvider.search(input.query, input.maxResults);

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicatedSources = [];

    for (const source of rawSources) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        deduplicatedSources.push(source);
      }
    }

    return {
      query: input.query,
      totalFound: deduplicatedSources.length,
      sources: deduplicatedSources,
    };
  }
}
