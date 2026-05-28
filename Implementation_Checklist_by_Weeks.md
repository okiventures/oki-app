#  **Implementation Checklist — Handyman Platform**

**Project Window:** May 6, 2026 → November 18, 2026 (\~28 weeks) **Approach:** Low-fidelity in Figma → High-fidelity mockups → Code implementation **Cadence:** Team standups every 2 weeks (marked with 🟢)

**Legend:** ☐ to-do · ☑ done · 🟢 Bi-weekly standup · 🎯 Phase milestone

---

## **Phase 1 — System Design (May 5 – June 5, 2026\)**

### **Week 1 · May 6 – May 13 — Discovery & Requirements**

- [x] ~~Kickoff meeting; align on scope, roles, and success metrics~~  
- [x] ~~Finalize user personas (Client, Handyman, Admin)~~  
- [x] ~~Map end-to-end user journeys for each persona~~  
- [x] ~~Set up Figma workspace, repo, project tracker, and shared docs~~  
- [x] ~~Define design tokens scope (colors, type, spacing) draft~~

### **Week 2 · May 14– May 20 — Low-Fi Wireframes (Client App)**

- [x] ~~Wireframe: onboarding, login, KYC-lite for clients~~  
- [x] ~~Wireframe: search \+ PostGIS-based filtering UI~~  
- [x] ~~Wireframe: booking flow (On-Demand & Scheduled)~~  
- [x] ~~Wireframe: tracking map and booking status screens~~  
- [x] ~~Internal review of Client low-fi flows~~

### **Week 3 · May 21 – May 27 — Low-Fi Wireframes (Handyman \+ Admin)**

- [ ]  🟢 **Standup \#1 — May 20** (review Phase 1 progress, blockers)  
- [ ]  Wireframe: Handyman onboarding \+ KYC document upload  
- [ ]  Wireframe: Online/Offline toggle, job inbox, state-driven workflow  
- [ ]  Wireframe: Handyman wallet & payout request  
- [ ]  Wireframe: Admin dashboard, verification portal, dispute center  
- [ ]  Stakeholder review of all low-fi flows

### **Week 4 · May 28 – June 3 — High-Fi Mockups & Design System**

- [ ]  Build design system in Figma (components, variants, tokens)

- [ ]  High-fi mockups: Client app key screens

- [ ]  High-fi mockups: Handyman app key screens

- [ ]  High-fi mockups: Admin web dashboard

- [ ]  Prototype interactive flows for usability test

### **Week 5 · June 4 – June 10 — Database Architecture & Finalization**

- [ ]  🟢 **Standup \#2 — June 3** (sign-off on designs)

- [ ]  ER diagram \+ PostgreSQL/PostGIS schema draft

- [ ]  State machine spec (booking lifecycle)

- [ ]  API contract / OpenAPI draft

- [ ]  Tech stack lock-in, repo scaffolding plan

- [ ]  🎯 **Milestone:** Final interactive mockups \+ database architecture approved

---

## **Phase 2 — Core Build (June 8 – August 7, 2026\)**

### **Week 6 · June 11 – June 17 — Scaffolding & Auth**

- [ ]  Initialize mobile (Client \+ Handyman) and web (Admin) projects

- [ ]  Set up CI/CD, linting, environment configs

- [ ]  Implement authentication (signup/login, JWT/refresh, password reset)

- [ ]  Provision database, base migrations, seed scripts

### **Week 7 · June 18 – June 24 — User Profiles & KYC Backend**

- [ ]  🟢 **Standup \#3 — June 17**

- [ ]  Profile CRUD for Client and Handyman

- [ ]  KYC document upload (storage, signed URLs)

- [ ]  Role-based access control middleware

- [ ]  Unit tests for auth \+ profiles

### **Week 8 · June 25 – July 1 — Booking System Core**

- [ ]  Booking entity \+ lifecycle states

- [ ]  PostGIS-based worker search (radius queries)

- [ ]  On-Demand booking flow (API \+ Client UI)

- [ ]  Scheduled booking flow with calendar

### **Week 9 · July 2 – July 8 — Booking Flows (Continued)**

- [ ]  🟢 **Standup \#4 — July 1**

- [ ]  Handyman job inbox (accept / reject)

- [ ]  Booking detail screens (both apps)

- [ ]  Cancellation logic (pre-acceptance)

- [ ]  Integration tests for booking endpoints

### **Week 10 · July 9 – July 15 — Worker Management & Availability**

- [ ]  Online/Offline toggle (visibility in search)

- [ ]  Service categories, pricing per worker

- [ ]  Handyman availability calendar

- [ ]  Search ranking heuristics (distance, rating placeholder)

### **Week 11 · July 16 – July 22 — State Machine Workflow**

- [ ]  🟢 **Standup \#5 — July 15**

- [ ]  Implement state machine: Accept → Arrived → Work Started → Complete

- [ ]  Guard rails: invalid transition rejection (e.g., no Paid before Completed)

- [ ]  Handyman action UI (state-driven buttons)

- [ ]  Audit log for state transitions

### **Week 12 · July 23 – July 29 — Admin Verification Portal**

- [ ]  Admin web: KYC review queue

- [ ]  Approve / reject Handyman documents

- [ ]  User management (suspend, reinstate)

- [ ]  Basic admin analytics widgets (bookings, signups)

### **Week 13 · July 30 – August 5 — Rating & Review Loop**

- [ ]  🟢 **Standup \#6 — July 29**

- [ ]  Post-job rating (Client → Handyman, Handyman → Client)

- [ ]  Trust Score computation

- [ ]  Review display on profiles

- [ ]  Moderation flags for reviews

### **Week 14 · August 6 – August 12 — Phase 2 Hardening**

- [ ]  End-to-end manual QA on core flows

- [ ]  Bug triage and fix sweep

- [ ]  Performance baseline (DB indexing, query review)

- [ ]  🎯 **Milestone:** Functional booking, worker workflow, admin verification, rating loop

---

## **Phase 3 — Integration (August 10 – October 9, 2026\)**

### **Week 15 · August 13 – August 19 — Escrow Foundation**

- [ ]  🟢 **Standup \#7 — August 12**

- [ ]  Payment provider integration (auth/capture)

- [ ]  Escrow Hold-and-Release implementation

- [ ]  Webhook handlers \+ idempotency

- [ ]  Payment failure / retry logic

### **Week 16 · August 20 – August 26 — Digital Wallet & Payouts**

- [ ]  Handyman wallet ledger (earnings, fees)

- [ ]  Daily/weekly earnings dashboard

- [ ]  Payout request flow \+ admin approval

- [ ]  Reconciliation report

### **Week 17 · August 27 – September 2 — PostGIS & Real-Time Tracking**

- [ ]  🟢 **Standup \#8 — August 26**

- [ ]  WebSocket / pub-sub infra for live location

- [ ]  Handyman location publisher (background-safe)

- [ ]  Client live map view (In-Transit)

- [ ]  Geofence triggers (Arrived auto-detect option)

### **Week 18 · September 3 – September 9 — Tracking Polish & Saved Addresses**

- [ ]  Battery/throttling optimizations for location

- [ ]  Saved addresses (Home, Office, etc.)

- [ ]  ETA computation

- [ ]  Map UX refinements

### **Week 19 · September 10 – September 16 — Notifications & Messaging**

- [ ]  🟢 **Standup \#9 — September 9**

- [ ]  Unified notification engine (push, email, SMS)

- [ ]  In-app messaging (private, masked identifiers)

- [ ]  Notification preferences screen

- [ ]  Templated transactional notifications per state change

### **Week 20 · September 17 – September 23 — Safety: SOS, Masked Calls, Photo Proof**

- [ ]  Photo proof on Work Started \+ Complete (required)

- [ ]  Emergency SOS button (GPS to admin/authorities)

- [ ]  Masked calling via VoIP / number masking provider

- [ ]  Dispute Center photo evidence viewer (Admin)

### **Week 21 · September 24 – September 30 — Dynamic Pricing & Cancellation Fees**

- [ ]  🟢 **Standup \#10 — September 23**

- [ ]  Surge pricing engine (supply/demand multipliers)

- [ ]  Cancellation policy logic \+ Travel Fee captures

- [ ]  Pricing transparency UI (Client \+ Handyman)

- [ ]  Admin overrides for surge windows

### **Week 22 · October 1 – October 7 — Retention & Growth Features**

- [ ]  Tiered membership (Gold Status, fee tiers, perks)

- [ ]  Geofenced contextual notifications (weather/seasonal)

- [ ]  Referral / promo codes

- [ ]  Saved addresses \+ smart suggestion notifications

### **Week 23 · October 8 – October 14 — Integration QA**

- [ ]  🟢 **Standup \#11 — October 7**

- [ ]  End-to-end integration test pass

- [ ]  Cross-feature regression sweep

- [ ]  Observability: logging, metrics, alerts

- [ ]  🎯 **Milestone:** Escrow, real-time logistics, notifications, dynamic pricing live

---

## **Phase 4 — Launch & Audit (October 12 – November 13, 2026\)**

### **Week 24 · October 14 – October 21 — Security Audit**

- [ ]  OWASP Top 10 review (mobile \+ web \+ API)

- [ ]  Penetration testing (auth, payments, file uploads)

- [ ]  Secrets/key rotation, RBAC review

- [ ]  Privacy review (PII, masked calls/chat retention)

### **Week 25 · October 22 – October 28 — Stress Testing**

- [ ]  🟢 **Standup \#12 — October 21**

- [ ]  Load tests (booking, search, sockets)

- [ ]  DB scale tests (PostGIS query plans, indexing)

- [ ]  Failover / disaster recovery drill

- [ ]  Performance budget sign-off

### **Week 26 · October 29 – November 4 — Closed Beta**

- [ ]  Internal/closed beta release (TestFlight \+ Play Internal)

- [ ]  Bug bash with stakeholders

- [ ]  Crash analytics \+ telemetry review

- [ ]  Hotfix sprint

### **Week 27 · November 5 – November 11 — Store Submission Prep**

- [ ]  🟢 **Standup \#13 — November 4**

- [ ]  Store assets (screenshots, descriptions, privacy policy)

- [ ]  App Store \+ Play Store submission

- [ ]  Marketing site / landing page

- [ ]  Support and onboarding documentation

### **Week 28 · November 12 – November 18 — Production Launch**

- [ ]  Address store review feedback (if any)

- [ ]  Production rollout (phased if needed)

- [ ]  Monitor live metrics; on-call rotation

- [ ]  Post-launch retro \+ roadmap handoff

- [ ]  🎯 **Milestone:** Public launch on App Store & Play Store

---

## **Standup Quick Index**

| \# | Date | Phase |
| :---- | :---- | :---- |
| 1 | May 19, 2026 | Phase 1 |
| 2 | June 2, 2026 | Phase 1 |
| 3 | June 16, 2026 | Phase 2 |
| 4 | June 30, 2026 | Phase 2 |
| 5 | July 14, 2026 | Phase 2 |
| 6 | July 28, 2026 | Phase 2 |
| 7 | August 11, 2026 | Phase 3 |
| 8 | August 25, 2026 | Phase 3 |
| 9 | September 8, 2026 | Phase 3 |
| 10 | September 22, 2026 | Phase 3 |
| 11 | October 6, 2026 | Phase 3 |
| 12 | October 20, 2026 | Phase 4 |
| 13 | November 3, 2026 | Phase 4 |

