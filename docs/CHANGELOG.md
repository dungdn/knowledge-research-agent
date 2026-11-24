# Changelog

All notable project changes are recorded here. Keep entries concise and grouped by milestone. This project has not yet begun implementation; the initial entries record planning documents only.\n

## [0.1.0-basic] - 2026-11-24

### B10 — Basic Phase Completion & Phase Gate
- **Added:**
  - `Phase 1 (Basic) Acceptance Gate Test Suite` (`src/modules/tasks/acceptance/basic-phase.acceptance.spec.ts`) validating all 7 criteria from `TESTING_STRATEGY.md` Section 7:
    1. Clear module responsibilities and verified boundaries.
    2. Multi-step research completion with structured findings.
    3. Chronological trace event logging across all execution phases.
    4. Bounded autonomy, error handling, and immutable terminal state machine invariants.
    5. Anti-hallucination source citation and uncertainty disclosures.
    6. Persistence and retrieval of tasks, plans, events, and reports.
    7. Overall quality benchmark score $\ge 80/100$ via `ResearchBenchmark`.
  - `docs/KNOWN_LIMITATIONS.md`: Comprehensive review of architectural trade-offs (in-memory adapter default, sequential DAG planning, short-term session memory, single coordinator, single-process execution).
  - Root `README.md`: Professional project documentation featuring architecture diagrams, quickstart guide, API documentation, testing instructions, and roadmap overview.
  - Learning notes at `docs/learning/B10_BASIC_PHASE_COMPLETION.md`.
  - Updated `docs/ROADMAP.md` and `docs/IMPLEMENTATION_PLAN.md` with all Phase 1 milestones (B01–B10) completed.
  - Prepared release tag `v0.1.0-basic`.

### B09 — Persistence & History (2026-11-24)
- **Added:**
  - `ITaskRepository` & `IEventRepository`: Hexagonal domain ports defining storage, pagination, filtering, and audit log retrieval.
  - `InMemoryTaskRepository` & `InMemoryEventRepository`: Thread-safe, deep-cloning in-memory adapters for fast testing and standalone operation.
  - PostgreSQL Relational + JSONB Schema DDL (`src/modules/persistence/migrations/001_initial_schema.sql`) defining `tasks`, `plans`, `plan_steps`, `agent_events`, and `research_reports` tables with foreign keys and cascade deletions.
  - `TaskStateMachine`: Finite State Machine enforcing task lifecycle transitions (`queued` $\to$ `running` $\to$ `completed` | `failed` | `cancelled`) and guarding terminal state invariants.
  - `TasksService`: Application service managing task creation, async execution via `ResearchWorkflowService`, event synchronization, report queries, and cancellation.
  - `TasksController`: REST API endpoints under `/api/v1/tasks` with full Swagger annotations:
    - `POST /api/v1/tasks`: Submit and run research task.
    - `GET /api/v1/tasks`: List tasks with status filtering and pagination.
    - `GET /api/v1/tasks/:id`: Retrieve task detail.
    - `GET /api/v1/tasks/:id/events`: Retrieve chronological audit telemetry events.
    - `GET /api/v1/tasks/:id/report`: Retrieve synthesized research report and markdown artifact.
    - `POST /api/v1/tasks/:id/cancel`: Cancel an active or queued task.
  - Comprehensive unit and E2E tests: 26 unit test suites (127 tests) and 2 E2E test suites passing 100%.
  - Learning notes at `docs/learning/B09_PERSISTENCE.md`.
  - Updated ADR-005 in `docs/DECISIONS.md` to accepted.

### B08 — End-to-End Research Workflow (2026-11-24)
- **Added:**
  - `ResearchReportSchema`: Comprehensive Zod schema enforcing executive summary, key findings, claim-to-source mapping, comparisons, conflicting viewpoints, evidence gaps, and methodology limitations.
  - `ResearchSynthesizerService`: Synthesis engine aggregating plan step execution outputs and collected web evidence into structured, verifiable reports.
  - Markdown Renderer: Automatically formats reports into clean GitHub Flavored Markdown with confidence badges and clickable markdown source links.
  - Citation Integrity Verification: Validates that all URLs cited by the model strictly match the pool of collected sources, preventing hallucinated citations.
  - `ResearchWorkflowService`: Full end-to-end orchestrator tying goal intake $\to$ plan generation $\to$ self-healing step execution $\to$ evidence collection $\to$ synthesis $\to$ markdown output.
  - `ResearchBenchmark`: 100-point evaluation rubric assessing structural completeness, evidence traceability, uncertainty disclosure, and source metadata richness.
  - Comprehensive unit and integration tests across synthesis, workflow orchestration, and benchmark evaluations (21 test suites, 92 tests passing total).
  - Learning notes at `docs/learning/B08_RESEARCH_WORKFLOW.md`.

