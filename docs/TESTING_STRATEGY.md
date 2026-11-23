# Testing Strategy

## 1. Principles
- Test deterministic code with unit tests; mock LLMs and external tools in core tests.
- Use contract tests to ensure provider/tool adapters meet interfaces.
- Keep a small set of real-provider smoke tests separate, opt-in, and cost-controlled.
- Test Agent behavior, not only individual functions.
- Verify safety limits, state transitions, and stop conditions.
- Use fixed fixtures for repeatable research/evaluation tests.

## 2. Test levels
### Unit
Pure logic: schemas, plan validation, state transitions, budgets, evaluator rules, retry policy, no-progress detection, report formatting.
### Integration
NestJS modules, provider adapter with mocked HTTP/SDK, tool registry/dispatcher, repository/database integration, migrations.
### Agent behavior tests
Run the Agent against a scripted/mock LLM that returns a known sequence of decisions and scripted tools. Verify expected tool calls, state updates, and final outcomes.
### End-to-end
API request through task creation, execution, persistence, and report retrieval. Keep these tests limited and deterministic.
### Provider smoke tests
Optional tests against a real model provider. Require explicit configuration, never run in ordinary CI by default, and track usage/cost.

## 3. Required Basic test cases
### LLM
- Provider returns valid structured response.
- Invalid structured output is rejected or handled safely.
- Timeout, rate limit, and provider error are normalized.
- Provider adapter does not leak SDK-specific types into core.
### Tool system
- Known tool executes with valid input.
- Unknown tool is rejected.
- Invalid input is rejected before execution.
- Tool error is converted to a normalized observation.
- Timeout is handled.
- Tool is not called if policy denies it.
### Agent loop
- Agent completes without tool call.
- Agent uses a tool then completes.
- Multiple tool calls occur in order.
- Malformed decision is handled.
- Max iterations stops the loop.
- Max tool calls/budget stops execution.
- Repeated action/no progress is detected.
- Cancellation is respected.
### Planning/execution
- Plan schema validation succeeds/fails correctly.
- Step status transitions are valid/invalid.
- Completed steps are not accidentally rerun.
- Failure and retry limits behave correctly.
- Replan preserves prior plan history.
### Evaluation
- Deterministic completion criteria are met/not met.
- Incomplete task continues.
- Transient failure retries only within policy.
- Non-recoverable failure terminates.
- Replan is selected for plan-invalidating conditions.
### Research
- Search result normalization preserves URL/source metadata.
- Duplicate sources can be identified.
- Empty results are reported honestly.
- Reader handles invalid URL and extraction failure.
- Findings include source references.
- Conflicting evidence is surfaced instead of silently merged.

## 4. Test doubles and fixtures
Use scripted model responses and fake tools to drive known scenarios. Fixtures should cover happy paths and adversarial cases such as prompt injection in retrieved pages, irrelevant search results, malformed tool arguments, repeated calls, and tool failures.

## 5. Quality evaluation
Create a small benchmark of research prompts with expected coverage criteria, required source attributes, and factual checks. Evaluate:
- Coverage of requested questions
- Evidence quality and traceability
- Correctness of citations/URLs
- Explicit handling of uncertainty and conflicts
- Completeness of report structure
- Tool efficiency and unnecessary calls
- Cost/latency budget adherence
Use human review for qualitative criteria; avoid relying solely on another LLM as the judge.

## 6. CI strategy
- Pull request: lint/type-check/unit tests and deterministic agent tests.
- Main branch: integration tests with isolated services if available.
- Scheduled/manual: optional real-provider smoke test, evaluation suite, and dependency/security checks.
- Ensure secrets are not required for default test runs.

## 7. Acceptance gate for Basic
- Core modules have clear responsibilities and tests.
- Agent can complete a multi-step research task using approved tools.
- Every execution step and decision outcome has trace events.
- Errors, retries, and stop conditions are bounded and tested.
- Final report contains source references and caveats.
- Basic task state and history can be retrieved (in-memory before B09; persistent after B09).
- Documentation and known limitations are current.
