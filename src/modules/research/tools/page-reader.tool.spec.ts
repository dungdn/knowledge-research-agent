import { PageReaderTool } from './page-reader.tool';
import { ToolPolicyDeniedError, ToolError } from '../../tools/errors/tool.errors';

describe('PageReaderTool', () => {
  let tool: PageReaderTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new PageReaderTool();
  });

  it('should extract title and clean text from HTML while stripping scripts and styles', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page Title</title>
          <style>body { color: red; }</style>
          <script>console.log("malicious code");</script>
        </head>
        <body>
          <nav><a href="/">Home</a></nav>
          <h1>Clean Heading</h1>
          <p>This is the <b>main</b> content &amp; research findings.</p>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValueOnce(mockHtml),
    });

    const result = await tool.execute({
      url: 'https://example.com/research.html',
      maxLength: 1000,
    });

    expect(result.title).toBe('Test Page Title');
    expect(result.domain).toBe('example.com');
    expect(result.textContent).toContain('Clean Heading');
    expect(result.textContent).toContain('main content & research findings');
    expect(result.textContent).not.toContain('malicious code');
    expect(result.textContent).not.toContain('color: red');
    expect(result.textContent).not.toContain('Copyright 2026');
    expect(result.textContent).toContain('[EXTERNAL_UNTRUSTED_CONTENT]');
    expect(result.textContent).toContain('[/EXTERNAL_UNTRUSTED_CONTENT]');
  });

  it('should truncate content that exceeds maxLength', async () => {
    const mockLongHtml = `<html><body><p>${'A'.repeat(500)}</p></body></html>`;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValueOnce(mockLongHtml),
    });

    const result = await tool.execute({
      url: 'https://example.com/long.html',
      maxLength: 100,
    });

    expect(result.isTruncated).toBe(true);
    expect(result.textContent).toContain('[Content Truncated]');
  });

  it('should block SSRF URLs before making any network call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      tool.execute({ url: 'http://169.254.169.254/latest/meta-data/' }),
    ).rejects.toThrow(ToolPolicyDeniedError);

    await expect(
      tool.execute({ url: 'http://localhost:3000/internal-api' }),
    ).rejects.toThrow(ToolPolicyDeniedError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should handle HTTP error responses safely', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      tool.execute({ url: 'https://example.com/missing-page' }),
    ).rejects.toThrow(ToolError);
  });
});
