# B01 — Backend Foundation: Architectural & Learning Reflections

## 1. Concepts Implemented
- **Modular Monolith**: Organized according to bounded contexts defined in `docs/ARCHITECTURE.md`:
  - `agent`: Orchestration loop, budget and stopping conditions.
  - `llm`: Provider port and adapters (Gemini, OpenAI, Mock).
  - `tools`: Tool contracts, schema definitions, registry, dispatcher.
  - `research`: Research workflow, evidence collection, synthesis.
  - `tasks`: Lifecycle management and persistence.
  - `shared`: Cross-cutting config, logging, and error handling.
- **Strict Boundary Validation with Zod**: Rather than relying purely on compile-time TypeScript types, runtime inputs (such as environment variables, and later LLM responses and tool arguments) are validated through Zod schemas.

## 2. Answers to B01 Guiding Questions
- **Why use Dependency Injection (DI)?**
  - Allows swapping implementations seamlessly (e.g. swapping `GeminiProviderAdapter` with `MockProviderAdapter` during tests without touching orchestrator logic).
- **What belongs in a controller?**
  - Only HTTP protocol concerns: extracting parameters, validating incoming request formats, delegating to application services/use cases, and returning HTTP responses. No agent decision logic or tool execution should live here.
- **How should configuration be validated?**
  - Fail fast at startup: using a Zod schema to parse environment variables on bootstrap. If a required secret or invalid port is provided, the application refuses to start with descriptive diagnostics.
- **What makes a module boundary useful?**
  - Prevents tight coupling. High cohesion within each domain module and low coupling across modules allows incremental refactoring or swapping components without cascading breaks.
- **How do tests isolate dependencies?**
  - Unit tests mock external collaborators (like LLMs and external web requests) to guarantee deterministic, sub-second execution without financial or network costs.
