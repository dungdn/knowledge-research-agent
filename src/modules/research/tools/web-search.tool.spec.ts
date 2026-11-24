import { WebSearchTool } from './web-search.tool';
import { MockSearchAdapter } from '../adapters/mock-search.adapter';

describe('WebSearchTool', () => {
  let tool: WebSearchTool;
  let adapter: MockSearchAdapter;

  beforeEach(() => {
    adapter = new MockSearchAdapter();
    tool = new WebSearchTool(adapter);
  });

  it('should return normalized search results', async () => {
    const result = await tool.execute({ query: 'NestJS Architecture', maxResults: 3 });

    expect(result.query).toBe('NestJS Architecture');
    expect(result.sources.length).toBeLessThanOrEqual(3);
    expect(result.totalFound).toBe(result.sources.length);

    const first = result.sources[0];
    expect(first.title).toBeDefined();
    expect(first.url).toBeDefined();
    expect(first.domain).toBeDefined();
    expect(first.snippet).toBeDefined();
    expect(first.retrievedAt).toBeDefined();
  });

  it('should deduplicate results by URL', async () => {
    // Inject duplicate URL in adapter search response
    jest.spyOn(adapter, 'search').mockResolvedValueOnce([
      {
        title: 'Title 1',
        url: 'https://example.com/same-url',
        domain: 'example.com',
        snippet: 'Snippet 1',
        retrievedAt: new Date().toISOString(),
      },
      {
        title: 'Title 2 (duplicate)',
        url: 'https://example.com/same-url',
        domain: 'example.com',
        snippet: 'Snippet 2',
        retrievedAt: new Date().toISOString(),
      },
    ]);

    const result = await tool.execute({ query: 'duplicate test', maxResults: 5 });
    expect(result.sources.length).toBe(1);
    expect(result.sources[0].url).toBe('https://example.com/same-url');
  });
});
