import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from '../base/base.tool';
import { ToolMetadata } from '../interfaces/tool.interface';

const mockSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('The search query to look up information on'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3)
    .describe('Maximum number of search results to return (1-10)'),
});

export type MockSearchInput = z.infer<typeof mockSearchInputSchema>;

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string;
}

export interface MockSearchOutput {
  query: string;
  resultsCount: number;
  results: SearchResultItem[];
}

@Injectable()
export class MockSearchTool extends BaseTool<MockSearchInput, MockSearchOutput> {
  readonly metadata: ToolMetadata = {
    name: 'mock_search',
    description: 'Simulated web search engine providing technical research articles, architecture guides, and documentation snippets.',
    timeoutMs: 8000,
    isSideEffecting: false,
  };

  readonly inputSchema = mockSearchInputSchema;

  private readonly corpus: SearchResultItem[] = [
    {
      title: 'NestJS Architecture & Best Practices',
      url: 'https://docs.nestjs.com/architecture',
      snippet: 'NestJS uses modular architecture with dependency injection, controllers, and providers. Clean Architecture principles help decouple business logic from infrastructure.',
      publishedDate: '2026-01-15',
    },
    {
      title: 'Building AI Agents from Scratch',
      url: 'https://ai-engineering.dev/agent-fundamentals',
      snippet: 'An AI Agent core consists of an orchestration loop: Plan -> Tool Decision -> Execution -> Observation -> Evaluation -> Termination.',
      publishedDate: '2026-03-20',
    },
    {
      title: 'TypeScript Runtime Schema Validation with Zod',
      url: 'https://zod.dev/guide',
      snippet: 'Zod provides type-safe schema declaration and validation. Ideal for validating external inputs from LLM structured outputs and tool parameters.',
      publishedDate: '2026-02-10',
    },
    {
      title: 'Google Gemini 3.5 & 3.8 Flash Capabilities',
      url: 'https://ai.google.dev/gemini-api/docs',
      snippet: 'Gemini Flash models offer high token throughput, native tool calling, and structured JSON output for rapid agent workflows.',
      publishedDate: '2026-04-01',
    },
    {
      title: 'Evaluating AI Research Reports and Triangulating Evidence',
      url: 'https://research-agents.org/evaluation',
      snippet: 'Evidence synthesis requires multi-source verification, explicit citations, and transparent admission of uncertainty and conflicting claims.',
      publishedDate: '2026-05-12',
    },
  ];

  async execute(input: MockSearchInput): Promise<MockSearchOutput> {
    const queryLower = input.query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(Boolean);

    // Score and filter corpus based on keyword matches
    const matched = this.corpus
      .map((item) => {
        let score = 0;
        const textToSearch = `${item.title.toLowerCase()} ${item.snippet.toLowerCase()}`;
        for (const word of words) {
          if (textToSearch.includes(word)) score += 1;
        }
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    // If no direct keyword match, return top results up to limit as fallback
    const finalResults = (matched.length > 0 ? matched : this.corpus).slice(0, input.limit);

    return {
      query: input.query,
      resultsCount: finalResults.length,
      results: finalResults,
    };
  }
}
