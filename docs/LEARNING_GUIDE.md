# Learning Guide

## Learning method
For each milestone: (1) concept study, (2) diagrams and contracts, (3) implementation, (4) tests, (5) inspect execution traces, (6) review alternatives and trade-offs, (7) update documentation.

## B01 — Backend Foundation
Learn: Node runtime, npm scripts, TypeScript types/interfaces, NestJS modules/controllers/providers, dependency injection, configuration, validation, exception filters, logging, testing, Docker basics.
Questions: Why use DI? What belongs in a controller? How should config be validated? What makes a module boundary useful? How can tests isolate dependencies?

## B02 — LLM Integration
Learn: model APIs, roles/messages, prompts, temperature/parameters, structured output, schema validation, token/context limits, timeouts, retries, provider abstraction, mock testing.
Questions: What is nondeterministic? Which parts can be deterministic? How do we handle invalid model output? How do provider SDK types stay out of core logic?

## B03 — Tool Calling
Learn: function/tool calling semantics, tool schema, registry, dispatch, argument validation, permissions, timeouts, normalized results, tool errors as observations.
Questions: Who chooses the tool? Who authorizes it? Why validate arguments even if the model generated them? How should tool failure be represented?

## B04 — Agent Loop
Learn: agent loop, decision/action/observation, stop conditions, finite-state concepts, iteration budgets, prompt context, trace events.
Questions: How is an Agent different from a single LLM request? What causes another iteration? What prevents endless loops? What does the backend enforce?

## B05 — Planning
Learn: task decomposition, plan schema, step statuses, dependencies, sequential vs parallel execution, plan validation, plan-to-execution mapping.
Questions: What makes a plan executable? How do we represent progress? What if one step fails? How do plans change without losing history?

## B06 — Evaluation and recovery
Learn: rule-based vs model-based evaluation, completion criteria, retries, backoff, replan, no-progress detection, failure taxonomy.
Questions: When is retry useful? When should the plan change? How can an evaluator be tested? What are false-completion risks?

## B07 — Research tools
Learn: search API concepts, page retrieval, parsing/extraction, source metadata, evidence, deduplication, summarization, source reliability, rate limits and responsible access.
Questions: How do we distinguish source from summary? How do we preserve citations? What if sources disagree or page extraction fails?

## B08 — Research workflow
Learn: synthesis, evidence-to-claim mapping, report structure, uncertainty, source triangulation, research evaluation rubrics.
Questions: Can each key claim be traced to evidence? Are gaps disclosed? How do we evaluate report quality beyond subjective impressions?

## B09 — Persistence
Learn: relational modeling, migrations, repository ports, transactions, task/event/step history, status transitions, pagination, JSON fields trade-offs.
Questions: What is the source of truth? Which data should be immutable events? How do we persist a run safely?

## Advanced topics
- Planning under uncertainty and plan revisions
- Short-term task context vs long-term memory
- Embeddings and vector search; chunking and retrieval quality
- RAG evaluation and grounded answers
- Context-window budgeting and summarization
- Multi-tool sequencing and parallelism
- Source trust, corroboration and conflict detection
- Agent framework comparison and workflow graph approaches

## Production topics
- Durable execution, queues, worker concurrency, checkpoints, resume
- Idempotency, retries, backoff, dead-letter handling
- Authentication/authorization, tenancy, tool permissions, human approval
- Rate limits, quotas, usage/cost accounting
- Structured logs, metrics, tracing, alerts
- Security review, threat modeling, secret handling, prompt injection defenses
- Integration, contract, end-to-end and load testing

## Study artifacts
For each topic, keep notes in `docs/learning/` (or an agreed location): concept, example, implementation link, tests, mistakes, and remaining questions. Use diagrams for control flow and state transitions.
