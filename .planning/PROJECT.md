# Books4All — Project Context

**Status:** GSD Initialization (Security & Quality Audit)  
**Started:** 2026-04-24  
**Lead:** Project Lead / Architect  
**Phase:** Requirements & Planning

## Overview

Books4All is a peer-to-peer book marketplace platform with a FastAPI backend and Next.js/React frontend. This project is being initialized with GSD to address critical security and quality concerns identified in the codebase audit.

**Current State:**
- ✅ Fully functional backend (FastAPI + PostgreSQL + Redis)
- ✅ Functional frontend (Next.js + React + TypeScript)
- ✅ 1,497-node knowledge graph built
- ⚠️ 7 critical security issues identified
- ⚠️ Multiple performance and scalability concerns
- ⚠️ Technical debt across codebase

## Project Goal

**Audit and remediate critical security vulnerabilities, performance issues, and technical debt while maintaining platform functionality.**

### Success Criteria
1. All 7 critical security issues resolved
2. Performance baseline established and improved
3. Technical debt documented and prioritized
4. Code quality metrics meet standards (80%+ coverage)
5. Architecture validated against DDD principles

## Key Findings from Codebase Map

### Critical Concerns (CONCERNS.md)
- Hardcoded secrets and insecure token storage
- OAuth state validation gaps
- N+1 database query patterns
- No application-level caching
- Stock race conditions
- Session fixation vulnerabilities
- Missing input validation

### Architecture (ARCHITECTURE.md)
- Monolithic FastAPI backend with repository pattern
- Layered architecture: API → Services → Repositories → Models
- React frontend with Zustand state management
- Separate deployment of frontend/backend

### Tech Stack (STACK.md)
- **Backend:** FastAPI, SQLAlchemy, Alembic, Redis
- **Frontend:** Next.js, React, TypeScript, Tailwind
- **Database:** PostgreSQL 16+
- **Auth:** JWT, OAuth2 (Google, GitHub)
- **Payments:** Stripe
- **Storage:** S3/MinIO

### Test Coverage (TESTING.md)
- Pytest for backend (async-aware)
- Jest + Playwright for frontend
- Current coverage below 80% target

## Team Composition

- **Project Lead/Architect:** Strategic direction, architecture decisions
- **Development Team:** Code implementation (via agents or human developers)
- **QA/Testing:** Coverage validation, integration tests

## Project Constraints

- **Concurrency:** 1 message = all related operations (parallel execution)
- **File Organization:** `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- **Code Quality:** Max 500 lines per file, TDD London School preferred
- **Topology:** Hierarchical-mesh with max 15 agents
- **Memory:** Hybrid (graphify + claude-flow memory store)

## Next Steps

1. ✅ Codebase mapping complete (CONCERNS.md, ARCHITECTURE.md, etc.)
2. → **Domain research** (book marketplace patterns, security best practices)
3. → **Requirements definition** (scoped security & quality work)
4. → **Roadmap creation** (phased approach to remediation)
5. → `/gsd-plan-phase 1` to begin execution

## Related Documents

- **CONCERNS.md** — Identified security, performance, and debt issues
- **ARCHITECTURE.md** — System design and layering
- **STRUCTURE.md** — Directory organization and modules
- **STACK.md** — Technology stack and dependencies
- **TESTING.md** — Test infrastructure and coverage
- **CONVENTIONS.md** — Code style and patterns
- **config.json** — Workflow preferences (graphify enabled, HNSW enabled)
