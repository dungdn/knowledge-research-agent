# Setup Guide

## Prerequisites
- **Node.js**: v20.x or v22.x LTS (current project pinned on Node 20 LTS)
- **pnpm**: v10.x (`corepack enable` or `npm install -g pnpm`)
- **Docker** (optional for containerized deployment)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd knowledge-research-agent

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
```

## Running the Application

```bash
# Development mode with hot-reload
pnpm start:dev

# Production build and run
pnpm build
pnpm start:prod
```

The application runs on `http://localhost:3000`.
- **Health Check**: `http://localhost:3000/health`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

## Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```
