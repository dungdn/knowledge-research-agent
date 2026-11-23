# Agent Design

## 1. Core concepts
- **Task:** user's overall objective and constraints.
- **Plan:** proposed sequence of work.
- **Step:** one bounded unit in a plan.
- **Decision:** model or deterministic controller output selecting a next action.
- **Tool:** approved capability with a schema and implementation.
- **Observation:** normalized result from executing an action/tool.
- **Evaluation:** assessment of progress and completion against criteria.
- **Iteration:** one controlled cycle through decision/action/observation/evaluation.
- **Event/Trace:** record of observable state changes and outcomes.


## 2. Basic loop (conceptual)
```text
Create task and budgets
Initialize context/state
Generate plan (if planning milestone enabled)
Repeat while task is non-terminal and budgets remain:
  Obtain next decision
  Validate decision schema
  If final answer proposed:
    evaluate completion criteria
    if complete: finalize
    otherwise: continue or replan
  If tool call proposed:
    validate tool exists and is allowed
    validate arguments
    execute with timeout
    normalize result/error into observation
    update state and event log
    evaluate progress
    choose continue/retry/replan/complete/fail
Finalize task and report
```

## 3. Decision schema (illustrative)
A model decision should be represented as a discriminated union, not ambiguous free text. For example:
- `tool_call`: tool name + validated arguments + short decision summary
- `final`: proposed user-facing response or report payload
- `request_clarification`: question when task cannot safely or usefully proceed
The exact schema is defined during B02–B04 and validated at runtime. The backend may reject or override a model proposal based on policy.

## 4. Tool contract (conceptual)
Each tool should expose:
- Stable name and description
- Input schema
- Execution function
- Output schema/normalization strategy
- Timeout
- Retry policy (tool-specific)
- Permission/risk metadata
- Optional cost/usage metadata
Tools should be independent of the orchestration loop and registered through a central registry.

## 5. Agent state (conceptual)
```ts
interface AgentRunState {
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  iteration: number;
  maxIterations: number;
  planVersion: number;
  currentStepId?: string;
  steps: AgentStepState[];
  observations: Observation[];
  toolCallCount: number;
  startedAt: string;
  updatedAt: string;
}
```
This is illustrative, not a final implementation contract. Refine it after the lifecycle and persistence designs are studied.

## 6. Plan and step status
Plan statuses may include `draft`, `active`, `completed`, `failed`, `superseded`. Step statuses may include `pending`, `running`, `completed`, `failed`, `retrying`, `skipped`. Define allowed transitions explicitly and test them.

## 7. Evaluation decisions
Evaluator/controller outputs should be explicit and bounded, e.g.:
- `complete`
- `continue`
- `retry_step`
- `replan`
- `fail`
- `request_approval`
Evaluation can combine deterministic checks (required steps, sources, schema, budgets) with model-based assessment (coverage or synthesis quality). Model-based assessment is advisory unless backend policy says otherwise.

## 8. Retry, replan, and continue
- **Retry:** repeat the same operation when the failure appears transient and retry policy permits.
- **Continue:** move to the next planned step.
- **Replan:** revise the plan because new information, failure, or missing work invalidates the current plan.
- **Complete:** finish only when acceptance criteria are satisfied or an explicitly partial result is returned.
- **Fail:** stop when recovery is exhausted, task is invalid, or policy/budget prevents safe continuation.
Do not confuse a retry with a new planning decision.

## 9. Stopping and budget controls
Enforce hard limits: max iterations, tool calls, elapsed duration, retries per step, and optional token/cost budget. Stop on terminal state, cancellation, budget exhaustion, or detected no-progress. Report the reason clearly.

## 10. Research evidence
Represent each source with stable URL, title if available, retrieval timestamp, publisher/domain, and relevant extracted content/snippet. Associate findings/claims with source references. The report should disclose uncertainty, conflicts, and evidence gaps. Never treat a search result snippet alone as conclusive when fuller evidence is needed.

## 11. Trace events
Suggested event names:
- `task.created`, `task.started`, `task.completed`, `task.failed`, `task.cancelled`
- `plan.created`, `plan.revised`, `step.started`, `step.completed`, `step.failed`
- `llm.requested`, `llm.responded`, `llm.failed`
- `tool.proposed`, `tool.rejected`, `tool.started`, `tool.completed`, `tool.failed`
- `observation.received`, `evaluation.completed`, `budget.exhausted`
Record timestamps, IDs, sanitized inputs/outputs, duration, error classification, and concise decision summaries. Avoid recording secrets or private reasoning.

## 12. Safety and reliability
- Treat external research content as untrusted input; it may contain prompt-injection attempts.
- Tool registry and backend policy are the authority for allowed actions.
- Research tools should be read-only by default.
- Validate URLs and restrict protocols/hosts as appropriate to mitigate SSRF when reading URLs.
- Sanitize logs and never expose credentials.
- Limit retrieved content and tool output sizes.
- Require approval for sensitive or side-effecting actions in later phases.
