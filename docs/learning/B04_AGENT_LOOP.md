# B04 — Agent Loop: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **What distinguishes an Agent from a single LLM request?**
  - A single LLM request produces one static response.
  - An Agent operates in a feedback-driven stateful loop:
    $$\text{Goal} \to \text{Decision} \to \text{Action} \to \text{Observation} \to \text{State Update} \to \text{Next Decision}$$
  - The loop continues dynamically until acceptance criteria are satisfied, clarification is requested, or safety budgets are exhausted.
- **Discriminated Union Decision Schema:**
  - Ambiguous natural language strings are eliminated. Decisions are strictly typed:
    1. `tool_call`: selects an approved tool with typed arguments and an observable rationale.
    2. `final_answer`: synthesizes findings into a completed user response.
    3. `request_clarification`: halts execution to query the user when safety or ambiguity prevents progress.
- **Budget & Guardrail Enforcement (Bounded Autonomy):**
  - Hard stops on `maxIterations`, `maxToolCalls`, and `maxTotalDurationMs` protect against unbounded runaway loops.
  - `NoProgressDetector` detects stuck loops (e.g. repeated identical tool calls or consecutive execution failures) and halts early rather than burning resources.
- **Observable Summaries (ADR-006):**
  - Every decision captures an observable `rationale`, avoiding the opacity of hidden internal chain-of-thought while maintaining complete auditable telemetry.

## 2. Answers to B04 Guiding Questions
- **What causes another iteration?**
  - The model returning a `tool_call` decision where further action and observation are required before a final answer can be produced.
- **What prevents endless loops?**
  - Iteration budget caps (`maxIterations`), tool call caps (`maxToolCalls`), timeout caps (`maxTotalDurationMs`), and `NoProgressDetector` terminating repeated cycles.
- **What does the backend enforce?**
  - The backend parses and validates the decision schema, authorizes tool permissions, executes the tool safely, measures timing, feeds observations back, and checks all termination rules.
