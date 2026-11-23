# B03 — Tool Calling: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **Backend-Controlled Tool Execution (ADR-002):**
  - Models never "execute" tools; they only produce structured proposals (`LlmToolCallProposal`).
  - The backend `ToolDispatcher` serves as the authoritative gatekeeper. It verifies:
    1. Tool existence in `ToolRegistry`.
    2. Policy and permissions (e.g., whether the tool is on the `allowedTools` list for the given step).
    3. Runtime schema validation of arguments via Zod.
    4. Timeout and execution boundaries via `Promise.race` and `AbortController`.
- **Normalization of Observations:**
  - Every tool execution, whether successful or failed, produces a typed `ToolObservation`.
  - Tool errors (e.g. division by zero, invalid parameters, timeouts) are captured as observations rather than crashing the agent process. This allows the Agent Loop (B04) to observe the failure and reason about corrective action.
- **Security in Tools (Zero `eval()`):**
  - The `CalculatorTool` parses and computes expressions using a recursive-descent parser and strict regex whitelisting (`/^[0-9+\-*/%().\s]+$/`), completely eliminating remote code execution risks.

## 2. Answers to B03 Guiding Questions
- **Who chooses the tool? Who authorizes it?**
  - The *LLM proposes* the tool based on available definitions. The *Backend authorizes* and executes it after checking allowlists, budgets, and argument validity.
- **Why validate arguments even if the model generated them?**
  - Models can hallucinate nonexistent arguments, supply wrong types (e.g. string instead of number), or be influenced by prompt injections. Runtime schema validation ensures strict guarantees before any business logic executes.
- **How should tool failure be represented?**
  - As a structured observation with `{ status: 'error', error: { code, message, details } }`. This provides actionable feedback that the agent loop can interpret to replan or retry.
