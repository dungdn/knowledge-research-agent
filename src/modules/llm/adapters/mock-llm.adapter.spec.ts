import { z } from 'zod';
import { MockLlmAdapter } from './mock-llm.adapter';
import { LlmSchemaValidationError, LlmTimeoutError } from '../errors/llm.errors';

describe('MockLlmAdapter', () => {
  let adapter: MockLlmAdapter;

  beforeEach(() => {
    adapter = new MockLlmAdapter();
  });

  it('should return default response when queue is empty', async () => {
    const res = await adapter.generate([{ role: 'user', content: 'hello' }]);
    expect(res.content).toBe('Mock default response');
    expect(res.finishReason).toBe('stop');
    expect(adapter.callHistory.length).toBe(1);
  });

  it('should return enqueued response in FIFO order', async () => {
    adapter.enqueueResponse({
      content: 'First response',
      finishReason: 'stop',
    });
    adapter.enqueueResponse({
      content: 'Second response',
      finishReason: 'stop',
    });

    const res1 = await adapter.generate([{ role: 'user', content: '1' }]);
    const res2 = await adapter.generate([{ role: 'user', content: '2' }]);

    expect(res1.content).toBe('First response');
    expect(res2.content).toBe('Second response');
  });

  it('should throw enqueued error', async () => {
    adapter.enqueueError(new Error('Simulated network failure'));

    await expect(
      adapter.generate([{ role: 'user', content: 'hello' }]),
    ).rejects.toThrow('Simulated network failure');
  });

  it('should throw LlmTimeoutError if timeoutMs is <= 0', async () => {
    await expect(
      adapter.generate([{ role: 'user', content: 'hello' }], { timeoutMs: 0 }),
    ).rejects.toThrow(LlmTimeoutError);
  });

  describe('generateStructured', () => {
    const TestSchema = z.object({
      summary: z.string(),
      score: z.number(),
    });

    it('should validate and parse structured JSON correctly', async () => {
      adapter.enqueueResponse({
        content: JSON.stringify({ summary: 'All good', score: 95 }),
        finishReason: 'stop',
      });

      const result = await adapter.generateStructured(
        [{ role: 'user', content: 'evaluate' }],
        TestSchema,
      );

      expect(result.data.summary).toBe('All good');
      expect(result.data.score).toBe(95);
    });

    it('should throw LlmSchemaValidationError on malformed JSON', async () => {
      adapter.enqueueResponse({
        content: 'not valid json',
        finishReason: 'stop',
      });

      await expect(
        adapter.generateStructured(
          [{ role: 'user', content: 'evaluate' }],
          TestSchema,
        ),
      ).rejects.toThrow(LlmSchemaValidationError);
    });

    it('should throw LlmSchemaValidationError on schema mismatch', async () => {
      adapter.enqueueResponse({
        content: JSON.stringify({ summary: 'Missing score' }),
        finishReason: 'stop',
      });

      await expect(
        adapter.generateStructured(
          [{ role: 'user', content: 'evaluate' }],
          TestSchema,
        ),
      ).rejects.toThrow(LlmSchemaValidationError);
    });
  });
});
