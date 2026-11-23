import { RetryPolicy } from './retry.policy';
import {
  ToolTimeoutError,
  ToolNotFoundError,
  ToolArgumentValidationError,
  ToolPolicyDeniedError,
} from '../../../../modules/tools/errors/tool.errors';
import { LlmTimeoutError, LlmRateLimitError } from '../../../../modules/llm/errors/llm.errors';

describe('RetryPolicy', () => {
  let policy: RetryPolicy;

  beforeEach(() => {
    policy = new RetryPolicy();
  });

  describe('isTransientError', () => {
    it('should identify timeout and rate limit errors as transient', () => {
      expect(policy.isTransientError(new ToolTimeoutError('search', 5000))).toBe(true);
      expect(policy.isTransientError(new LlmTimeoutError(30000))).toBe(true);
      expect(policy.isTransientError(new LlmRateLimitError('Rate limit exceeded'))).toBe(true);
      expect(policy.isTransientError(new Error('503 Service Unavailable'))).toBe(true);
      expect(policy.isTransientError(new Error('connect ETIMEDOUT'))).toBe(true);
    });

    it('should identify permanent validation and policy errors as non-transient', () => {
      expect(policy.isTransientError(new ToolNotFoundError('unknown_tool'))).toBe(false);
      expect(policy.isTransientError(new ToolArgumentValidationError('calc', []))).toBe(false);
      expect(policy.isTransientError(new ToolPolicyDeniedError('tool', 'Not allowed'))).toBe(false);
      expect(policy.isTransientError(new Error('SyntaxError: unexpected token'))).toBe(false);
    });
  });

  describe('canRetryStep', () => {
    it('should allow retry for transient error within budgets', () => {
      const result = policy.canRetryStep('step_1', new ToolTimeoutError('tool', 1000), 0, 0);
      expect(result.canRetry).toBe(true);
    });

    it('should reject retry when maxRetriesPerStep is reached', () => {
      const result = policy.canRetryStep('step_1', new ToolTimeoutError('tool', 1000), 2, 2, {
        maxRetriesPerStep: 2,
        maxTotalRetriesPerTask: 5,
        backoffBaseMs: 100,
      });
      expect(result.canRetry).toBe(false);
      expect(result.reason).toContain('Exceeded max retries for step');
    });

    it('should reject retry when maxTotalRetriesPerTask is reached', () => {
      const result = policy.canRetryStep('step_2', new ToolTimeoutError('tool', 1000), 0, 4, {
        maxRetriesPerStep: 2,
        maxTotalRetriesPerTask: 4,
        backoffBaseMs: 100,
      });
      expect(result.canRetry).toBe(false);
      expect(result.reason).toContain('Exceeded total task retry budget');
    });

    it('should reject retry for permanent errors even if budget remains', () => {
      const result = policy.canRetryStep('step_1', new ToolNotFoundError('bad_tool'), 0, 0);
      expect(result.canRetry).toBe(false);
      expect(result.reason).toContain('non-transient');
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff with positive values', () => {
      const backoff0 = policy.calculateBackoff(0, 100);
      const backoff1 = policy.calculateBackoff(1, 100);
      expect(backoff0).toBeGreaterThanOrEqual(100);
      expect(backoff1).toBeGreaterThanOrEqual(200);
    });
  });
});
