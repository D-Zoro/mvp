# Log 8.1 — Test Stabilization & Endpoint Verification

**Date:** 2026-03-20

---

## What I Fixed

### 1. Resolved bcrypt/passlib runtime mismatch under `uv run`

- **Problem:** `uv run` was resolving/installing `bcrypt 5.x`, which caused passlib bcrypt backend failures (`password cannot be longer than 72 bytes` during backend checks).
- **Fixes applied:**
  - Updated `backend/pyproject.toml` dependency pin to `bcrypt==4.1.2`.
  - Kept `backend/requirements.txt` aligned to `bcrypt==4.1.2`.
  - Regenerated lockfile (`backend/uv.lock`) and synced environment.

---

### 2. Fixed order shipping address serialization/typing

- **Problem:** `shipping_address` was stored as `str(...)`, but API/schema expected an object.
- **Fixes applied:**
  - `backend/app/repositories/order.py`: store `shipping_address` as a dict (no string cast).
  - `backend/app/models/order.py`: use PostgreSQL `JSON` type for `shipping_address`.
  - Added migration:
    - `backend/alembic/versions/20260320_1308_656108e78ec1_change_shipping_address_to_json.py`
    - Converts `orders.shipping_address` from `TEXT` to `JSON` (and downgrade path back to `TEXT`).

---

### 3. Fixed order error mapping for nonexistent books

- **Problem:** nonexistent book during order creation raised `ValueError` and was not mapped cleanly.
- **Fixes applied:**
  - `backend/app/services/order_service.py`:
    - map “not found” repository `ValueError` to `BookNotFoundError`.
    - added missing import for `BookNotFoundError`.
  - `backend/app/api/v1/endpoints/orders.py`:
    - include `BookNotFoundError` in caught exceptions for create order.
    - map `BookNotFoundError` to HTTP 404 in `_map_order_exception`.

---

### 4. Updated one integration test input to respect schema limits

- **File:** `backend/tests/integration/test_orders_api.py`
- **Change:** `test_create_order_insufficient_stock` now uses quantity `10` (still above stock, but within schema max of `100`), ensuring it exercises stock-conflict behavior (409) instead of request-body validation (422).

---

## Verification Performed

### Dependency/runtime verification

- Verified under `uv run`:
  - `bcrypt 4.1.2` is active.

### Full backend endpoint verification via integration tests

- Ran:
  - `uv run --env-file .env pytest tests/integration -q`
- Result:
  - **all integration endpoint tests passed** (auth, books, orders, reviews).

### Full backend test suite

- Ran:
  - `uv run --env-file .env pytest tests/ -q --tb=line`
- Result:
  - **138 passed, 67 warnings**.

---

## Files Updated in This Fix Pass

- `backend/pyproject.toml`
- `backend/requirements.txt`
- `backend/uv.lock`
- `backend/app/models/order.py`
- `backend/app/repositories/order.py`
- `backend/app/services/order_service.py`
- `backend/app/api/v1/endpoints/orders.py`
- `backend/alembic/versions/20260320_1308_656108e78ec1_change_shipping_address_to_json.py`
- `backend/tests/integration/test_orders_api.py`

