import { ToolError, ToolPolicyDeniedError } from '../../tools/errors/tool.errors';

export class UrlSecurityValidator {
  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'local',
    'internal',
  ]);

  private static readonly BLOCKED_IP_PREFIXES = [
    '127.', // loopback
    '10.', // Class A private
    '192.168.', // Class C private
    '169.254.', // Link-local / Cloud metadata (AWS/GCP/Azure)
  ];

  /**
   * Validates that a URL is safe to retrieve externally, preventing SSRF attacks.
   */
  static validateUrl(urlString: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      throw new ToolError(
        `Invalid URL format: '${urlString}'. Must be a valid absolute HTTP or HTTPS URL.`,
        'INVALID_URL_FORMAT',
      );
    }

    // 1. Protocol check: only allow http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ToolPolicyDeniedError(
        'page_reader',
        `Protocol '${parsed.protocol}' is forbidden. Only 'http:' and 'https:' are permitted.`,
      );
    }

    // Normalize IPv6 brackets if present (e.g. "[::1]" -> "::1")
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    // 2. Blocked hostnames
    if (this.BLOCKED_HOSTNAMES.has(hostname)) {
      throw new ToolPolicyDeniedError(
        'page_reader',
        `Access to local or private hostname '${hostname}' is prohibited (SSRF prevention).`,
      );
    }

    // 3. Blocked IP prefixes
    for (const prefix of this.BLOCKED_IP_PREFIXES) {
      if (hostname.startsWith(prefix)) {
        throw new ToolPolicyDeniedError(
          'page_reader',
          `Access to private/metadata IP '${hostname}' is prohibited (SSRF prevention).`,
        );
      }
    }

    // 4. Class B private range 172.16.0.0 - 172.31.255.255
    const classBMatch = hostname.match(/^172\.(\d+)\./);
    if (classBMatch) {
      const secondOctet = parseInt(classBMatch[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        throw new ToolPolicyDeniedError(
          'page_reader',
          `Access to Class B private IP '${hostname}' is prohibited (SSRF prevention).`,
        );
      }
    }

    // 5. Block internal / onion TLDs
    if (
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.onion')
    ) {
      throw new ToolPolicyDeniedError(
        'page_reader',
        `Access to domain '${hostname}' is prohibited (internal/restricted TLD).`,
      );
    }

    return parsed;
  }
}
