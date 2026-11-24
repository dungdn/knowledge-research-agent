import { ResearchBenchmark } from './research-benchmark';
import { ResearchReport } from '../interfaces/research-report.types';

describe('ResearchBenchmark', () => {
  it('should pass high-quality report with complete evidence and disclosures', () => {
    const highQualityReport: ResearchReport = {
      title: 'Deep Dive: AI Agent Architecture',
      summary: 'Executive summary detailing the key components and lifecycle of autonomous agents.',
      keyFindings: [
        {
          claim: 'Agent loops require explicit stop conditions to prevent runaway token costs',
          evidence: 'Hard limits on maxIterations and tool calls prevent infinite loops.',
          sourceUrls: ['https://ai-engineering.dev/agent-fundamentals'],
          confidence: 'high',
        },
      ],
      comparisons: [],
      conflictingInformation: [
        {
          topic: 'Framework usage',
          viewpointA: 'Frameworks speed up initial setup',
          viewpointB: 'Custom cores provide better visibility',
          sourceA: 'https://ai-engineering.dev/agent-fundamentals',
        },
      ],
      evidenceGaps: ['Long-term memory benchmarks need empirical evaluation'],
      limitations: ['Evaluated within single process runtime'],
      unresolvedQuestions: ['How to handle distributed state checkpoints?'],
      sources: [
        {
          url: 'https://ai-engineering.dev/agent-fundamentals',
          title: 'Building AI Agents',
          domain: 'ai-engineering.dev',
          retrievedAt: '2026-11-24T12:00:00Z',
        },
      ],
    };

    const result = ResearchBenchmark.evaluateReport(highQualityReport);

    expect(result.passed).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.criteriaResults.every((c) => c.passed)).toBe(true);
  });

  it('should fail poor-quality report lacking citations and uncertainty disclosures', () => {
    const incompleteReport: ResearchReport = {
      title: 'Incomplete Report',
      summary: 'Too short',
      keyFindings: [
        {
          claim: 'Unsupported claim',
          evidence: 'No real evidence',
          sourceUrls: ['invalid-url' as any],
          confidence: 'low',
        },
      ],
      comparisons: [],
      conflictingInformation: [],
      evidenceGaps: [],
      limitations: [],
      unresolvedQuestions: [],
      sources: [
        {
          url: 'https://example.com',
          title: '',
          domain: '',
          retrievedAt: '',
        },
      ],
    };

    const result = ResearchBenchmark.evaluateReport(incompleteReport);

    expect(result.passed).toBe(false);
    expect(result.totalScore).toBeLessThan(80);
  });
});
