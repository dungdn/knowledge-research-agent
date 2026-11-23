# Knowledge Research Agent (KRA) — Project Overview

## 1. Vision
Build an AI Research & Learning Agent that can take a research/learning request, understand the goal, plan work, select and use approved tools, inspect results, evaluate progress, continue or replan when needed, and produce a useful evidence-based report.

The primary purpose of this project is educational: understand how an Agent works by building its core mechanisms rather than hiding them behind an agent framework. The architecture should nevertheless be clean enough to evolve into a commercial product.

## 2. Goals
- Learn Agent fundamentals hands-on: orchestration, planning, tool calling, observations, state, evaluation, retries, stopping conditions.
- Build a working research workflow with traceable steps and sources.
- Use Node.js, NestJS, and TypeScript.
- Develop sequentially: Basic → Advanced → Production.
- Keep decisions, implementation, and tests documented as the project evolves.
- Design replaceable provider/tool interfaces and controlled execution.

## 3. Non-goals for Basic
- Autonomous agents with unrestricted actions.
- Multi-agent collaboration.
- Production-scale distributed execution.
- Complex UI/frontend.
- Training or fine-tuning foundation models.
- Using an agent framework to implement the core loop before the mechanics are understood.

## 4. Target user and use cases
Initial target: a developer or learner who wants to research a technical topic and receive a structured learning report.\nExample tasks:
- Research a technology and explain its architecture and use cases.
- Compare two technologies against a set of criteria.
- Create a learning roadmap for a topic.
- Investigate a question using multiple sources, identify gaps, and synthesize findings.

## 5. Agent capabilities
1. Task intake and goal clarification (when necessary).
2. Task analysis and scope definition.
3. Plan generation with structured steps.
4. Tool selection from an approved registry.
5. Tool execution with validated input and normalized output.
6. Observation capture and state updates.
7. Evaluation of step/task progress.
8. Retry, continuation, or replanning within limits.
9. Final synthesis with sources, limitations, and unresolved questions.
10. Traceability: record observable decisions, tool inputs/outputs, events, and evaluation outcomes.

## 6. Principles
- Backend control over model suggestions: the model proposes; the backend validates and authorizes.
- Explicit state: task, plan, step, execution, and event statuses are represented in typed structures.
- Bounded autonomy: iteration, time, tool, and token/cost budgets are enforced.
- Tool safety: allowlist tools, validate arguments, apply timeouts, and avoid unsafe side effects.
- Provider independence: core logic does not depend on a single LLM vendor.
- Observable behavior: log decision summaries, not hidden chain-of-thought.
- Incremental architecture: introduce abstractions when they solve a demonstrated need.
- Testability: deterministic components and mocked model/tool dependencies are testable.

## 7. Technology baseline
- Runtime: Node.js (choose and pin a supported LTS version during B01).
- Framework: NestJS.
- Language: TypeScript.
- Validation: Zod for schemas at model/tool boundaries (subject to B01/B02 confirmation).
- Database: PostgreSQL for task and execution persistence when persistence milestone begins.
- Tests: Jest (NestJS default) initially.
- Containers: Docker for reproducible local development.
- Queue: Redis + BullMQ introduced in Production phase when asynchronous execution is needed.

## 8. Success criteria
### Basic
- Accept a research task via API.
- Produce a plan and execute steps.
- Use at least one external research tool and one utility tool.
- Record every step and tool execution.
- Evaluate incomplete results and continue/retry/replan within configured limits.
- Return a report with citations/links and limitations.
- Automated tests cover core loop, tools, error handling, and stopping conditions.
### Advanced
- Dynamic plans, replan strategy, memory, retrieval, context management, source quality checks.
- Research quality is evaluated with a repeatable test set.
### Production
- Durable task execution, queueing, resume/checkpoint, observability, access control, rate limits, usage tracking, and deployment-ready configuration.

## 9. Risks and mitigations
- Unbounded loops: hard iteration and budget caps.
- Hallucinated tool arguments: schema validation and tool allowlist.
- Weak or conflicting sources: evidence metadata, source comparison, explicit uncertainty.
- Provider outages: timeout, retry with backoff, clear failure states.
- Duplicate actions: idempotency for side-effecting tools.
- Excessive complexity: phase gates and architecture reviews.
- Secrets leakage: environment secrets, redaction, no secrets in logs.

## 10. Learning workflow
For each milestone: Learn concepts → Design → Implement incrementally → Test → Inspect traces → Review trade-offs → Update docs and decision records.
