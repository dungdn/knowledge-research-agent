import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISearchProviderAdapter } from '../interfaces/search-provider.port';
import { SourceEvidence } from '../interfaces/evidence.types';

@Injectable()
export class TavilySearchAdapter implements ISearchProviderAdapter {
  private readonly logger = new Logger(TavilySearchAdapter.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TAVILY_API_KEY');
  }

  async search(query: string, maxResults: number): Promise<SourceEvidence[]> {
    if (!this.apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    this.logger.debug(`Calling Tavily API for query: "${query}"`);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: HTTP ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    const now = new Date().toISOString();

    const results: SourceEvidence[] = (data.results || []).map((r: any) => {
      let domain = '';
      try {
        domain = new URL(r.url).hostname;
      } catch {
        domain = 'unknown';
      }

      return {
        url: r.url,
        title: r.title || 'Untitled',
        domain,
        snippet: r.content || '',
        retrievedAt: now,
        reliabilityScore: typeof r.score === 'number' ? r.score : 0.8,
      };
    });

    return results;
  }
}
