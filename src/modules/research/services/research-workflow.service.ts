import { Injectable, Logger } from '@nestjs/common';
import { AgentPlannerService } from '../../agent/planning/agent-planner.service';
import { PlanExecutorService } from '../../agent/planning/plan-executor.service';
import { ResearchSynthesizerService } from './research-synthesizer.service';
import { EventRecorder } from '../../agent/events/event-recorder';
import { ResearchReport } from '../interfaces/research-report.types';
import { SourceEvidence, WebSearchResult, ExtractedPageContent } from '../interfaces/evidence.types';
import { Plan } from '../../agent/planning/interfaces/plan.types';

export interface ResearchWorkflowOptions {
  taskId?: string;
  allowedTools?: string[];
  maxRetriesPerStep?: number;
  maxReplans?: number;
}

export interface ResearchWorkflowOutput {
  taskId: string;
  plan: Plan;
  report: ResearchReport;
  markdown: string;
  durationMs: number;
}

@Injectable()
export class ResearchWorkflowService {
  private readonly logger = new Logger(ResearchWorkflowService.name);

  constructor(
    private readonly planner: AgentPlannerService,
    private readonly executor: PlanExecutorService,
    private readonly synthesizer: ResearchSynthesizerService,
    private readonly eventRecorder: EventRecorder,
  ) {}

  async executeResearchTask(
    query: string,
    options?: ResearchWorkflowOptions,
  ): Promise<ResearchWorkflowOutput> {
    const startTime = Date.now();
    const taskId =
      options?.taskId ||
      `task_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const allowedTools = options?.allowedTools || [
      'web_search',
      'page_reader',
      'calculator',
    ];

    this.logger.log(`Initiating end-to-end research workflow for: "${query}" [Task: ${taskId}]`);

    // 1. Generate Structured Plan
    const initialPlan = await this.planner.createPlan({
      taskId,
      goal: query,
      allowedTools,
    });

    // 2. Execute Plan with automated self-healing retries & replanning
    const execResult = await this.executor.executePlan(initialPlan, {
      maxRetriesPerStep: options?.maxRetriesPerStep,
      maxReplans: options?.maxReplans,
    });

    // 3. Extract completed step outputs and aggregated evidence sources
    const stepOutputs = execResult.plan.steps
      .filter((s) => s.status === 'completed' && s.output)
      .map((s) => ({
        title: s.title,
        output: String(s.output),
      }));

    const collectedSources = this.extractSourcesFromEvents(taskId);

    // 4. Synthesize final evidence-based report
    const report = await this.synthesizer.synthesize({
      goal: query,
      stepOutputs,
      collectedSources,
    });

    // 5. Render to clean GitHub Flavored Markdown
    const markdown = this.synthesizer.formatAsMarkdown(report);
    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Research workflow [${taskId}] completed in ${durationMs}ms with ${report.keyFindings.length} verified findings`,
    );

    return {
      taskId,
      plan: execResult.plan,
      report,
      markdown,
      durationMs,
    };
  }

  private extractSourcesFromEvents(taskId: string): SourceEvidence[] {
    const events = this.eventRecorder.getEvents(taskId);
    const sourcesMap = new Map<string, SourceEvidence>();

    for (const event of events) {
      if (event.eventType === 'tool.observed') {
        const payload = event.payload as any;
        const toolName = payload?.toolName;

        // If tool was web_search
        if (toolName === 'web_search') {
          const obsData = payload?.observation?.data as WebSearchResult;
          if (obsData?.sources && Array.isArray(obsData.sources)) {
            for (const src of obsData.sources) {
              if (src.url && !sourcesMap.has(src.url)) {
                sourcesMap.set(src.url, src);
              }
            }
          }
        }

        // If tool was page_reader
        if (toolName === 'page_reader') {
          const pageData = payload?.observation?.data as ExtractedPageContent;
          if (pageData?.url && !sourcesMap.has(pageData.url)) {
            sourcesMap.set(pageData.url, {
              url: pageData.url,
              title: pageData.title || pageData.domain,
              domain: pageData.domain,
              snippet: (pageData.textContent || '').substring(0, 300),
              retrievedAt: pageData.retrievedAt,
              reliabilityScore: 0.9,
            });
          }
        }
      }
    }

    return Array.from(sourcesMap.values());
  }
}
