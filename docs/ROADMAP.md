# Roadmap — Basic → Advanced → Production

## Phase 1: BASIC — Build an Agent from Scratch
**Outcome:** a bounded, observable research Agent that works end-to-end.

### B01 — Backend Foundation
- [ ] Confirm Node.js/npm versions and package manager
- [ ] Create NestJS project and review its conventions
- [ ] Define module boundaries and initial folder structure
- [ ] Environment configuration and validation
- [ ] Logger and exception handling baseline
- [ ] Health endpoint
- [ ] Jest setup and baseline tests
- [ ] Docker development setup (optional early, required before phase close)
- [ ] Document commands and architecture

### B02 — LLM Integration
- [ ] Choose initial LLM provider/model and record decision
- [ ] Build provider interface and adapter
- [ ] Configure secrets and model settings
- [ ] Basic prompt/message structures
- [ ] Structured output and schema validation
- [ ] Timeout, rate-limit, provider-error handling
- [ ] Unit tests with mocked provider

### B03 — Tool Calling Foundations
- [ ] Define Tool contract (name, description, input schema, execute)
- [ ] Build Tool Registry
- [ ] Validate tool names and arguments
- [ ] Normalize success/error outputs into observations
- [ ] Implement safe starter tools (e.g., calculator, mock search)
- [ ] Tool timeout and execution limits
- [ ] Tests for registry, validation, tool success/failure

### B04 — Agent Loop
- [ ] Define agent iteration and lifecycle
- [ ] Send task/context/tool descriptions to model
- [ ] Parse model decisions (tool call, answer, continue/finish)
- [ ] Execute selected tool and feed observation back
- [ ] Enforce max iterations and budget
- [ ] Record event timeline
- [ ] Test normal finish, tool use, malformed decision, and limit reached

### B05 — Planning & Step Execution
- [ ] Define plan/step types and statuses
- [ ] Generate structured plan
- [ ] Execute steps in order for first version
- [ ] Capture step outcomes and dependencies
- [ ] Track completed/pending/failed steps
- [ ] Test plan validation and step transitions

### B06 — Evaluation, Retry & Replanning
- [ ] Add rule-based evaluation criteria
- [ ] Distinguish retry step, continue plan, replan, complete, and fail
- [ ] Retry policy with limits/backoff where appropriate
- [ ] Detect repeated/no-progress loops
- [ ] Add evaluator model call only where rules are insufficient
- [ ] Test all decision branches and budget boundaries

### B07 — Research Tools
- [ ] Implement web search adapter (choose provider and record ADR)
- [ ] Implement page reading/extraction tool
- [ ] Normalize source metadata: title, URL, retrieval time, snippet/content
- [ ] Source deduplication and basic quality metadata
- [ ] Summarization tool or service
- [ ] Respect provider policies, access controls, and content limits
- [ ] Test tool failures, empty results, malformed URLs, and source handling

### B08 — End-to-End Research Task
- [ ] Run research tasks across multiple sources
- [ ] Collect evidence per finding
- [ ] Identify missing/conflicting evidence
- [ ] Produce structured report
- [ ] Include source list and uncertainty/limitations
- [ ] Build a small evaluation task set and assess output quality

### B09 — Persistence & History
- [ ] Define database schema and migrations
- [ ] Persist tasks, plans, steps, tool executions, events, and report
- [ ] Add task detail/history endpoints
- [ ] Handle transaction boundaries and status transitions
- [ ] Test persistence and retrieval

### B10 — Basic Phase Gate
- [ ] Complete acceptance criteria in TESTING_STRATEGY.md
- [ ] Review architecture and known limitations
- [ ] Update docs and changelog
- [ ] Tag a Basic milestone release

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
