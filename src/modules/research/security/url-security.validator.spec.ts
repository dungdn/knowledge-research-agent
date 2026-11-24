import { UrlSecurityValidator } from './url-security.validator';
import { ToolPolicyDeniedError, ToolError } from '../../tools/errors/tool.errors';

describe('UrlSecurityValidator (SSRF Prevention)', () => {
  it('should accept valid public HTTPS and HTTP URLs', () => {
    expect(() => UrlSecurityValidator.validateUrl('https://docs.nestjs.com/architecture')).not.toThrow();
    expect(() => UrlSecurityValidator.validateUrl('http://example.com/page.html')).not.toThrow();
    expect(() => UrlSecurityValidator.validateUrl('https://ai.google.dev/gemini-api')).not.toThrow();
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    expect(() => UrlSecurityValidator.validateUrl('file:///etc/passwd')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('ftp://ftp.example.com')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('javascript:alert(1)')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('data:text/html,<html></html>')).toThrow(ToolPolicyDeniedError);
  });

  it('should reject localhost and loopback addresses', () => {
    expect(() => UrlSecurityValidator.validateUrl('http://localhost:3000')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://127.0.0.1:8080')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://0.0.0.0:80')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://[::1]:80')).toThrow(ToolPolicyDeniedError);
  });

  it('should reject private network IP ranges (10.x, 192.168.x, 172.16-31.x)', () => {
    expect(() => UrlSecurityValidator.validateUrl('http://10.0.0.1/admin')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://192.168.1.100')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://172.16.0.5/api')).toThrow(ToolPolicyDeniedError);
    expect(() => UrlSecurityValidator.validateUrl('http://172.31.255.254')).toThrow(ToolPolicyDeniedError);
  });

  it('should reject AWS/GCP cloud metadata service IP (169.254.169.254)', () => {
    expect(() =>
      UrlSecurityValidator.validateUrl('http://169.254.169.254/latest/meta-data/'),
    ).toThrow(ToolPolicyDeniedError);
  });

  it('should reject internal and onion TLDs', () => {
    expect(() => UrlSecurityValidator.validateUrl('http://service.internal/status')).toThrow(
      ToolPolicyDeniedError,
    );
    expect(() => UrlSecurityValidator.validateUrl('http://myserver.local')).toThrow(
      ToolPolicyDeniedError,
    );
  });

  it('should throw ToolError on malformed URL format', () => {
    expect(() => UrlSecurityValidator.validateUrl('not-a-valid-url')).toThrow(ToolError);
  });
});
