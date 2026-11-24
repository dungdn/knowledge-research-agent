# Roadmap — Basic → Advanced → Production

## Phase 1: BASIC — Build an Agent from Scratch
**Outcome:** a bounded, observable research Agent that works end-to-end.

### B01 — Backend Foundation
- [x] Confirm Node.js/npm versions and package manager
- [x] Create NestJS project and review its conventions
- [x] Define module boundaries and initial folder structure
- [x] Environment configuration and validation
- [x] Logger and exception handling baseline
- [x] Health endpoint
- [x] Jest setup and baseline tests
- [x] Docker development setup (optional early, required before phase close)
- [x] Document commands and architecture

### B02 — LLM Integration
- [x] Choose initial LLM provider/model and record decision
- [x] Build provider interface and adapter
- [x] Configure secrets and model settings
- [x] Basic prompt/message structures
- [x] Structured output and schema validation
- [x] Timeout, rate-limit, provider-error handling
- [x] Unit tests with mocked provider

### B03 — Tool Calling Foundations
- [x] Define Tool contract (name, description, input schema, execute)
- [x] Build Tool Registry
- [x] Validate tool names and arguments
- [x] Normalize success/error outputs into observations
- [x] Implement safe starter tools (e.g., calculator, mock search)
- [x] Tool timeout and execution limits
- [x] Tests for registry, validation, tool success/failure

### B04 — Agent Loop
- [x] Define agent iteration and lifecycle
- [x] Send task/context/tool descriptions to model
- [x] Parse model decisions (tool call, answer, continue/finish)
- [x] Execute selected tool and feed observation back
- [x] Enforce max iterations and budget
- [x] Record event timeline
- [x] Test normal finish, tool use, malformed decision, and limit reached

### B05 — Planning & Step Execution
- [x] Define plan/step types and statuses
- [x] Generate structured plan
- [x] Execute steps in order for first version
- [x] Capture step outcomes and dependencies
- [x] Track completed/pending/failed steps
- [x] Test plan validation and step transitions

### B06 — Evaluation, Retry & Replanning
- [x] Add rule-based evaluation criteria
- [x] Distinguish retry step, continue plan, replan, complete, and fail
- [x] Retry policy with limits/backoff where appropriate
- [x] Detect repeated/no-progress loops
- [x] Add evaluator model call only where rules are insufficient
- [x] Test all decision branches and budget boundaries

### B07 — Research Tools
- [x] Implement web search adapter (choose provider and record ADR)
- [x] Implement page reading/extraction tool
- [x] Normalize source metadata: title, URL, retrieval time, snippet/content
- [x] Source deduplication and basic quality metadata
- [x] Summarization tool or service
- [x] Respect provider policies, access controls, and content limits
- [x] Test tool failures, empty results, malformed URLs, and source handling

### B08 — End-to-End Research Task
- [x] Run research tasks across multiple sources
- [x] Collect evidence per finding
- [x] Identify missing/conflicting evidence
- [x] Produce structured report
- [x] Include source list and uncertainty/limitations
- [x] Build a small evaluation task set and assess output quality

### B09 — Persistence & History
- [x] Define database schema and migrations
- [x] Persist tasks, plans, steps, tool executions, events, and report
- [x] Add task detail/history endpoints
- [x] Handle transaction boundaries and status transitions
- [x] Test persistence and retrieval

### B10 — Basic Phase Gate
- [x] Complete acceptance criteria in TESTING_STRATEGY.md
- [x] Review architecture and known limitations
- [x] Update docs and changelog
- [x] Tag a Basic milestone release

## Phase 2: ADVANCED — Build a More Adaptive Agent
- [ ] Dynamic planning based on observations
- [ ] Replanning strategies and plan versioning
- [ ] Memory types: task memory and reusable knowledge (separate concerns)
- [ ] Retrieval-Augmented Generation (RAG) for uploaded/reference material
- [ ] Context window management and summarization
- [ ] Multi-tool workflows and tool selection improvements
- [ ] Evidence quality, source triangulation, and conflicting claims
- [ ] Research rubric and evaluation dataset
- [ ] Optional human approval checkpoints
- [ ] Compare handcrafted Agent Core with an agent framework (e.g. LangGraph) in a separate experiment

## Phase 3: PRODUCTION — Reliable Agent Service
- [ ] Queue-backed asynchronous tasks
- [ ] Durable state, checkpoints, resume/recovery
- [ ] Idempotency and duplicate handling
- [ ] Authentication, authorization, and tenant boundaries (if productized)
- [ ] Tool permission tiers and policy enforcement
- [ ] Rate limiting and quotas
- [ ] Token, latency, and cost tracking
- [ ] Observability: structured logs, metrics, traces
- [ ] Operational dashboards and alerts
- [ ] Integration and end-to-end tests
- [ ] Deployment configuration, migrations, backup/restore plan
- [ ] Security review and threat model
- [ ] Load/performance tests and operational runbook

## Phase gates
- Do not begin the next phase merely because code exists; meet the previous phase's acceptance criteria.
- Each milestone should produce a runnable state, tests, updated docs, and a review of what was learned.
- Scope can change, but changes should be recorded in DECISIONS.md and reflected in this roadmap.
