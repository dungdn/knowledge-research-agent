import { ResearchSynthesizerService } from './research-synthesizer.service';
import { MockLlmAdapter } from '../../llm/adapters/mock-llm.adapter';
import { SourceEvidence } from '../interfaces/evidence.types';

describe('ResearchSynthesizerService', () => {
  let synthesizer: ResearchSynthesizerService;
  let mockLlm: MockLlmAdapter;

  beforeEach(() => {
    mockLlm = new MockLlmAdapter();
    synthesizer = new ResearchSynthesizerService(mockLlm);
  });

  const sampleSources: SourceEvidence[] = [
    {
      title: 'NestJS Architecture',
      url: 'https://docs.nestjs.com/architecture',
      domain: 'docs.nestjs.com',
      snippet: 'Clean architecture in NestJS decouples core domain from infrastructure.',
      retrievedAt: '2026-11-24T10:00:00Z',
    },
  ];

  it('should synthesize structured research report', async () => {
    mockLlm.enqueueResponse({
      content: JSON.stringify({
        title: 'NestJS Clean Architecture Analysis',
        summary: 'Comprehensive analysis of modular clean architecture in NestJS applications.',
        keyFindings: [
          {
            claim: 'Modular architecture decouples domain logic from framework concerns',
            evidence: 'Controllers handle HTTP while providers encapsulate domain entities.',
            sourceUrls: ['https://docs.nestjs.com/architecture'],
            confidence: 'high',
          },
        ],
        comparisons: [],
        conflictingInformation: [],
        evidenceGaps: ['Performance benchmarks in distributed settings are unverified'],
        limitations: ['Based on public documentation'],
        unresolvedQuestions: ['How does microservice transport affect latency?'],
        sources: [
          {
            url: 'https://docs.nestjs.com/architecture',
            title: 'NestJS Architecture',
            domain: 'docs.nestjs.com',
            retrievedAt: '2026-11-24T10:00:00Z',
          },
        ],
      }),
      finishReason: 'stop',
    });

    const report = await synthesizer.synthesize({
      goal: 'Analyze NestJS architecture',
      stepOutputs: [
        {
          title: 'Search docs',
          output: 'Found official architectural documentation',
        },
      ],
      collectedSources: sampleSources,
    });

    expect(report.title).toBe('NestJS Clean Architecture Analysis');
    expect(report.keyFindings).toHaveLength(1);
    expect(report.keyFindings[0].sourceUrls).toContain('https://docs.nestjs.com/architecture');
    expect(report.sources).toHaveLength(1);
  });

  it('should format report as clean GitHub Flavored Markdown with clickable links', async () => {
    const report = {
      title: 'Test Report',
      summary: 'Executive summary text.',
      keyFindings: [
        {
          claim: 'Test claim',
          evidence: 'Test evidence',
          sourceUrls: ['https://docs.nestjs.com/architecture'],
          confidence: 'high' as const,
        },
      ],
      comparisons: [],
      conflictingInformation: [],
      evidenceGaps: ['Gap 1'],
      limitations: ['Limitation 1'],
      unresolvedQuestions: ['Question 1'],
      sources: [
        {
          url: 'https://docs.nestjs.com/architecture',
          title: 'NestJS Architecture',
          domain: 'docs.nestjs.com',
          retrievedAt: '2026-11-24T10:00:00Z',
        },
      ],
    };

    const markdown = synthesizer.formatAsMarkdown(report);

    expect(markdown).toContain('# Test Report');
    expect(markdown).toContain('## Executive Summary');
    expect(markdown).toContain('## Key Findings');
    expect(markdown).toContain('[docs.nestjs.com](https://docs.nestjs.com/architecture)');
    expect(markdown).toContain('## Evidence Gaps');
    expect(markdown).toContain('## References & Sources');
  });
});
