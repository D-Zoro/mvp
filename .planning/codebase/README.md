# Codebase Planning Documents

## Documents

### CONCERNS.md
**Technical debt, security issues, and architectural concerns**
- 759 lines
- 25 critical/high severity issues identified
- 10 medium priority items
- 5 low priority technical debt items
- Organized by severity with timeline estimates
- Includes immediate action items for production readiness

## Quick Navigation

**Critical Issues:**
1. bcrypt version pinning fragility
2. Stripe webhook replay attacks  
3. JWT secret rotation missing
4. Order quantity race condition

**High Priority:**
5. Bare exception handlers
6. Inconsistent order transitions
7. Insufficient audit logging
8. Stripe secret validation at startup
9. Email verification incomplete
10. Rate limiting decorator broken

**Medium Priority:**
Issues 11-17 (pagination, schema mismatches, sanitization, etc.)

**Low Priority:**
Issues 18-25 (unused code, documentation, testing, monitoring)

## For Each Issue

- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **File**: Where in codebase
- **Risk**: What could go wrong
- **Mitigation**: What to do about it
- **Timeline**: When to fix
