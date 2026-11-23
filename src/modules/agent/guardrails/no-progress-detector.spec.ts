import { NoProgressDetector } from './no-progress-detector';

describe('NoProgressDetector', () => {
  let detector: NoProgressDetector;

  beforeEach(() => {
    detector = new NoProgressDetector();
  });

  it('should report progress for empty history', () => {
    expect(detector.checkProgress([]).hasProgress).toBe(true);
  });

  it('should report progress for distinct tool calls', () => {
    const history = [
      {
        decision: {
          type: 'tool_call' as const,
          rationale: 'Search nestjs',
          toolName: 'mock_search',
          arguments: { query: 'nestjs' },
        },
      },
      {
        decision: {
          type: 'tool_call' as const,
          rationale: 'Calculate',
          toolName: 'calculator',
          arguments: { expression: '2 + 2' },
        },
      },
    ];

    expect(detector.checkProgress(history).hasProgress).toBe(true);
  });

  it('should detect repeated identical tool call with same arguments', () => {
    const history = [
      {
        decision: {
          type: 'tool_call' as const,
          rationale: 'First try',
          toolName: 'calculator',
          arguments: { expression: '10 / 0' },
        },
      },
      {
        decision: {
          type: 'tool_call' as const,
          rationale: 'Repeat identical',
          toolName: 'calculator',
          arguments: { expression: '10 / 0' },
        },
      },
    ];

    const result = detector.checkProgress(history);
    expect(result.hasProgress).toBe(false);
    expect(result.reason).toContain('repeated identical tool call');
  });

  it('should detect consecutive tool failures exceeding threshold', () => {
    const history = [
      {
        decision: {
          type: 'tool_call' as const,
          rationale: '1',
          toolName: 'tool1',
          arguments: {},
        },
        observation: {
          toolName: 'tool1',
          callId: '1',
          status: 'error' as const,
          executionTimeMs: 1,
          timestamp: '',
        },
      },
      {
        decision: {
          type: 'tool_call' as const,
          rationale: '2',
          toolName: 'tool2',
          arguments: {},
        },
        observation: {
          toolName: 'tool2',
          callId: '2',
          status: 'error' as const,
          executionTimeMs: 1,
          timestamp: '',
        },
      },
      {
        decision: {
          type: 'tool_call' as const,
          rationale: '3',
          toolName: 'tool3',
          arguments: {},
        },
        observation: {
          toolName: 'tool3',
          callId: '3',
          status: 'error' as const,
          executionTimeMs: 1,
          timestamp: '',
        },
      },
    ];

    const result = detector.checkProgress(history);
    expect(result.hasProgress).toBe(false);
    expect(result.reason).toContain('consecutive tool failures');
  });
});
