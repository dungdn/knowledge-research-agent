# B02 — LLM Integration: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **Ports & Adapters (Hexagonal Architecture) for LLMs:**
  - `ILlmProviderPort`: The domain-level interface.
  - `MockLlmAdapter`: Deterministic test double that simulates success, tool-call proposals, rate limits, timeouts, and schema errors without network calls.
  - `GeminiProviderAdapter`: Real-world adapter encapsulating `@google/genai`.
- **Normalized Data Contracts:**
  - `LlmMessage`: System, user, assistant, and tool messages normalized across providers.
  - `LlmToolCallProposal`: Uniform representation of function call requests containing tool name and validated JSON arguments.
  - `LlmResponse`: Standardized response containing text content, tool calls, finish reasons (`stop`, `tool_calls`, `length`, `content_filter`), and token usage.
- **Runtime Schema Validation with Zod:**
  - `generateStructured<T>(messages, schema, options)` ensures that the model's raw string response is safely parsed as JSON and validated against a Zod schema before it reaches downstream orchestrator or domain entities.
  - Throws `LlmSchemaValidationError` with path-level error details on invalid schema or unparseable JSON.

## 2. Answers to B02 Guiding Questions
- **What is nondeterministic? Which parts can be deterministic?**
  - *Nondeterministic*: The LLM's natural language output, token generation sequence, and timing.
  - *Deterministic*: The prompt construction, input sanitization, schema validation rules, timeout boundaries, tool authorization, and state transitions.
- **How do we handle invalid model output?**
  - Intercept at the adapter level using Zod schema parsing. If invalid, reject with `LlmSchemaValidationError` and feed structured feedback into the loop (during B04/B06) so the agent can retry or adjust.
- **How do provider SDK types stay out of core logic?**
  - By strictly translating raw SDK types (e.g. `GenerateContentResponse`, `FunctionCall`) into domain types (`LlmResponse`, `LlmToolCallProposal`) inside `GeminiProviderAdapter`. No file outside `src/modules/llm/adapters/` imports `@google/genai`.
