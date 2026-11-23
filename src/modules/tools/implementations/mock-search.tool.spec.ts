import { MockSearchTool } from './mock-search.tool';

describe('MockSearchTool', () => {
  let tool: MockSearchTool;

  beforeEach(() => {
    tool = new MockSearchTool();
  });

  it('should return relevant results matching keywords', async () => {
    const res = await tool.execute({ query: 'NestJS Architecture', limit: 2 });
    expect(res.query).toBe('NestJS Architecture');
    expect(res.results.length).toBeLessThanOrEqual(2);
    expect(res.results[0].title).toContain('NestJS');
    expect(res.results[0].url).toBeDefined();
    expect(res.results[0].snippet).toBeDefined();
  });

  it('should respect the limit parameter', async () => {
    const res = await tool.execute({ query: 'Agent', limit: 1 });
    expect(res.results.length).toBe(1);
  });

  it('should return fallback results when query matches no exact keywords', async () => {
    const res = await tool.execute({ query: 'xyzUnknownTopic12345', limit: 3 });
    expect(res.results.length).toBe(3);
  });
});
