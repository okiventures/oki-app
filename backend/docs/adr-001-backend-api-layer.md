# ADR 001 — Backend API Layer

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Oki engineering team

---

## Context

The platform requires a backend API layer to handle booking lifecycle, payments, KYC verification, and admin operations. The database and auth are already on Supabase (PostgreSQL 15+ with PostGIS).

Two credible options were evaluated:

- **Supabase Edge Functions** (Deno runtime, deployed alongside the database)
- **Node.js with Fastify** (standalone server, self-hosted or cloud-deployed)

## Decision

**Use Supabase Edge Functions as the primary API layer.**

## Rationale

- **Stack cohesion.** Auth, database, storage, and realtime already live on Supabase. Adding Edge Functions avoids a second infrastructure surface.
- **Reduced operational overhead.** No separate server provisioning, CI/CD pipeline, load balancer, or container orchestration.
- **Low-latency execution.** Functions run on the same edge network as the database, minimizing round-trip time for booking queries and state transitions.
- **Built-in secrets management.** Supabase Vault handles API keys without additional tooling.
- **Team context.** The team already has working Edge Functions scaffolded (`accept-booking`, `complete-booking`, `payment-webhook`, `seed`).

## Alternatives Considered

### Node.js (Fastify)

| Pro                                      | Con                                            |
| ---------------------------------------- | ---------------------------------------------- |
| Full Node.js ecosystem and npm packages  | Separate hosting, scaling, and monitoring      |
| Familiar debugging and local dev tooling | Higher infrastructure cost and maintenance     |
| Long-running server for WebSocket state  | Duplicates auth middleware already in Supabase |

Fastify remains a viable fallback if Edge Functions prove insufficient for complex workflows, but the current roadmap does not require features beyond what Edge Functions support.

## Consequences

- All backend logic must fit within the Deno runtime and Edge Function constraints (memory, execution time).
- Local development requires the Supabase CLI (`supabase functions serve`).
- The Supabase service role key must be carefully scoped per function.
