export class LlmError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export class LlmTimeoutError extends LlmError {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms`);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmRateLimitError extends LlmError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'LlmRateLimitError';
  }
}

export class LlmProviderError extends LlmError {
  constructor(
    public readonly provider: string,
    message: string,
    cause?: unknown,
  ) {
    super(`[${provider}] ${message}`, cause);
    this.name = 'LlmProviderError';
  }
}

export class LlmSchemaValidationError extends LlmError {
  constructor(
    message: string,
    public readonly validationErrors: unknown,
    public readonly rawContent?: string,
  ) {
    super(`Failed to validate LLM output against schema: ${message}`);
    this.name = 'LlmSchemaValidationError';
  }
}
