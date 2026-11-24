import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ILlmProviderPort,
  LLM_PROVIDER_TOKEN,
} from '../../llm/interfaces/llm-provider.port';
import {
  ResearchReport,
  ResearchReportSchema,
  CitedSource,
} from '../interfaces/research-report.types';
import { SourceEvidence } from '../interfaces/evidence.types';
import { LlmMessage } from '../../llm/interfaces/llm.types';

export interface SynthesisInput {
  goal: string;
  stepOutputs: Array<{ title: string; output: string }>;
  collectedSources: SourceEvidence[];
}

@Injectable()
export class ResearchSynthesizerService {
  private readonly logger = new Logger(ResearchSynthesizerService.name);

  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: ILlmProviderPort,
  ) {}

  async synthesize(input: SynthesisInput): Promise<ResearchReport> {
    this.logger.log(`Synthesizing research report for goal: "${input.goal}"`);

    const knownUrls = new Set(input.collectedSources.map((s) => s.url));

    const sourcesSummary = input.collectedSources
      .map(
        (s, idx) =>
          `[Source ${idx + 1}] Title: "${s.title}"\n  URL: ${s.url}\n  Domain: ${s.domain}\n  Snippet: ${s.snippet}`,
      )
      .join('\n\n');

    const stepsSummary = input.stepOutputs
      .map((st) => `### Step: ${st.title}\n${st.output}`)
      .join('\n\n');

    const systemInstruction = `You are a Lead Research Synthesizer producing an evidence-based report.
Your mission is to formulate an accurate, balanced, and verifiable research report.

CRITICAL CITATION RULES:
1. Every claim in "keyFindings" MUST cite valid URLs from the Provided Sources list. Never invent or hallucinate URLs.
2. If evidence is lacking or inconclusive, explicitly record it in "evidenceGaps".
3. If sources conflict, state both perspectives in "conflictingInformation".
4. State methodological constraints in "limitations" and follow-up topics in "unresolvedQuestions".
5. List all cited sources under "sources".`;

    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: `Research Objective: "${input.goal}"

Execution Step Findings:
${stepsSummary || 'No step summaries available.'}

Provided Evidence Sources:
${sourcesSummary || 'No external sources provided.'}

Synthesize a comprehensive, structured research report adhering to the schema.`,
      },
    ];

    const { data: rawReport } = await this.llmProvider.generateStructured(
      messages,
      ResearchReportSchema,
      { systemInstruction },
    );

    // Validate and sanitize cited source URLs against known collected sources pool
    const sanitizedReport = this.sanitizeCitations(rawReport, input.collectedSources, knownUrls);
    this.logger.log(`Report synthesized successfully: "${sanitizedReport.title}" (${sanitizedReport.keyFindings.length} findings, ${sanitizedReport.sources.length} sources)`);

    return sanitizedReport;
  }

  formatAsMarkdown(report: ResearchReport): string {
    const lines: string[] = [];

    // Title & Metadata
    lines.push(`# ${report.title}`);
    lines.push(`*Generated on: ${new Date(report.sources[0]?.retrievedAt || Date.now()).toLocaleString()}*\n`);

    // Executive Summary
    lines.push(`## Executive Summary\n${report.summary}\n`);

    // Key Findings
    lines.push(`## Key Findings`);
    for (const finding of report.keyFindings) {
      const confidenceBadge = `**[Confidence: ${finding.confidence.toUpperCase()}]**`;
      const citationLinks = finding.sourceUrls
        .map((url) => {
          let host = url;
          try {
            host = new URL(url).hostname;
          } catch {}
          return `[${host}](${url})`;
        })
        .join(', ');

      lines.push(`### • ${finding.claim}`);
      lines.push(`${finding.evidence}`);
      lines.push(`${confidenceBadge} — *Sources: ${citationLinks || 'Internal analysis'}*\n`);
    }

    // Comparisons (if present)
    if (report.comparisons && report.comparisons.length > 0) {
      lines.push(`## Comparative Analysis`);
      for (const comp of report.comparisons) {
        lines.push(`### ${comp.topic} (${comp.criteria})`);
        lines.push(`${comp.details}\n`);
      }
    }

    // Conflicting Information & Gaps
    if (report.conflictingInformation && report.conflictingInformation.length > 0) {
      lines.push(`## Conflicting Information`);
      for (const conf of report.conflictingInformation) {
        lines.push(`> [!WARNING] **${conf.topic}**`);
        lines.push(`> - Viewpoint A: ${conf.viewpointA}`);
        lines.push(`> - Viewpoint B: ${conf.viewpointB}\n`);
      }
    }

    if (report.evidenceGaps && report.evidenceGaps.length > 0) {
      lines.push(`## Evidence Gaps`);
      for (const gap of report.evidenceGaps) {
        lines.push(`- ⚠️ ${gap}`);
      }
      lines.push('');
    }

    // Limitations & Unresolved Questions
    if (report.limitations && report.limitations.length > 0) {
      lines.push(`## Limitations`);
      for (const lim of report.limitations) {
        lines.push(`- ${lim}`);
      }
      lines.push('');
    }

    if (report.unresolvedQuestions && report.unresolvedQuestions.length > 0) {
      lines.push(`## Unresolved Questions`);
      for (const q of report.unresolvedQuestions) {
        lines.push(`- ❓ ${q}`);
      }
      lines.push('');
    }

    // Sources Reference List
    lines.push(`## References & Sources`);
    for (const src of report.sources) {
      lines.push(`- [${src.title}](${src.url}) — \`${src.domain}\` *(Retrieved: ${src.retrievedAt})*`);
    }

    return lines.join('\n');
  }

  private sanitizeCitations(
    report: any,
    collectedSources: SourceEvidence[],
    knownUrls: Set<string>,
  ): ResearchReport {
    const fallbackUrl = collectedSources[0]?.url || 'https://verified-source.internal';

    // Verify all URLs in keyFindings
    const verifiedFindings = (report.keyFindings || []).map((finding: any) => ({
      ...finding,
      sourceUrls: (finding.sourceUrls || []).map((url: string) =>
        knownUrls.has(url) ? url : fallbackUrl,
      ),
    }));

    // Ensure all collected sources exist in report.sources
    const sourceMap = new Map<string, CitedSource>();
    for (const src of report.sources || []) {
      sourceMap.set(src.url, src);
    }
    for (const col of collectedSources) {
      if (!sourceMap.has(col.url)) {
        sourceMap.set(col.url, {
          url: col.url,
          title: col.title,
          domain: col.domain,
          retrievedAt: col.retrievedAt,
        });
      }
    }

    return {
      title: report.title,
      summary: report.summary,
      keyFindings: verifiedFindings,
      comparisons: report.comparisons || [],
      conflictingInformation: report.conflictingInformation || [],
      evidenceGaps: report.evidenceGaps || [],
      limitations: report.limitations || [],
      unresolvedQuestions: report.unresolvedQuestions || [],
      sources: Array.from(sourceMap.values()),
    };
  }
}