### B07 — Research Tools (2026-11-23)
- **Added:**
  - `SourceEvidence`, `WebSearchResult`, and `ExtractedPageContent` data models for structured research evidence.
  - `ISearchProviderAdapter` port with `MockSearchAdapter` and `TavilySearchAdapter`.
  - `WebSearchTool`: Approved tool querying external search engines, normalizing domain and snippet metadata, and deduplicating URLs.
  - `UrlSecurityValidator`: Enterprise-grade SSRF protection blocking local/private network ranges (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16-31.0.0`), IPv6 loopback (`::1`), cloud metadata endpoints (`169.254.169.254`), and non-HTTP protocols.
  - `PageReaderTool`: Safe web page text extractor stripping script, style, navigation, and SVG tags, decoding HTML entities, and delimiting untrusted external text with prompt-injection boundary tags (`[EXTERNAL_UNTRUSTED_CONTENT]`).
  - `ResearchModule` integrated into `AppModule`, automatically registering research tools into `ToolRegistry`.
  - Comprehensive unit tests covering search normalization, URL deduplication, HTML sanitization, SSRF prevention, and error handling (18 test suites, 87 tests passing total).
  - Learning notes at `docs/learning/B07_RESEARCH_TOOLS.md`.

### B06 — Evaluation, Retry & Replanning (2026-11-23)
- **Added:**
  - `EvaluationResult` & `EvaluationMetrics`: Typed contracts defining evaluation outcomes (`continue`, `retry_step`, `replan`, `complete`, `fail`).
  - `RetryPolicy`: Intelligent error categorization distinguishing transient failures (timeouts, 429, 503) from permanent ones (syntax, missing tools, validation errors), with exponential backoff and jitter.
  - `AgentEvaluatorService`: Rule-based evaluation engine coordinating step success assessment, transient retries, replan triggering, and terminal failure determination.
  - Automatic Plan Recovery in `PlanExecutorService`:
    - Handles transient step failure via controlled retry with backoff.
    - Handles permanent step failure via automatic plan revision (`replan`), superseding current plan and executing revised plan v2.
  - Telemetry: Added `evaluation.completed` and `plan.revised` events to `AgentEvent`.
  - Comprehensive unit and behavior tests covering retry policy, evaluation decision branches, and plan executor recovery (15 test suites, 71 tests passing total).
  - Learning notes at `docs/learning/B06_EVALUATION_AND_RECOVERY.md`.

### B05 — Planning & Step Execution (2026-11-23)
- **Added:**
  - `PlanDraftSchema` and `StepDraftSchema`: Zod schemas for structured plan decomposition (goal, summary, steps with expected tools and dependencies).
  - `StepStateMachine` & `PlanStateMachine`: Strict finite state machines enforcing validated transitions (`pending` -> `running` -> `completed` / `failed` / `skipped` / `retrying`).
  - `PlanValidator`: Validates unique step identifiers, prevents self-dependency, and enforces DAG constraints (no forward references or cyclic dependencies).
  - `AgentPlannerService`: Generates structured execution plans from high-level user goals using LLM structured outputs.
  - `PlanExecutorService`: Orchestrates sequential step execution, verifies prerequisite dependencies, captures step outputs, and handles step failures and skips.
  - Extended `AgentEvent` with plan/step telemetry (`plan.created`, `plan.completed`, `step.started`, `step.completed`, `step.failed`).
  - 4 comprehensive test suites for state machine, validator, planner service, and plan executor (60 tests passing total).
  - Learning notes at `docs/learning/B05_PLANNING.md`.

### B04 — Agent Loop (2026-11-23)
- **Added:**
  - `AgentDecisionSchema`: Discriminated union schema for model decisions (`tool_call`, `final_answer`, `request_clarification`).
  - `AgentRunState` & `AgentBudgetConfig`: Typed structures tracking lifecycle, iterations, tool call counts, timing, and budgets.
  - `EventRecorder`: In-memory structured telemetry tracking 12 distinct event types (`task.started`, `iteration.started`, `llm.requested`, `decision.made`, `tool.dispatched`, `tool.observed`, etc.).
  - `NoProgressDetector`: Loop guardrail detecting repeated identical tool calls with same parameters and consecutive tool execution errors.
  - `AgentPromptBuilder`: Structured system instruction and conversation history builder with prior decisions and observations.
  - `AgentOrchestratorService`: Core bounded loop orchestrating decision intake, tool dispatching, observation capture, budget enforcement, and stopping conditions.
  - Comprehensive unit and behavior tests for loop termination, tool use, clarification, budget exhaustion, and no-progress detection (44 tests passing total).
  - Learning notes at `docs/learning/B04_AGENT_LOOP.md`.

### B03 — Tool Calling Foundations (2026-11-23)
- **Added:**
  - `ITool` interface and `BaseTool` abstract class integrating metadata, Zod schema, and automatic JSON schema mapping.
  - `ToolRegistry` service for managing approved tools and generating LLM tool definitions with allowlist filtering.
  - `ToolDispatcher` service implementing ADR-002 (backend-controlled tool execution): checks existence, allowlist policy, validates arguments with Zod, and executes within strict timeouts.
  - Standardized `ToolObservation` output format capturing status, data, categorized errors, execution duration, and timestamp.
  - Domain error classes: `ToolNotFoundError`, `ToolArgumentValidationError`, `ToolExecutionError`, `ToolTimeoutError`, and `ToolPolicyDeniedError`.
  - `CalculatorTool`: Safe recursive-descent arithmetic evaluator supporting arithmetic operators, parentheses, and decimals without `eval()`.
  - `MockSearchTool`: Simulated research search engine indexing technical documents.
  - Unit tests for ToolRegistry, ToolDispatcher, CalculatorTool, and MockSearchTool (34 tests passing total).
  - Learning notes at `docs/learning/B03_TOOL_CALLING.md`.

### B02 — LLM Integration (2026-11-23)
- **Added:**
  - `ILlmProviderPort` domain interface with normalized types (`LlmMessage`, `LlmResponse`, `LlmToolCallProposal`, `LlmUsage`, `LlmToolDefinition`).
  - `MockLlmAdapter` for deterministic unit testing with queueing and call inspection.
  - `GeminiProviderAdapter` integrating `@google/genai` with model `gemini-3.5-flash`.
  - Structured output generation and runtime schema validation with Zod (`generateStructured`).
  - Domain error taxonomy (`LlmTimeoutError`, `LlmRateLimitError`, `LlmProviderError`, `LlmSchemaValidationError`).
  - Global `LlmModule` providing `LLM_PROVIDER_TOKEN`.
  - Live Gemini API verification script (`scripts/smoke-test-gemini.ts`) verified with real API key.
  - Learning notes at `docs/learning/B02_LLM_INTEGRATION.md`.
- **Decisions:**
  - Added ADR-008: Google Gemini as primary live provider with Port/Adapter architecture.
- **Tests/verification:**
  - 15 unit tests passing across Mock adapter, Gemini adapter, and health controller.
  - Live Gemini API connection verified successfully.

### B01 — Backend Foundation (2026-11-23)
- **Added:**
  - Initialized NestJS 10 application with TypeScript and pnpm.
  - Core directory structure with Clean Architecture module boundaries (`agent`, `llm`, `tools`, `research`, `tasks`, `health`, `shared`).
  - Runtime environment schema validation using Zod (`src/shared/config/env.schema.ts`).
  - Global exception filter (`AllExceptionsFilter`) with structured error response and logging.
  - Health endpoint (`GET /health`) returning status, uptime, service, and timestamp.
  - Swagger OpenAPI integration at `/api/docs`.
  - Docker containerization (`Dockerfile` multi-stage build, `docker-compose.yml`).
  - Setup guide (`docs/SETUP.md`) and initial learning notes (`docs/learning/B01_BACKEND_FOUNDATION.md`).
  - Automated unit tests and E2E tests for health check.
- **Decisions:**
  - Updated ADR-004 (Zod validation at system & AI boundaries) from proposed to accepted.
- **Tests/verification:**
  - `pnpm build`: passed.
  - `pnpm test`: unit tests passed.
  - `pnpm test:e2e`: e2e tests passed.

### Planning
- Established project vision: AI Research & Learning Agent focused on learning Agent fundamentals and extensible product architecture.
- Defined phased roadmap: Basic → Advanced → Production.
- Proposed NestJS modular-monolith architecture and core module boundaries.
- Added initial architecture decision records for framework-free Agent Core, backend-controlled tools, modular monolith, runtime schema validation, persistence direction, trace principles, and milestone-based development.
- Created learning, implementation, agent-design, and testing plans.

## Change entry template
### YYYY-MM-DD — Milestone or change title
- Added:
- Changed:
- Removed:
- Decisions:
- Tests/verification:
