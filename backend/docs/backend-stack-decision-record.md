# Backend Stack Decision Record

## Status

Accepted

## Context

The Oki handyman marketplace is being built with a Supabase-centric backend architecture. Existing documentation already defines Supabase for database, auth, storage, and realtime services.

The project also requires: payment processing, notification delivery, and secure secret management.

## Decision

- Use Supabase serverless backend functions for API hosting.
  - This aligns with existing Supabase usage for Auth, Storage, Realtime, and database access.
  - It avoids introducing a separate managed Node.js/Fastify hosting stack for this phase.
- Use Supabase PostgreSQL + PostGIS for the database.
- Use Supabase Auth for user authentication and JWT issuance.
- Use Supabase Storage for KYC documents and booking media.
- Use Supabase Realtime for live booking state updates and notifications where appropriate.
- Use Stripe as the preferred payment provider.
  - Stripe is the primary PCI-compliant payment provider referenced in the project guidance.
  - Sandbox/test keys must be provisioned and stored securely before production integration.
- Use Expo Push for mobile push notifications, Resend for email delivery, and Twilio for SMS.
- Store all third-party API keys and secrets in Supabase Vault, with environment templates committed without secrets.

## Rationale

- Supabase Functions provides the fastest path to production for the current architecture because the backend is already centered on Supabase services.
- A separate Node.js/Fastify stack is more operationally complex and is not required for the current phase.
- Stripe is the leading payment provider referenced by project docs and supports escrow-style authorization workflows needed for bookings.
- Expo Push, Resend, and Twilio are the chosen adapters for notifications because they match the existing mobile and admin scenarios.
- Supabase Vault keeps third-party credentials close to the runtime environment while avoiding plaintext secret files in source control.

## Consequences

- The backend API will be implemented in Supabase Functions or Edge Functions, not as a standalone Fastify server.
- Payment integration will target Stripe sandbox credentials first.
- Secrets are not stored in source control and must be provisioned through Supabase Vault or GitHub Secrets.
- If future requirements need a more traditional Node.js server, the decision can be revisited with a new ADR.
