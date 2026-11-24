# Implementation Plan

Status legend: `not_started` · `in_progress` · `blocked` · `done`

> Update this file as work progresses. Mark an item done only after implementation, tests, and review are complete.


## B01 — Backend Foundation
Status: done
- [x] Confirm Node LTS version and package manager (Node v20.19.0 LTS, pnpm v10.15.1)
- [x] Initialize NestJS application
- [x] Review generated files and scripts
- [x] Establish initial module/folder structure (`src/modules/*`, `src/shared/*`)
- [x] Add configuration module and environment validation with Zod
- [x] Add logging conventions
- [x] Add global exception handling (`AllExceptionsFilter`)
- [x] Add health endpoint (`/health` & Swagger docs)
- [x] Establish Jest test conventions (Unit & E2E)
- [x] Add Docker development files (`Dockerfile`, `docker-compose.yml`)
- [x] Write setup guide (`docs/SETUP.md`)
- [x] Review and record decisions (ADR-004 updated to accepted)

## B02 — LLM Integration
Status: done
- [x] Select provider/model for first implementation (Google Gemini `gemini-3.5-flash` via `@google/genai`)
- [x] Define provider interface and normalized response (`ILlmProviderPort`, `LlmResponse`, `LlmMessage`)
- [x] Implement provider adapter (`GeminiProviderAdapter` and `MockLlmAdapter`)
- [x] Add configuration/secrets handling (`GEMINI_API_KEY`, `GEMINI_MODEL`, `.env` isolation)
- [x] Add structured output schema validation with Zod (`generateStructured<T>`)
- [x] Add timeout and error handling (`LlmTimeoutError`, `LlmRateLimitError`, `LlmProviderError`, `LlmSchemaValidationError`)
- [x] Add tests using a mocked provider (Unit tests for Mock & Gemini adapters, live smoke test script verified)

## B03 — Tool Calling
Status: done
- [x] Define tool interface and metadata (`ITool`, `ToolMetadata`, `ToolExecutionContext`)
- [x] Implement registry (`ToolRegistry` with allowlist filtering and LLM schema conversion)
- [x] Implement tool argument schema validation using Zod schemas
- [x] Implement tool dispatcher (`ToolDispatcher` enforcing backend authority and error boundaries)
- [x] Normalize tool observations (`ToolObservation` with execution timing and error categorization)
- [x] Add calculator tool (`CalculatorTool` using safe recursive-descent arithmetic parser, no eval)
- [x] Add mock research/search tool (`MockSearchTool` with technical corpus search and limit control)
- [x] Add timeout and policy checks (per-tool / per-call timeout and allowedTools allowlist)
- [x] Test success, invalid input, unknown tool, and failure (34 automated tests passing)

## B04 — Agent Loop
Status: done
- [x] Define decision schema (`AgentDecisionSchema` discriminated union: `tool_call`, `final_answer`, `request_clarification`)
- [x] Define Agent run state and event types (`AgentRunState`, `AgentBudgetConfig`, `AgentEvent`)
- [x] Implement iteration loop (`AgentOrchestratorService.run` loop with context builder)
- [x] Handle tool-call decision and final-answer decision (dispatching tools, capturing observations, terminating on answer)
- [x] Record observable decision summaries (rationales logged and captured in `decision.made` events)
- [x] Enforce iteration and tool-call budgets (hard limits for `maxIterations`, `maxToolCalls`, and `maxTotalDurationMs`)
- [x] Detect no-progress/repeated actions (`NoProgressDetector` detects repeated identical tool calls and consecutive failures)
- [x] Test loop behavior and stop conditions (44 unit/behavior tests passing covering all loop branches)

## B05 — Planning & Execution
Status: done
- [x] Define plan and step schemas (`PlanDraftSchema`, `StepDraftSchema`, `PlanStep`, `Plan`)
- [x] Generate plan from task (`AgentPlannerService` using LLM structured output)
- [x] Validate plan (`PlanValidator` ensuring DAG validity, unique IDs, and backward-only dependencies)
- [x] Track step status transitions (`StepStateMachine` and `PlanStateMachine` enforcing strict lifecycle transitions)
- [x] Execute sequential steps (`PlanExecutorService` executing steps via Agent Orchestrator with prerequisite checks)
- [x] Record outcomes and errors (capturing step output, tracking skipped steps on failure, recording trace events)
- [x] Test planner output and execution (60 tests passing across state machine, validator, planner, and executor)

