import { z } from 'zod';

export const ResearchFindingSchema = z.object({
  claim: z.string().min(1).describe('A clear factual finding or claim'),
  evidence: z
    .string()
    .min(1)
    .describe('Supporting evidence or context extracted from sources'),
  sourceUrls: z
    .array(z.string().url())
    .min(1, 'Each key finding must cite at least one source URL')
    .describe('Exact source URLs backing this claim'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('Confidence level in this finding based on evidence strength'),
});

export const ResearchComparisonItemSchema = z.object({
  topic: z.string().min(1).describe('The subject or technology being compared'),
  criteria: z.string().min(1).describe('Comparison dimension or criterion'),
  details: z.string().min(1).describe('Analysis and comparison details'),
  sources: z.array(z.string().url()).default([]),
});

export const ConflictingInformationSchema = z.object({
  topic: z.string().min(1).describe('Topic where sources or claims diverge'),
  viewpointA: z.string().min(1).describe('First perspective or claim'),
  viewpointB: z.string().min(1).describe('Contrasting perspective or claim'),
  sourceA: z.string().optional().describe('Source URL supporting viewpoint A'),
  sourceB: z.string().optional().describe('Source URL supporting viewpoint B'),
});

export const CitedSourceSchema = z.object({
  url: z.string().url().describe('Canonical URL of the source'),
  title: z.string().min(1).describe('Title of the source document or article'),
  domain: z.string().min(1).describe('Domain name of the source'),
  retrievedAt: z.string().describe('Timestamp when the source was retrieved'),
});

export const ResearchReportSchema = z.object({
  title: z.string().min(1).describe('Clear, descriptive title for the report'),
  summary: z
    .string()
    .min(1)
    .describe('Executive summary synthesizing the primary answers to the research goal'),
  keyFindings: z
    .array(ResearchFindingSchema)
    .min(1, 'Report must contain at least one verifiable finding'),
  comparisons: z
    .array(ResearchComparisonItemSchema)
    .default([])
    .describe('Structured comparative analysis, if applicable'),
  conflictingInformation: z
    .array(ConflictingInformationSchema)
    .default([])
    .describe('Transparent disclosure of conflicting evidence across sources'),
  evidenceGaps: z
    .array(z.string())
    .default([])
    .describe('Areas where sufficient evidence was not found or remains unverified'),
  limitations: z
    .array(z.string())
    .default([])
    .describe('Methodological and scope limitations of this research run'),
  unresolvedQuestions: z
    .array(z.string())
    .default([])
    .describe('Open questions for further investigation or user consideration'),
  sources: z
    .array(CitedSourceSchema)
    .min(1, 'Report must list all cited sources'),
});

export type ResearchFinding = z.output<typeof ResearchFindingSchema>;
export type ResearchComparisonItem = z.output<typeof ResearchComparisonItemSchema>;
export type ConflictingInformation = z.output<typeof ConflictingInformationSchema>;
export type CitedSource = z.output<typeof CitedSourceSchema>;
export type ResearchReport = z.output<typeof ResearchReportSchema>;
