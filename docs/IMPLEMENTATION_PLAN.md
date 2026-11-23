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
Status: not_started
- [ ] Define tool interface and metadata
- [ ] Implement registry
- [ ] Implement tool argument schema validation
- [ ] Implement tool dispatcher
- [ ] Normalize tool observations
- [ ] Add calculator tool
- [ ] Add mock research/search tool
- [ ] Add timeout and policy checks
- [ ] Test success, invalid input, unknown tool, and failure

## B04 — Agent Loop
Status: not_started
- [ ] Define decision schema
- [ ] Define Agent run state and event types
- [ ] Implement iteration loop
- [ ] Handle tool-call decision and final-answer decision
- [ ] Record observable decision summaries
- [ ] Enforce iteration and tool-call budgets
- [ ] Detect no-progress/repeated actions
- [ ] Test loop behavior and stop conditions

## B05 — Planning & Execution
Status: not_started
- [ ] Define plan and step schemas
- [ ] Generate plan from task
- [ ] Validate plan
- [ ] Track step status transitions
- [ ] Execute sequential steps
- [ ] Record outcomes and errors
- [ ] Test planner output and execution

## B06 — Evaluation & Recovery
Status: not_started
- [ ] Define evaluation result contract
- [ ] Implement deterministic completion rules
- [ ] Implement retry policy
- [ ] Implement continue/replan/complete/fail decisions
- [ ] Add maximum retries and budget enforcement
- [ ] Detect repeated failure/no progress
- [ ] Test decision branches

## B07 — Research Tools
Status: not_started
- [ ] Select search provider
- [ ] Implement search tool adapter
- [ ] Implement URL/page reader
- [ ] Normalize source records
- [ ] Add evidence/source metadata
- [ ] Add summarization
- [ ] Test empty, malformed, blocked, and failed retrievals

## B08 — Research Workflow
Status: not_started
- [ ] Define research report schema
- [ ] Map claims/findings to sources
- [ ] Identify gaps and conflicts
- [ ] Produce report and source list
- [ ] Build evaluation tasks and rubric
- [ ] Run manual/automated quality review

## B09 — Persistence & History
Status: not_started
- [ ] Select persistence library/ORM and document decision
- [ ] Create migrations and tables
- [ ] Persist tasks/plans/steps/tool executions/events/reports
- [ ] Add query endpoints and pagination
- [ ] Define transaction and consistency rules
- [ ] Test persistence and status transitions

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
