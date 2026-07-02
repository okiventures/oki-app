# Database Architecture — Oki Handyman Marketplace

PostgreSQL 15+ with PostGIS 3.x on Supabase. Auth identities live in `auth.users`; application profiles in `public.users`.

---

## ER Diagram

```mermaid
erDiagram
    auth_users ||--|| users : "id"
    users ||--o| handymen : "1:1 when role=handyman"
    users ||--o{ bookings : "client creates"
    users ||--o{ bookings : "handyman assigned"
    users ||--o{ reviews : "reviewer"
    users ||--o{ reviews : "reviewee"
    users ||--o{ disputes : "reporter"

    services ||--o{ handyman_services : "offered by"
    handymen ||--o{ handyman_services : "offers"
    services ||--o{ bookings : "requested"

    handymen ||--o{ wallet_transactions : "ledger"
    handymen ||--o{ bookings : "fulfills"

    bookings ||--o| payments : "0..1 escrow"
    bookings ||--o{ reviews : "0..2 two-way"
    bookings ||--o{ booking_events : "audit trail"
    bookings ||--o| disputes : "0..1 active"

    payments ||--o{ wallet_transactions : "may credit wallet"

    auth_users {
        uuid id PK
        text email
    }

    users {
        uuid id PK,FK
        user_type enum
        text full_name
        text phone
        user_status enum
        timestamptz created_at
    }

    handymen {
        uuid id PK,FK
        geography location "Point 4326"
        boolean is_online
        kyc_status enum
        numeric hourly_rate
        numeric trust_score
        int review_count
    }

    services {
        uuid id PK
        text slug UK
        text name
        text category enum
        numeric base_rate
        boolean is_active
    }

    handyman_services {
        uuid handyman_id PK,FK
        uuid service_id PK,FK
        numeric price_override
    }

    bookings {
        uuid id PK
        uuid client_id FK
        uuid handyman_id FK "nullable until accepted"
        uuid service_id FK
        geography location "Point 4326"
        text address_text
        booking_status enum
        booking_type enum
        numeric amount
        numeric platform_fee
        timestamptz scheduled_at
    }

    payments {
        uuid id PK
        uuid booking_id FK,UK
        uuid client_id FK
        payment_status enum
        numeric amount_authorized
        numeric amount_captured
        text provider_ref
    }

    reviews {
        uuid id PK
        uuid booking_id FK
        uuid reviewer_id FK
        uuid reviewee_id FK
        smallint rating "1-5"
        text comment
    }

    wallet_transactions {
        uuid id PK
        uuid handyman_id FK
        uuid booking_id FK "nullable"
        uuid payment_id FK "nullable"
        wallet_tx_type enum
        numeric amount
        numeric balance_after
    }

    disputes {
        uuid id PK
        uuid booking_id FK
        uuid reporter_id FK
        dispute_status enum
        text issue_type
        text description
    }

    booking_events {
        uuid id PK
        uuid booking_id FK
        uuid actor_id FK
        booking_status from_status
        booking_status to_status
        jsonb metadata
        timestamptz created_at
    }
```

---

## Relationship Summary

| Relationship                       | Cardinality | FK column(s)                      | Notes                                               |
| ---------------------------------- | ----------- | --------------------------------- | --------------------------------------------------- |
| `auth.users` → `users`             | 1:1         | `users.id`                        | Profile row created on signup trigger               |
| `users` → `handymen`               | 1:0..1      | `handymen.id = users.id`          | Only when `user_type = 'handyman'`                  |
| `users` → `bookings` (client)      | 1:N         | `bookings.client_id`              | Client owns booking lifecycle until assigned        |
| `users` → `bookings` (handyman)    | 1:N         | `bookings.handyman_id`            | Nullable while `PENDING`; set on accept             |
| `services` ↔ `handymen`            | M:N         | `handyman_services`               | Junction with optional `price_override`             |
| `services` → `bookings`            | 1:N         | `bookings.service_id`             | Category + pricing snapshot at booking time         |
| `bookings` → `payments`            | 1:0..1      | `payments.booking_id` UNIQUE      | One escrow record per booking                       |
| `bookings` → `reviews`             | 1:0..2      | `reviews.booking_id`              | Client→handyman and handyman→client                 |
| `bookings` → `booking_events`      | 1:N         | `booking_events.booking_id`       | Immutable audit log                                 |
| `bookings` → `disputes`            | 1:0..1      | `disputes.booking_id`             | At most one open dispute per booking (app-enforced) |
| `handymen` → `wallet_transactions` | 1:N         | `wallet_transactions.handyman_id` | Credits on capture; debits on payout                |
| `payments` → `wallet_transactions` | 1:0..N      | `wallet_transactions.payment_id`  | Links ledger entry to source payment                |

