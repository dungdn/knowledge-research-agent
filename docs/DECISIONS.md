# Architecture Decisions (ADR Log)

This file is the index/log of meaningful technical and product decisions. Add an ADR entry when a decision changes architecture, dependencies, workflow, or long-term direction.


## Decision record template
### ADR-NNN — Short title
- **Status:** proposed | accepted | superseded | rejected
- **Date:** YYYY-MM-DD
- **Context / problem:** What problem are we solving? Why must we decide now?
- **Options considered:** List realistic alternatives.
- **Decision:** What was chosen?
- **Rationale:** Why is this option preferred?
- **Consequences:** Benefits, drawbacks, risks, costs, and constraints.
- **Revisit triggers:** What future evidence or milestone would justify changing this?

---

## ADR-001 — Build Agent Core without an Agent Framework initially
- **Status:** accepted
- **Date:** 2026-11-22
- **Context / problem:** The project's primary goal is to understand Agent mechanics deeply. An agent framework could obscure orchestration, tool calling, state, evaluation, and stopping behavior.
- **Options considered:** (1) Use a framework immediately; (2) implement a small bounded Agent Core ourselves; (3) build everything from scratch including low-level model API plumbing without abstractions.
- **Decision:** Implement a minimal, well-tested Agent Core ourselves during Basic. Provider SDK calls still sit behind an adapter. Later, compare a framework in a controlled experiment.
- **Rationale:** The learning objective is best served by directly inspecting the loop and contracts, while adapter boundaries preserve flexibility.
- **Consequences:** More implementation and testing effort initially; greater visibility into mechanics. Must avoid reinventing mature production infrastructure indefinitely.
- **Revisit triggers:** After Basic completion, evaluate LangGraph or similar frameworks for advanced orchestration and production reliability.

## ADR-002 — Backend-controlled Tool Execution
- **Status:** accepted
- **Date:** 2026-11-22
- **Context / problem:** Model tool calls are proposals and must not be trusted as authorization or executable input.
- **Options considered:** (1) Execute model tool requests directly; (2) validate against registry, schemas, policy, and budgets before execution.
- **Decision:** Backend validates tool existence, arguments, permission, and limits before invoking an implementation.
- **Rationale:** Safety, reliability, and separation of model decision from execution authority.
- **Consequences:** Requires registry and validation code; invalid proposals become controlled observations/errors.
- **Revisit triggers:** Tool permission model evolves as external or side-effecting tools are introduced.

## ADR-003 — Modular Monolith for Initial Development
- **Status:** accepted
- **Date:** 2026-11-22
- **Context / problem:** Need clear boundaries without introducing distributed-system complexity before it is justified.
- **Options considered:** (1) Single unstructured module; (2) modular monolith; (3) microservices from day one.
- **Decision:** Use NestJS modular monolith with boundaries around Agent, LLM, Tools, Research, Tasks, and later Memory.
- **Rationale:** Simpler local development and debugging while preserving separation of responsibilities.
- **Consequences:** Module discipline is required; deployment remains simpler. Modules can be extracted later if measurable needs emerge.
- **Revisit triggers:** Scale, team ownership, deployment isolation, or reliability requirements demonstrate a real need to split services.

## ADR-004 — TypeScript and Zod at System and AI Boundaries
- **Status:** accepted
- **Date:** 2026-11-23
- **Context / problem:** Model output, tool inputs, and environment variables are runtime data and can be malformed despite compile-time TypeScript types.
- **Options considered:** (1) TypeScript types only; (2) runtime validation with class-validator; (3) runtime validation with Zod.
- **Decision:** Use Zod for runtime validation across configuration, model structured output, and tool argument schemas.
- **Rationale:** Zod provides strict schema parsing, friendly error formatting, and static TypeScript type inference (`z.infer<T>`) without heavy decorator metadata reflection.
- **Consequences:** All boundary data must have Zod schemas; guarantees runtime type safety before passing data into domain/agent logic.
- **Revisit triggers:** Evidence of major performance bottlenecks or incompatible provider schemas.

## ADR-005 — PostgreSQL for Task and Execution Persistence
- **Status:** proposed
- **Date:** 2026-11-22
- **Context / problem:** Task history, plans, steps, events, tool executions, and reports need durable storage.
- **Options considered:** (1) In-memory only; (2) relational database; (3) document database.
- **Decision:** Proposed PostgreSQL for durable persistence when B09 begins; Basic may use in-memory state until persistence work.
- **Rationale:** Relational consistency and queryability suit task lifecycle and execution records; JSON fields can accommodate variable payloads carefully.
- **Consequences:** Requires schema/migrations and operational setup; not needed for every early exercise.
- **Revisit triggers:** B09 data modeling or changed requirements for scale/query patterns.

## ADR-006 — Observable Decision Summaries, Not Hidden Chain-of-Thought
- **Status:** accepted
- **Date:** 2026-11-22
- **Context / problem:** Debugging requires visibility into Agent behavior, but internal model reasoning is not a reliable or appropriate telemetry contract.
- **Options considered:** (1) Store hidden reasoning verbatim; (2) store observable decision summaries, tool inputs/outputs, evidence, evaluation results, and events.
- **Decision:** Store observable trace data and concise rationale/decision summaries, not hidden chain-of-thought.
- **Rationale:** Auditable, useful traces without depending on private reasoning content.
- **Consequences:** The trace should focus on action, evidence, outcome, and explicit decision summaries.
- **Revisit triggers:** Trace schema evolves with evaluation and observability needs, while retaining this principle.

## ADR-007 — Sequential Milestones with Phase Gates
- **Status:** accepted
- **Date:** 2026-11-22
- **Context / problem:** Learning and project scope can become overwhelming; early code can create debt if milestones are skipped.
- **Options considered:** (1) Build all features in parallel; (2) milestone-based development with acceptance gates.
- **Decision:** Develop Basic → Advanced → Production, completing tests, docs, and review before moving phases.
- **Rationale:** Supports deep learning, manageable scope, and traceable progress.
- **Consequences:** Progress is deliberate rather than feature-rushed.
- **Revisit triggers:** Adjust milestone scope if learning or technical dependencies warrant it, recording the change.

## ADR-008 — Google Gemini as Primary LLM Provider with Port/Adapter Abstraction
- **Status:** accepted
- **Date:** 2026-11-23
- **Context / problem:** The agent needs an LLM provider for reasoning, planning, and structured responses. Vendor lock-in must be avoided so core agent logic remains provider-agnostic.
- **Options considered:** (1) Direct vendor SDK calls in business logic; (2) LangChain/LlamaIndex wrappers; (3) Custom Port/Adapter pattern (`ILlmProviderPort`) with `GeminiProviderAdapter` and `MockLlmAdapter`.
- **Decision:** Implement `ILlmProviderPort` interface with `GeminiProviderAdapter` (powered by `@google/genai`, default model `gemini-3.5-flash`) as the primary live provider, plus `MockLlmAdapter` for deterministic unit testing.
- **Rationale:** Preserves provider independence. Normalizes messages, tool definitions, tool-call proposals, and token usage into domain-level types.
- **Consequences:** Requires normalization layer between provider SDK and agent core; completely isolates domain from third-party breaking changes.
- **Revisit triggers:** Evaluation of alternative models (e.g. OpenAI GPT-4o, Anthropic Claude, Ollama local) in later milestones.
