# Changelog

All notable project changes are recorded here. Keep entries concise and grouped by milestone. This project has not yet begun implementation; the initial entries record planning documents only.\n

## [Unreleased]

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
