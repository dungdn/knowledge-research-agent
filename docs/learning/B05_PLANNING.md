# B05 — Planning & Step Execution: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **Plan Decomposition:**
  - Complex tasks cannot be executed reliably in a single reactive shot. Decomposing a user goal into discrete, bounded steps creates an executable roadmap where each step has a title, description, expected tool, and explicit dependencies.
- **DAG (Directed Acyclic Graph) Dependency Enforcement:**
  - Steps may have dependencies on previous steps.
  - The `PlanValidator` enforces strict DAG integrity:
    1. Every step must have a unique ID.
    2. A step cannot depend on itself.
    3. Dependencies can only point to *preceding* steps (no forward references, eliminating cycles).
- **Explicit Finite State Machine (FSM):**
  - Rather than updating step statuses casually, `StepStateMachine` validates every transition.
  - Allowed transitions:
    - `pending` $\to$ `running` | `skipped`
    - `running` $\to$ `completed` | `failed` | `retrying`
    - `retrying` $\to$ `running` | `failed`
    - Terminal: `completed`, `skipped`.
  - Illegal transitions (e.g. `completed` $\to$ `running` or `pending` $\to$ `completed`) throw `InvalidStepStatusTransitionError`.
- **Sequential Plan Execution & Failure Isolation:**
  - `PlanExecutorService` executes steps in sequence, passing prerequisite outputs down the line.
  - If a step fails, remaining pending steps are marked as `skipped` rather than executing on corrupted/missing prerequisites, and the overall plan transitions to `failed` (preparing for B06 replanning/recovery).

## 2. Answers to B05 Guiding Questions
- **What makes a plan executable?**
  - Concrete step actions, well-defined tool expectations, verifiable inputs/outputs, and clean dependency ordering.
- **How do we represent progress?**
  - Progress is reflected both at the macro level (`Plan.status`, completed vs pending steps) and the micro level (`Step.status`, step output, and `step.completed` trace events).
- **What if one step fails?**
  - The failing step transitions to `failed`, dependent subsequent steps transition to `skipped`, and the plan transitions to `failed`. In B06, an Evaluator will assess whether to retry the step, replan, or terminate.
- **How do plans change without losing history?**
  - By plan versioning: plans transition from `active` to `superseded` when a replan occurs, preserving the original plan and step execution records immutably in event traces and database history.
