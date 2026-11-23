import { Injectable, Logger } from '@nestjs/common';
import {
  ToolTimeoutError,
  ToolNotFoundError,
  ToolArgumentValidationError,
  ToolPolicyDeniedError,
} from '../../../tools/errors/tool.errors';
import {
  LlmTimeoutError,
  LlmRateLimitError,
} from '../../../llm/errors/llm.errors';

export interface RetryPolicyConfig {
  maxRetriesPerStep: number;
  maxTotalRetriesPerTask: number;
  backoffBaseMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxRetriesPerStep: 2,
  maxTotalRetriesPerTask: 4,
  backoffBaseMs: 300,
};

@Injectable()
export class RetryPolicy {
  private readonly logger = new Logger(RetryPolicy.name);

  /**
   * Distinguish transient errors (network timeout, rate limit, service unavailable)
   * from permanent errors (syntax error, tool not found, invalid schema).
   */
  isTransientError(error: unknown): boolean {
    if (!error) return false;

    // Check known transient error classes or codes
    if (error instanceof ToolTimeoutError || error instanceof LlmTimeoutError) {
      return true;
    }

    if (error instanceof LlmRateLimitError) {
      return true;
    }

    // Check known non-transient errors that should NOT be retried blindly
    if (
      error instanceof ToolNotFoundError ||
      error instanceof ToolArgumentValidationError ||
      error instanceof ToolPolicyDeniedError
    ) {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);

    // Common transient keywords
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('UNAVAILABLE') ||
      message.includes('RESOURCE_EXHAUSTED')
    ) {
      return true;
    }

    return false;
  }

  canRetryStep(
    stepId: string,
    error: unknown,
    currentStepRetries: number,
    totalTaskRetries: number,
    config: RetryPolicyConfig = DEFAULT_RETRY_POLICY,
  ): { canRetry: boolean; reason?: string } {
    if (currentStepRetries >= config.maxRetriesPerStep) {
      return {
        canRetry: false,
        reason: `Exceeded max retries for step '${stepId}' (${config.maxRetriesPerStep} retries used)`,
      };
    }

    if (totalTaskRetries >= config.maxTotalRetriesPerTask) {
      return {
        canRetry: false,
        reason: `Exceeded total task retry budget (${config.maxTotalRetriesPerTask} total retries used)`,
      };
    }

    const isTransient = this.isTransientError(error);
    if (!isTransient) {
      return {
        canRetry: false,
        reason: `Error is non-transient and cannot be resolved by immediate retry: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    return { canRetry: true };
  }

  calculateBackoff(
    retryAttempt: number,
    baseMs: number = DEFAULT_RETRY_POLICY.backoffBaseMs,
  ): number {
    // Exponential backoff with jitter: base * 2^attempt + jitter
    const exponential = baseMs * Math.pow(2, retryAttempt);
    const jitter = Math.floor(Math.random() * (baseMs / 2));
    return exponential + jitter;
  }
}