## B06 — Evaluation & Recovery
Status: done
- [x] Define evaluation result contract (`EvaluationResult`, `EvaluationDecision`: continue, retry_step, replan, complete, fail)
- [x] Implement deterministic completion rules (all steps complete -> complete; step succeeded with remaining steps -> continue)
- [x] Implement retry policy (`RetryPolicy` with transient error detection, exponential backoff with jitter, step and task budgets)
- [x] Implement continue/replan/complete/fail decisions (`AgentEvaluatorService` combining metrics, error categorization, and recovery rules)
- [x] Add maximum retries and budget enforcement (`maxRetriesPerStep`, `maxTotalRetries`, and `maxReplans` strictly enforced)
- [x] Detect repeated failure/no progress (isolating non-transient failures, preventing blind retry loops)
- [x] Test decision branches (15 test suites passing with 71 unit/behavior tests covering all recovery and replanning scenarios)

## B07 — Research Tools
Status: done
- [x] Select search provider (Port/Adapter supporting Tavily & Mock search provider)
- [x] Implement search tool adapter (`WebSearchTool` with `ISearchProviderAdapter`, URL deduplication)
- [x] Implement URL/page reader (`PageReaderTool` with HTML text extraction, script/style stripping)
- [x] Normalize source records (`SourceEvidence`, `WebSearchResult`, `ExtractedPageContent` with domain & timestamp metadata)
- [x] Add evidence/source metadata (domain extraction, reliability score, character count, truncated flags)
- [x] Add safety & SSRF guardrails (`UrlSecurityValidator` blocking private IPs, cloud metadata endpoints, loopback, and prompt-injection delimiter wrapping)
- [x] Test empty, malformed, blocked, and failed retrievals (18 test suites, 87 unit/integration tests passing total)

## B08 — Research Workflow
Status: done
- [x] Define research report schema (`ResearchReportSchema` with executive summary, findings, comparisons, gaps, conflicts, limitations, and citations)
- [x] Map claims/findings to sources (every claim cites verified source URLs, with post-synthesis verification)
- [x] Identify gaps and conflicts (`evidenceGaps` and `conflictingInformation` structures disclosing uncertainty)
- [x] Produce report and source list (`ResearchSynthesizerService` with GitHub Flavored Markdown renderer and clickable links)
- [x] Build evaluation tasks and rubric (`ResearchBenchmark` with 4-pillar 100-point scoring rubric)
- [x] Run manual/automated quality review (21 test suites, 92 unit/integration tests passing covering end-to-end workflow)

## B09 — Persistence & History
Status: completed
- [x] Select persistence library/ORM and document decision (ADR-005 accepted: Port/Adapter pattern with relational + JSONB schema)
- [x] Create migrations and tables (`src/modules/persistence/migrations/001_initial_schema.sql` defining tasks, plans, plan_steps, agent_events, research_reports)
- [x] Persist tasks/plans/steps/tool executions/events/reports (`ITaskRepository`, `IEventRepository`, `InMemoryTaskRepository`, `InMemoryEventRepository`)
- [x] Add query endpoints and pagination (`POST /api/v1/tasks`, `GET /api/v1/tasks`, `GET /api/v1/tasks/:id`, `GET /api/v1/tasks/:id/events`, `GET /api/v1/tasks/:id/report`, `POST /api/v1/tasks/:id/cancel`)
- [x] Define transaction and consistency rules (`TaskStateMachine` enforcing non-reversible terminal states: completed, failed, cancelled)
- [x] Test persistence and status transitions (26 unit/integration suites, 127 tests passing + 2 E2E suites passing)

## B10 — Basic Phase Completion
Status: not_started
- [ ] Acceptance tests pass
- [ ] Review known limitations
- [ ] Update all project docs
- [ ] Create milestone/tag

## Advanced
Status: not_started
- [ ] Dynamic planning and plan revision history
- [ ] Memory design and implementation
- [ ] RAG pipeline
- [ ] Context management
- [ ] Multi-tool workflow improvements
- [ ] Research quality evaluation
- [ ] Agent framework comparison experiment

## Production
Status: not_started
- [ ] Queue and worker architecture
- [ ] Durable checkpoint and resume
- [ ] Idempotency
- [ ] Security and permission policies
- [ ] Auth and rate limiting
- [ ] Usage/cost tracking
- [ ] Observability
- [ ] Deployment and operations documentation
- [ ] Security, load, and end-to-end tests
