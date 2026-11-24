# Known Limitations — Phase 1 (Basic)

This document captures the known architectural and functional limitations of the **Knowledge Research Agent (KRA)** at the conclusion of **Phase 1: Basic (v0.1.0-basic)**. These limitations are intentional trade-offs made to establish a clean, observable baseline without premature complexity, and form the explicit problem statements addressed in **Phase 2 (Advanced)** and **Phase 3 (Production)**.

---

## 1. Storage & Persistence
- **In-Memory Default Adapter:**
  - *Current state:* While the PostgreSQL DDL schema (`src/modules/persistence/migrations/001_initial_schema.sql`) and Hexagonal repository ports (`ITaskRepository`, `IEventRepository`) are fully defined, the active runtime adapter uses an in-memory storage map with deep cloning.
  - *Limitation:* Restarting the Node.js process resets task history and event logs.
  - *Resolution path:* In Phase 3 (Production), connect PostgreSQL with an ORM / query builder (e.g. Prisma or Kysely) implementing the existing ports.

## 2. Planning & Replanning
- **Sequential DAG Execution:**
  - *Current state:* The `AgentPlannerService` produces a linear list of steps with direct backward dependencies (`dependencies: string[]`).
  - *Limitation:* Does not support dynamic fork-join parallel execution of independent research sub-questions, nor hierarchical decomposition into sub-plans.
  - *Resolution path:* Phase 2 (Advanced) introduces dynamic hierarchical planning and parallel step execution.
- **Replanning Scope:**
  - *Current state:* When a permanent step failure occurs, the replan mechanism revisions the remainder of the plan into version 2.
  - *Limitation:* Re-plans replace the whole remaining step sequence rather than performing local branch grafting.

## 3. Memory & Retrieval
- **Context Window / Short-term Only:**
  - *Current state:* Memory is strictly ephemeral within the scope of a single task execution (`AgentRunState` and `EventRecorder`).
  - *Limitation:* No cross-task semantic memory, episodic recall, or user preference personalization exists. Running two identical research queries executes full web queries without cross-task cache or vector retrieval.
  - *Resolution path:* Phase 2 (Advanced) adds vector database integration (pgvector / Chroma), hybrid search, and semantic memory layers.

## 4. Multi-Agent & Collaboration
- **Single Orchestrator Coordinator:**
  - *Current state:* One orchestrator coordinates the planner, executor, and synthesizer sequentially.
  - *Limitation:* No multi-agent peer review, adversarial critique (Devil's Advocate), or specialist subagents (e.g., Code Analyst vs Academic Researcher).
  - *Resolution path:* Phase 2 introduces multi-agent debate and specialized role delegates.

## 5. Web Search & Scraping
- **Mock Search by Default:**
  - *Current state:* Unless `TAVILY_API_KEY` is provided, `WebSearchTool` falls back to `MockSearchAdapter`.
  - *Limitation:* `PageReaderTool` performs static HTTP GET requests via `fetch` with HTML text stripping; it cannot execute JavaScript-rendered SPAs (Client-Side Rendering) or bypass Cloudflare/bot protections.
  - *Resolution path:* Phase 3 adds headless browser integration (Puppeteer/Playwright) for dynamic pages when permitted.

## 6. Execution Model & Scalability
- **Single-Process Async:**
  - *Current state:* Tasks run within the NestJS Node.js event loop asynchronously.
  - *Limitation:* Long-running tasks tie up CPU/memory in the main server process. No distributed message queue (BullMQ / Redis) or worker pool exists.
  - *Resolution path:* Phase 3 (Production) introduces background worker processes and job queues.
