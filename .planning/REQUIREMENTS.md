# Requirements: Books4All MVP

**Defined:** 2026-04-18  
**Core Value:** Fix all backend and frontend layers to deliver a production-grade marketplace MVP with zero critical issues.

## v1 Requirements

### Critical Fixes

- [ ] **CRIT-01**: Fix order quantity race condition (prevent overselling when multiple buyers purchase simultaneously)
- [ ] **CRIT-02**: Fix Stripe webhook deduplication (ensure payments aren't double-charged)
- [ ] **CRIT-03**: Implement JWT secret rotation mechanism for security compliance
- [ ] **CRIT-04**: Validate and fix rate limiting on all authentication endpoints

### Backend Service Layer

- [ ] **SVCL-01**: Audit UserService — login, signup, password reset, role-based access
- [ ] **SVCL-02**: Audit BookService — list, filter, search, picture/image handling logic
- [ ] **SVCL-03**: Audit OrderService — create, state transitions, validation rules
- [ ] **SVCL-04**: Audit PaymentService — Stripe integration, webhook handling, refunds
- [ ] **SVCL-05**: Ensure all service methods have proper exception handling and typed exceptions

### Backend Repository Layer

- [ ] **REPO-01**: Audit UserRepository — queries, constraints, relationship handling
- [ ] **REPO-02**: Audit BookRepository — soft deletes, filters, orphaned reference checks
- [ ] **REPO-03**: Audit OrderRepository — state machine transitions, data consistency
- [ ] **REPO-04**: Audit PaymentRepository — transaction integrity, idempotency
- [ ] **REPO-05**: Validate all async/await patterns in queries (no blocking calls)

### Backend Async/Database

- [ ] **ASYNC-01**: Validate SQLAlchemy 2.0 async patterns throughout codebase
- [ ] **ASYNC-02**: Ensure all session usage is correct (no leaks, proper cleanup)
- [ ] **ASYNC-03**: Validate transaction boundaries for order/payment workflows
- [ ] **ASYNC-04**: Test connection pooling and concurrency limits

### Backend Error Handling

- [ ] **ERROR-01**: Validate all 14 typed exceptions are properly raised and caught
- [ ] **ERROR-02**: Ensure error responses are consistent (no information leakage)
- [ ] **ERROR-03**: Verify all endpoints return proper HTTP status codes
- [ ] **ERROR-04**: Test error handling with invalid inputs and edge cases

### Frontend Component Layer

- [ ] **COMP-01**: Fix all React components — rendering, state, props validation
- [ ] **COMP-02**: Audit form components — validation, error display, submission handling
- [ ] **COMP-03**: Audit layout components — responsiveness, accessibility
- [ ] **COMP-04**: Fix all TypeScript type hints (strict mode)

### Frontend API Integration

- [ ] **API-01**: Validate all API client calls match backend endpoints
- [ ] **API-02**: Fix error handling for failed requests (retry, user feedback)
- [ ] **API-03**: Ensure authentication tokens are handled correctly (storage, refresh)
- [ ] **API-04**: Test network timeout and offline scenarios

### Frontend User Workflows

- [ ] **FLOW-01**: Test buyer signup → login → browse → cart → checkout
- [ ] **FLOW-02**: Test buyer order history and tracking
- [ ] **FLOW-03**: Test seller listing creation → order fulfillment
- [ ] **FLOW-04**: Test admin user and content management

### Integration & End-to-End

- [ ] **INT-01**: Full order flow: create order → Stripe payment → confirmation email → delivery
- [ ] **INT-02**: Payment failure scenarios (card declined, timeout, retry)
- [ ] **INT-03**: Seller order fulfillment workflows (mark shipped, delivered)
- [ ] **INT-04**: Data integrity checks (no orphaned records, referential constraints)
- [ ] **INT-05**: Concurrency testing (simultaneous orders, rate limiting)

### Testing & Quality

- [ ] **TEST-01**: Run full unit test suite, achieve 75%+ coverage
- [ ] **TEST-02**: Run database tests with real PostgreSQL
- [ ] **TEST-03**: Run integration tests with AsyncClient
- [ ] **TEST-04**: Manual end-to-end testing of critical workflows

### Deployment Readiness

- [ ] **DEPLOY-01**: Database migrations tested and verified
- [ ] **DEPLOY-02**: Environment variables configured correctly
- [ ] **DEPLOY-03**: Docker Compose works for dev/staging/prod
- [ ] **DEPLOY-04**: All dependencies pinned (bcrypt 4.1.2, etc.)

## v2 Requirements

Deferred to post-MVP release.

### Features

- OAuth 2.0 social login (Google, GitHub)
- Advanced search and filtering
- Wishlist functionality
- User messaging/chat system
- Review and rating system
- Promotional codes and discounts
- Email notifications (beyond order confirmations)
- Analytics and metrics dashboards

### Infrastructure

- CI/CD pipeline with GitHub Actions
- Automated testing and deployment
- Monitoring and alerting
- Load testing and performance optimization
- Kubernetes deployment

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time notifications | WebSocket complexity — post-MVP |
| Video uploads for books | Storage/bandwidth costs — future |
| Advanced recommendation engine | ML complexity — future |
| Mobile-specific app | Web-first MVP |
| Multi-currency support | Payment complexity — future |
| Auction-style selling | Marketplace feature creep — future |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRIT-01 | Phase 1 | Pending |
| CRIT-02 | Phase 1 | Pending |
| CRIT-03 | Phase 1 | Pending |
| CRIT-04 | Phase 1 | Pending |
| SVCL-01 | Phase 2 | Pending |
| SVCL-02 | Phase 2 | Pending |
| SVCL-03 | Phase 2 | Pending |
| SVCL-04 | Phase 2 | Pending |
| SVCL-05 | Phase 2 | Pending |
| REPO-01 | Phase 2 | Pending |
| REPO-02 | Phase 2 | Pending |
| REPO-03 | Phase 2 | Pending |
| REPO-04 | Phase 2 | Pending |
| REPO-05 | Phase 3 | Pending |
| ASYNC-01 | Phase 3 | Pending |
| ASYNC-02 | Phase 3 | Pending |
| ASYNC-03 | Phase 3 | Pending |
| ASYNC-04 | Phase 3 | Pending |
| ERROR-01 | Phase 3 | Pending |
| ERROR-02 | Phase 3 | Pending |
| ERROR-03 | Phase 3 | Pending |
| ERROR-04 | Phase 3 | Pending |
| COMP-01 | Phase 4 | Pending |
| COMP-02 | Phase 4 | Pending |
| COMP-03 | Phase 4 | Pending |
| COMP-04 | Phase 4 | Pending |
| API-01 | Phase 4 | Pending |
| API-02 | Phase 4 | Pending |
| API-03 | Phase 4 | Pending |
| API-04 | Phase 4 | Pending |
| FLOW-01 | Phase 5 | Pending |
| FLOW-02 | Phase 5 | Pending |
| FLOW-03 | Phase 5 | Pending |
| FLOW-04 | Phase 5 | Pending |
| INT-01 | Phase 6 | Pending |
| INT-02 | Phase 6 | Pending |
| INT-03 | Phase 6 | Pending |
| INT-04 | Phase 6 | Pending |
| INT-05 | Phase 6 | Pending |
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| TEST-03 | Phase 6 | Pending |
| TEST-04 | Phase 6 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 after initial definition*
