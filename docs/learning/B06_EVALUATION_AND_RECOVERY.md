# B06 — Evaluation, Retry & Replanning: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **Taxonomy of Failures (Transient vs Permanent):**
  - Not all errors should be retried:
    - *Transient Errors*: Timeouts, rate limits (HTTP 429), server unavailable (HTTP 503), temporary network dropouts. These can be resolved by retrying after an exponential backoff.
    - *Permanent Errors*: Tool not found in registry, argument schema validation failure, arithmetic syntax error. Retrying these immediately without changing parameters or plan will produce the exact same failure, wasting budget.
- **Evaluation Decisions (The 5 Branches):**
  1. `complete`: Acceptance criteria satisfied or all planned steps completed.
  2. `continue`: The current step succeeded; proceed to the next pending step in the DAG.
  3. `retry_step`: The step failed with a transient error and retry budget remains for this step.
  4. `replan`: The step failed permanently or retries were exhausted, but a plan revision budget remains. A new plan version is generated with updated context.
  5. `fail`: Recovery options (both retries and replans) are exhausted; stop safely to protect system resources.
- **Replanning Semantics & Plan Versioning:**
  - When replanning occurs, the original plan is not deleted or mutated in-place; its status is transitioned to `superseded`.
  - A revised plan is generated (e.g. version 2) with alternative tools or modified step boundaries.
  - Execution smoothly resumes under the new plan version while preserving immutable historical events (`plan.revised`).

## 2. Answers to B06 Guiding Questions
- **When is retry useful?**
  - Only when the underlying failure cause is transient (network jitter, timeout, temporary API rate limit) and bounded by a strict retry budget.
- **When should the plan change?**
  - When a step fails permanently (e.g. required data is unavailable with the chosen tool, or tool is denied) and alternative tools or alternative decomposition paths exist.
- **How can an evaluator be tested?**
  - Deterministically using scripted mock responses and error injections: verify that transient errors trigger `retry_step`, unrecoverable errors trigger `replan`, and exhausted budgets trigger `fail`.
- **What are false-completion risks?**
  - The model claiming "done" without actually answering the user's objective or verifying all prerequisite step outputs. Mitigated by backend deterministic checks verifying required steps and non-empty outputs.
