-- ====================================================================
-- Milestone B09: PostgreSQL Relational Schema for KRA Persistence
-- Conforming to ADR-005 (PostgreSQL with Relational & JSONB Hybrid Design)
-- ====================================================================

-- 1. Tasks Table: Root lifecycle entity
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    goal TEXT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    budget_config JSONB,
    metrics JSONB,
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- 2. Plans Table: Agent plans with versioning support (ADR-004)
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    goal TEXT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'executing', 'completed', 'superseded', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    superseded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plans_task_id ON plans(task_id);
CREATE INDEX IF NOT EXISTS idx_plans_task_version ON plans(task_id, version);

-- 3. Plan Steps Table: Normalized individual steps in an execution plan
CREATE TABLE IF NOT EXISTS plan_steps (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    step_id VARCHAR(64) NOT NULL,
    order_index INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tool_name VARCHAR(64) NOT NULL,
    input_args JSONB NOT NULL DEFAULT '{}'::jsonb,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'retrying')),
    output TEXT,
    error_message TEXT,
    retries_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_steps_plan_id ON plan_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_steps_status ON plan_steps(status);

-- 4. Agent Events Table: Append-only observable audit log (ADR-006)
CREATE TABLE IF NOT EXISTS agent_events (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    iteration INT NOT NULL DEFAULT 0,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_events_task_id ON agent_events(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON agent_events(timestamp ASC);

-- 5. Research Reports Table: Synthesized artifacts and research outputs
CREATE TABLE IF NOT EXISTS research_reports (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    executive_summary TEXT NOT NULL,
    key_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    comparisons JSONB,
    conflicting_viewpoints JSONB,
    evidence_gaps JSONB,
    limitations JSONB,
    unresolved_questions JSONB,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    markdown_content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_research_reports_task_id ON research_reports(task_id);
