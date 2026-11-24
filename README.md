# Knowledge Research Agent (KRA)

> **Educational, production-grade AI research and learning agent built in Node.js, NestJS, and TypeScript without third-party agent orchestration frameworks.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![Tests](https://img.shields.io/badge/Tests-132%20Unit%20%7C%204%20E2E%20(100%25)-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-UNLICENSED-yellow.svg)]()

---

## 🎯 Project Overview

**Knowledge Research Agent (KRA)** is an agentic AI system engineered to demonstrate how to build an autonomous, reliable, observable, and secure research agent from first principles.

Instead of relying on black-box agent frameworks (LangChain, CrewAI, AutoGen), KRA implements the complete cognitive loop:
1. **Goal Intake & Planning:** LLM-driven structured task decomposition into directed acyclic graph (DAG) execution steps.
2. **Bounded Agent Loop:** Turn-by-turn ReAct decision cycles with strict iteration, tool call, time, and error budgets.
3. **Hexagonal Tool Dispatcher:** Secure tool invocation with input validation via Zod, policy allowlists, and timeout isolation.
4. **Automated Self-Healing:** Rule-based evaluator distinguishing transient errors (exponential backoff retry) from permanent failures (automatic plan revision v2).
5. **Anti-Hallucination Evidence Synthesis:** Aggregation of web research evidence into structured reports citing only verifiable sources, disclosing gaps and conflicting viewpoints.
6. **Append-Only Telemetry & Persistence:** Comprehensive event streams (`AgentEvent`) and lifecycle state machines (`TaskStateMachine`).

---

## 🏗️ Architecture

KRA follows **Clean Architecture / Hexagonal Architecture (Ports and Adapters)**:

```
┌─────────────────────────────────────────────────────────────┐
│                 Presentation / API Layer                    │
│   HealthController | TasksController (/api/v1/tasks)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Services                     │
│    TasksService | ResearchWorkflowService | Synthesizer     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│        Agent Core           │ │       Domain Models         │
│  Orchestrator | Planner     │ │  TaskEntity | Plan | Step   │
│  Executor     | Evaluator   │ │  ResearchReport | Events    │
│  Guardrails   | StateMachine│ │  Zod Schemas & Validators   │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼──────────────┐
│                Infrastructure & Adapters                    │
│  LLM Port (Gemini 3.5 Flash | MockLlmAdapter)               │
│  Search Port (TavilySearchAdapter | MockSearchAdapter)      │
│  Persistence Port (PostgreSQL DDL | InMemory Repositories)  │
│  Tools: WebSearchTool, PageReaderTool, CalculatorTool       │
│  SSRF Security: UrlSecurityValidator                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js:** `>= 20.19.0 LTS`
- **pnpm:** `>= 10.0.0`
- **Gemini API Key:** (Optional, for live LLM mode; mock mode runs without keys)

### 1. Installation
```bash
git clone <repo-url>
cd knowledge-research-agent
pnpm install
```

### 2. Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your environment variables:
```ini
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Optional External Search
TAVILY_API_KEY=your_tavily_key_here
```

### 3. Build & Run
```bash
# Compile TypeScript
pnpm build

# Start dev server with hot reload
pnpm start:dev

# Production mode
pnpm start:prod
```

### 4. Interactive Swagger Documentation
Open your browser at:
```
http://localhost:3000/api/docs
```

---

## 🧪 Testing

KRA maintains a strict testing pyramid with **100% test pass rate**:
- **Unit & Behavior Tests:** 27 test suites, 132 passing tests.
- **End-to-End Tests:** 2 test suites (Health and Tasks lifecycle API).
- **Phase Gate Acceptance Tests:** Full compliance with `TESTING_STRATEGY.md` section 7.

```bash
# Run all unit and integration tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run test coverage
pnpm test:cov
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/v1/tasks` | Create and execute a research task |
| `GET` | `/api/v1/tasks` | List tasks with status filtering & pagination |
| `GET` | `/api/v1/tasks/:id` | Get task status, plan, and metrics |
| `GET` | `/api/v1/tasks/:id/events` | Get chronological audit event stream |
| `GET` | `/api/v1/tasks/:id/report` | Get synthesized report & Markdown artifact |
| `POST` | `/api/v1/tasks/:id/cancel` | Cancel an active or queued task |

---

## 🛡️ Security & Guardrails

- **SSRF Prevention:** `UrlSecurityValidator` blocks loopback (`127.0.0.1`, `::1`), RFC 1918 private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), AWS/GCP cloud metadata (`169.254.169.254`), and internal hostnames.
- **Prompt Injection Defense:** External page content fetched via `PageReaderTool` is sanitized (scripts, styles, SVG removed) and enclosed in `[EXTERNAL_UNTRUSTED_CONTENT]` boundary delimiters.
- **Bounded Execution:** Strict limits on iterations (default 8), tool calls (default 10), duration (default 60s), and consecutive failures (default 3).
- **Anti-Hallucination Citations:** Synthesis engine validates that all URLs cited by the LLM strictly exist in the collected evidence pool.

---

## 🗺️ Roadmap Status

- [x] **Phase 1: Basic (v0.1.0-basic)** — Foundation, LLM Integration, Tool Dispatcher, Agent Loop, Planning, Evaluation & Recovery, Research Tools, Workflow Synthesis, Persistence, Phase Gate.
- [ ] **Phase 2: Advanced** — Dynamic hierarchical planning, vector memory / RAG pipeline, multi-agent debate, streaming events.
- [ ] **Phase 3: Production** — Distributed BullMQ workers, PostgreSQL connection pool, auth/RBAC, rate limiting, Grafana dashboards.
