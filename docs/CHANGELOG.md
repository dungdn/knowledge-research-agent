# Changelog

All notable project changes are recorded here. Keep entries concise and grouped by milestone. This project has not yet begun implementation; the initial entries record planning documents only.\n

## [Unreleased]

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