---

## PostGIS Columns

| Table      | Column     | Type                     | Index | Purpose                                             |
| ---------- | ---------- | ------------------------ | ----- | --------------------------------------------------- |
| `handymen` | `location` | `GEOGRAPHY(Point, 4326)` | GiST  | Worker search (`ST_DWithin`), live position updates |
| `bookings` | `location` | `GEOGRAPHY(Point, 4326)` | GiST  | Job site; distance quote; geofence arrival          |

**Query patterns**

```sql
-- Radius search (handymen online in category)
SELECT h.*, ST_Distance(h.location, client_point) AS distance_m
FROM handymen h
JOIN handyman_services hs ON hs.handyman_id = h.id
JOIN services s ON s.id = hs.service_id
WHERE h.is_online = true
  AND h.kyc_status = 'APPROVED'
  AND s.category = $category
  AND ST_DWithin(h.location, client_point, $radius_m)
ORDER BY distance_m ASC;
```

---

## Row Level Security Boundaries

Roles: **`client`**, **`handyman`**, **`admin`** (stored in `users.user_type`; admin also has `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`).

Legend: ✅ allowed · ❌ denied · 🔒 service-role / Edge Function only · 👁 read-only subset

### `users`

| Operation          | client                                      | handyman          | admin                     |
| ------------------ | ------------------------------------------- | ----------------- | ------------------------- |
| SELECT own row     | ✅ `id = auth.uid()`                        | ✅                | ✅ all                    |
| SELECT other users | 👁 public fields only (name, photo) via view | 👁 same            | ✅                        |
| INSERT             | 🔒 signup trigger                           | 🔒 signup trigger | 🔒                        |
| UPDATE own         | ✅ non-role fields                          | ✅                | ✅ any                    |
| DELETE             | ❌                                          | ❌                | 🔒 soft-delete via status |

### `handymen`

| Operation         | client                                 | handyman                                        | admin        |
| ----------------- | -------------------------------------- | ----------------------------------------------- | ------------ |
| SELECT            | 👁 online + approved only (search view) | ✅ own row                                      | ✅ all       |
| INSERT            | ❌                                     | 🔒 onboarding flow                              | 🔒           |
| UPDATE            | ❌                                     | ✅ own (bio, rates, services); not `kyc_status` | ✅ incl. KYC |
| UPDATE `location` | ❌                                     | ✅ own while online                             | ✅           |
| DELETE            | ❌                                     | ❌                                              | 🔒           |

### `services`

| Operation            | client             | handyman | admin |
| -------------------- | ------------------ | -------- | ----- |
| SELECT               | ✅ active services | ✅       | ✅    |
| INSERT/UPDATE/DELETE | ❌                 | ❌       | ✅    |

### `handyman_services`

| Operation            | client | handyman                     | admin |
| -------------------- | ------ | ---------------------------- | ----- |
| SELECT               | ✅     | ✅ own + others (for search) | ✅    |
| INSERT/UPDATE/DELETE | ❌     | ✅ own                       | ✅    |

### `bookings`

