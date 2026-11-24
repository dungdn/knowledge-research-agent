import { ResearchReport } from '../interfaces/research-report.types';

export interface RubricCriterionResult {
  criterion: string;
  maxScore: number;
  awardedScore: number;
  passed: boolean;
  notes: string;
}

export interface BenchmarkEvaluationResult {
  totalScore: number; // 0 - 100
  passed: boolean;
  threshold: number;
  criteriaResults: RubricCriterionResult[];
}

export class ResearchBenchmark {
  private static readonly PASSING_THRESHOLD = 80;

  static evaluateReport(report: ResearchReport): BenchmarkEvaluationResult {
    const criteriaResults: RubricCriterionResult[] = [];

    // 1. Structural Completeness (25 pts)
    const hasTitle = Boolean(report.title && report.title.trim().length > 0);
    const hasSummary = Boolean(report.summary && report.summary.trim().length >= 20);
    const hasFindings = Array.isArray(report.keyFindings) && report.keyFindings.length >= 1;
    const hasSources = Array.isArray(report.sources) && report.sources.length >= 1;

    let structScore = 0;
    if (hasTitle) structScore += 5;
    if (hasSummary) structScore += 10;
    if (hasFindings) structScore += 5;
    if (hasSources) structScore += 5;

    criteriaResults.push({
      criterion: 'Structural Completeness',
      maxScore: 25,
      awardedScore: structScore,
      passed: structScore === 25,
      notes: `Title: ${hasTitle}, Summary: ${hasSummary}, Findings count: ${report.keyFindings.length}, Sources count: ${report.sources.length}`,
    });

    // 2. Evidence Traceability & Citation Integrity (30 pts)
    let citationScore = 30;
    const notes: string[] = [];

    if (report.keyFindings.length === 0) {
      citationScore = 0;
      notes.push('No findings to cite.');
    } else {
      let findingsWithValidUrls = 0;
      for (const finding of report.keyFindings) {
        const hasValidUrl =
          Array.isArray(finding.sourceUrls) &&
          finding.sourceUrls.length > 0 &&
          finding.sourceUrls.every((u) => u.startsWith('http://') || u.startsWith('https://'));

        if (hasValidUrl) {
          findingsWithValidUrls += 1;
        }
      }

      const ratio = findingsWithValidUrls / report.keyFindings.length;
      citationScore = Math.round(ratio * 30);
      notes.push(`${findingsWithValidUrls}/${report.keyFindings.length} findings properly cite valid URLs.`);
    }

    criteriaResults.push({
      criterion: 'Evidence Traceability',
      maxScore: 30,
      awardedScore: citationScore,
      passed: citationScore >= 25,
      notes: notes.join(' '),
    });

    // 3. Handling Uncertainty & Limitations (25 pts)
    let uncertScore = 0;
    const hasLimitations = Array.isArray(report.limitations) && report.limitations.length > 0;
    const hasGaps = Array.isArray(report.evidenceGaps) && report.evidenceGaps.length > 0;
    const hasQuestions = Array.isArray(report.unresolvedQuestions) && report.unresolvedQuestions.length > 0;

    if (hasLimitations) uncertScore += 10;
    if (hasGaps) uncertScore += 10;
    if (hasQuestions) uncertScore += 5;

    criteriaResults.push({
      criterion: 'Uncertainty & Transparency',
      maxScore: 25,
      awardedScore: uncertScore,
      passed: uncertScore >= 15,
      notes: `Disclosed limitations: ${hasLimitations}, Evidence gaps: ${hasGaps}, Unresolved questions: ${hasQuestions}`,
    });

    // 4. Source Metadata Richness (20 pts)
    let metaScore = 0;
    if (report.sources.length > 0) {
      const allHaveDomain = report.sources.every((s) => s.domain && s.domain.length > 0);
      const allHaveTimestamp = report.sources.every((s) => s.retrievedAt && s.retrievedAt.length > 0);

      if (allHaveDomain) metaScore += 10;
      if (allHaveTimestamp) metaScore += 10;
    }

    criteriaResults.push({
      criterion: 'Source Metadata Richness',
      maxScore: 20,
      awardedScore: metaScore,
      passed: metaScore === 20,
      notes: `All sources have domain: ${metaScore >= 10}, All sources have retrieved timestamp: ${metaScore === 20}`,
    });

    const totalScore = criteriaResults.reduce((acc, c) => acc + c.awardedScore, 0);
    const passed = totalScore >= this.PASSING_THRESHOLD;

    return {
      totalScore,
      passed,
      threshold: this.PASSING_THRESHOLD,
      criteriaResults,
    };
  }
}
