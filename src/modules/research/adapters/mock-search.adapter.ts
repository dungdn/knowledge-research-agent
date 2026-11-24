import { Injectable, Logger } from '@nestjs/common';
import { ISearchProviderAdapter } from '../interfaces/search-provider.port';
import { SourceEvidence } from '../interfaces/evidence.types';

@Injectable()
export class MockSearchAdapter implements ISearchProviderAdapter {
  private readonly logger = new Logger(MockSearchAdapter.name);

  private readonly corpus: SourceEvidence[] = [
    {
      title: 'NestJS Architecture & Best Practices',
      url: 'https://docs.nestjs.com/architecture',
      domain: 'docs.nestjs.com',
      snippet: 'NestJS uses modular architecture with dependency injection, controllers, and providers. Clean Architecture principles help decouple business logic from infrastructure.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.95,
    },
    {
      title: 'Building AI Agents from Scratch',
      url: 'https://ai-engineering.dev/agent-fundamentals',
      domain: 'ai-engineering.dev',
      snippet: 'An AI Agent core consists of an orchestration loop: Plan -> Tool Decision -> Execution -> Observation -> Evaluation -> Termination.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.9,
    },
    {
      title: 'TypeScript Runtime Schema Validation with Zod',
      url: 'https://zod.dev/guide',
      domain: 'zod.dev',
      snippet: 'Zod provides type-safe schema declaration and validation. Ideal for validating external inputs from LLM structured outputs and tool parameters.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.95,
    },
    {
      title: 'Google Gemini 3.5 & 3.8 Flash Capabilities',
      url: 'https://ai.google.dev/gemini-api/docs',
      domain: 'ai.google.dev',
      snippet: 'Gemini Flash models offer high token throughput, native tool calling, and structured JSON output for rapid agent workflows.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.95,
    },
    {
      title: 'Evaluating AI Research Reports and Triangulating Evidence',
      url: 'https://research-agents.org/evaluation',
      domain: 'research-agents.org',
      snippet: 'Evidence synthesis requires multi-source verification, explicit citations, and transparent admission of uncertainty and conflicting claims.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.85,
    },
    {
      title: 'PostgreSQL Relational Persistence for Agent State',
      url: 'https://postgresql.org/docs/agent-persistence',
      domain: 'postgresql.org',
      snippet: 'Relational tables ensure ACID consistency for task lifecycles, plans, steps, and immutable event logs.',
      retrievedAt: new Date().toISOString(),
      reliabilityScore: 0.9,
    },
  ];

  async search(query: string, maxResults: number): Promise<SourceEvidence[]> {
    this.logger.debug(`Executing mock search for: "${query}" (limit: ${maxResults})`);
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(Boolean);

    const scored = this.corpus
      .map((item) => {
        let score = 0;
        const text = `${item.title.toLowerCase()} ${item.snippet.toLowerCase()}`;
        for (const w of words) {
          if (text.includes(w)) score += 1;
        }
        return { item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    const results = (scored.length > 0 ? scored : this.corpus).slice(0, maxResults);
    return results;
  }
}