| Operation | client                                    | handyman                                            | admin  |
| --------- | ----------------------------------------- | --------------------------------------------------- | ------ |
| SELECT    | ✅ `client_id = auth.uid()`               | ✅ `handyman_id = auth.uid()` OR pending broadcast* | ✅ all |
| INSERT    | ✅ sets self as client                    | ❌                                                  | 🔒     |
| UPDATE    | ✅ cancel while `PENDING`; limited fields | ✅ state transitions via RPC                        | ✅     |
| DELETE    | ❌                                        | ❌                                                  | ❌     |

\*Pending broadcast: handymen see `PENDING` bookings matching their service category within radius (via security-definer RPC, not direct table SELECT).

### `payments`

| Operation     | client                             | handyman                      | admin  |
| ------------- | ---------------------------------- | ----------------------------- | ------ |
| SELECT        | ✅ own bookings                    | 👁 net amount only on own jobs | ✅ all |
| INSERT/UPDATE | 🔒 payment webhook / Edge Function | 🔒                            | 🔒     |
| DELETE        | ❌                                 | ❌                            | ❌     |

### `reviews`

| Operation | client                                          | handyman | admin                      |
| --------- | ----------------------------------------------- | -------- | -------------------------- |
| SELECT    | ✅ public reviews on profiles                   | ✅       | ✅                         |
| INSERT    | ✅ post-`COMPLETED` booking, once per direction | ✅ same  | ❌                         |
| UPDATE    | ❌                                              | ❌       | 👁 hide/moderate flags only |
| DELETE    | ❌                                              | ❌       | 🔒 soft-hide               |

### `wallet_transactions`

| Operation            | client             | handyman                      | admin  |
| -------------------- | ------------------ | ----------------------------- | ------ |
| SELECT               | ❌                 | ✅ `handyman_id = auth.uid()` | ✅ all |
| INSERT/UPDATE/DELETE | 🔒 ledger RPC only | 🔒                            | 🔒     |

### `disputes`

| Operation | client                        | handyman                        | admin      |
| --------- | ----------------------------- | ------------------------------- | ---------- |
| SELECT    | ✅ reporter or booking client | ✅ reporter or booking handyman | ✅ all     |
| INSERT    | ✅ on own booking             | ✅ on own booking               | ❌         |
| UPDATE    | 👁 add evidence while `OPEN`   | 👁 same                          | ✅ resolve |
| DELETE    | ❌                            | ❌                              | ❌         |

### `booking_events`

| Operation | client                | handyman                   | admin  |
| --------- | --------------------- | -------------------------- | ------ |
| SELECT    | ✅ own booking events | ✅ assigned booking events | ✅ all |
| INSERT    | 🔒 state-machine RPC  | 🔒                         | 🔒     |
| UPDATE    | ❌ immutable          | ❌                         | ❌     |
| DELETE    | ❌ immutable          | ❌                         | ❌     |

---

## Booking State Machine (reference)

Full specification: **[`booking-state-machine.md`](./booking-state-machine.md)** (states, guards, invalid transitions, 422 schema, Mermaid diagram).

```
PENDING → ACCEPTED → IN_TRANSIT → ARRIVED → WORK_STARTED → COMPLETED → PAID
    ↓
CANCELLED (pre-ACCEPTED only, client-initiated)
```

Every transition writes one `booking_events` row. `PAID` requires `payments.status = 'CAPTURED'`.

---

## File Layout

| File                                     | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `backend/migrations/001_core_schema.sql` | Extensions, enums, tables, indexes, triggers     |
| `backend/rls-policies/001_core_rls.sql`  | RLS enable + policies per table                  |
| `backend/docs/database-architecture.md`  | This document                                    |
| `backend/docs/booking-state-machine.md`  | Booking FSM: states, guards, API errors, diagram |

---

## Out-of-Scope (Phase 2+ tables)

Documented in the app guide but deferred to later migrations: `saved_addresses`, `messages`, `notifications`, `kyc_documents`, `availability_blocks`, `payout_requests`, `support_tickets`, `audit_logs`.
