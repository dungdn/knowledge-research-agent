import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from '../../tools/base/base.tool';
import { ToolMetadata, ToolExecutionContext } from '../../tools/interfaces/tool.interface';
import { UrlSecurityValidator } from '../security/url-security.validator';
import { ExtractedPageContent } from '../interfaces/evidence.types';
import { ToolError } from '../../tools/errors/tool.errors';

const pageReaderInputSchema = z.object({
  url: z.string().min(1).describe('The HTTP/HTTPS web page URL to read and extract text from'),
  maxLength: z
    .number()
    .int()
    .min(100)
    .max(10000)
    .default(4000)
    .describe('Maximum number of characters to extract (100-10000)'),
});

export interface PageReaderInput {
  url: string;
  maxLength?: number;
}

@Injectable()
export class PageReaderTool extends BaseTool<PageReaderInput, ExtractedPageContent> {
  private readonly logger = new Logger(PageReaderTool.name);

  readonly metadata: ToolMetadata = {
    name: 'page_reader',
    description:
      'Fetch and extract readable text from a verified HTTP/HTTPS web page, sanitizing scripts and markup while protecting against SSRF.',
    timeoutMs: 15000,
    isSideEffecting: false,
  };

  readonly inputSchema = pageReaderInputSchema;

  async execute(
    input: PageReaderInput,
    context?: ToolExecutionContext,
  ): Promise<ExtractedPageContent> {
    // 1. SSRF and URL validation
    const parsedUrl = UrlSecurityValidator.validateUrl(input.url);
    const domain = parsedUrl.hostname;

    this.logger.debug(`Fetching external page from: ${parsedUrl.href}`);

    // 2. Fetch page content with timeout and user-agent
    let response: Response;
    try {
      response = await fetch(parsedUrl.href, {
        signal: context?.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeResearchAgent/1.0)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ToolError(
        `Failed to reach URL '${parsedUrl.href}': ${msg}`,
        'PAGE_FETCH_FAILED',
        { originalError: msg },
      );
    }

    if (!response.ok) {
      throw new ToolError(
        `Failed to retrieve page: HTTP ${response.status} ${response.statusText}`,
        'HTTP_ERROR',
        { status: response.status, statusText: response.statusText },
      );
    }

    const rawHtml = await response.text();
    const title = this.extractTitle(rawHtml);
    const cleanedText = this.sanitizeHtml(rawHtml);

    // 3. Truncation control
    const maxLength = input.maxLength ?? 4000;
    const isTruncated = cleanedText.length > maxLength;
    const boundedText = isTruncated
      ? cleanedText.substring(0, maxLength) + '\n... [Content Truncated]'
      : cleanedText;

    // 4. Mark content with untrusted boundary delimiter (Prompt-Injection protection)
    const delimitedContent = `[EXTERNAL_UNTRUSTED_CONTENT]\n${boundedText}\n[/EXTERNAL_UNTRUSTED_CONTENT]`;

    return {
      url: parsedUrl.href,
      title,
      domain,
      textContent: delimitedContent,
      characterCount: boundedText.length,
      retrievedAt: new Date().toISOString(),
      isTruncated,
    };
  }

  private extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : undefined;
  }

  private sanitizeHtml(html: string): string {
    let text = html;

    // Remove script, style, svg, noscript, nav, header, footer tags and their contents
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
    text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
    text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
    text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
    text = text.replace(/<!--[\s\S]*?-->/g, ' '); // HTML comments

    // Replace block elements with linebreaks
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|article|section)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Collapse multiple horizontal spaces and trim lines
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n');

    return text;
  }
}
