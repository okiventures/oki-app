# Handyman Marketplace App - Development Guide

## Project Overview
A 3-sided service marketplace ecosystem connecting homeowners (clients) with local handymen (service providers), managed by an administrative platform. The system consists of three interconnected applications: Client App (mobile), Handyman App (mobile), and Admin Dashboard (web).

**Tech Stack:**
- Database: PostgreSQL with PostGIS extensions
- Backend/Auth: Supabase (Auth, Storage, Realtime)
- Frontend Web: Next.js + Tailwind CSS
- Mobile: React Native (Expo)
- Infrastructure: Vercel (Web), Expo Application Services (Mobile)
- Payment Provider: PCI-compliant solution (Stripe/PayMongo)

---

## Core Architecture Principles

### State Machine Logic
Implement strict booking lifecycle state transitions to prevent invalid operations:
```
Pending → Accepted → In-Transit → Arrived → Work Started → Completed → Paid
```

**Guard Rails:**
- A booking can NEVER move to "Paid" unless it's first marked "Completed"
- Invalid transitions are automatically rejected by the backend
- Audit log captures all state transitions with timestamps

### Data Privacy & Security
- All authentication must use Supabase Auth (never store plain-text passwords)
- Government IDs stored in Private Storage buckets accessible only by Admin
- Row Level Security (RLS) prevents users from viewing each other's private data
- Implement masked identifiers in messaging (no phone numbers exposed)

### Real-time Capabilities
- Use Supabase Realtime for live job status updates
- WebSocket infrastructure for live location tracking
- Pub/sub pattern for broadcasting state changes

---

## CLIENT APP (Mobile - Customers)

### Primary Goal
Frictionless discovery and secure booking of handyman services.

### User Journey
Search by category → Filter by distance/rating → Book (Instant or Scheduled) → Pay → Review

### Screens & Features

#### 1. Onboarding & Authentication
**Screens:**
- Sign Up / Login screen
- Email verification
- Phone number verification (optional)
- KYC-lite for clients (optional, may skip)

**Features:**
- JWT-based authentication with refresh token rotation
- Password reset flow
- Social login integration (optional)

#### 2. Home & Discovery
**Screen: Home Dashboard**
- Featured/recommended handymen
- Quick access buttons: "Book Now" or "Schedule"
- User's saved addresses displayed
- Current location indicator

**Screen: Search & Browse**
- Service category filter (Plumbing, Electrical, Carpentry, etc.)
- Location-based filtering (radius-based using PostGIS)
- Distance display for each worker
- Rating display (stars + review count)
- Price range indicator
- Worker availability status (Online/Offline)
- Search load time: < 2 seconds

**Filtering Options:**
- Distance radius (1km, 5km, 10km, custom)
- Worker rating (4+, 4.5+, etc.)
- Service category
- Price range
- Availability only

#### 3. Worker Profile
**Screen: Worker Detail Page**
- Profile photo
- Full name and ID badge (verified status)
- Overall rating (stars + number of reviews)
- Service categories offered
- Price per service
- Availability calendar
- Number of jobs completed
- Customer reviews (paginated, recent first)
- Response time average
- "Book Now" or "Schedule" CTA button

#### 4. Booking Flow

**Screen: Booking Type Selection**
- "On-Demand" (immediate help needed)
- "Scheduled" (pick date & time)

**Screen: On-Demand Booking**
- Current location (map view)
- Service category selection (if not pre-selected)
- Quick description box
- Photos upload (optional, for context)
- Price quote (calculated based on PostGIS distance + surge pricing)
- Escrow payment amount (displayed as "Authorized, not charged yet")
- Confirm booking button

**Screen: Scheduled Booking**
- Date picker
- Time picker (available slots for worker)
- Service category selection
- Detailed description box
- Photos upload (optional)
- Select address (saved or new)
- Price quote (static, no surge)
- Confirm booking button

#### 5. Saved Addresses
**Screen: My Addresses**
- List of saved addresses (Home, Office, Parents' House, etc.)
- Address label and full address text
- Set as default
- Edit / Delete buttons
- Add new address button

**Implementation:**
- Store address with geofencing metadata for contextual notifications
- Autocomplete address search using PostGIS

#### 6. Active Booking Tracking
**Screen: Booking Status / Tracking**
- Current job status (Pending, Accepted, In-Transit, Arrived, Work Started, Completed)
- Handyman's live location (map view, only visible when In-Transit)
- ETA to arrival
- Handyman's name, photo, rating
- Contact handyman button (in-app messaging)
- Emergency SOS button (red panic button)

**Live Updates:**
- Real-time status updates without page refresh (Supabase Realtime)
- WebSocket connection for location tracking
- Notification on each status change

#### 7. Booking History & Management
**Screen: Past Bookings**
- List of completed bookings (most recent first)
- Each booking shows: date, handyman name, service, total paid, status
- Tap to view details
- Rebook button (quick rebook same service)
- Report issue button (for disputes)

#### 8. In-App Messaging
**Screen: Chat with Handyman**
- Private message thread with the assigned handyman
- Message history (persistent)
- Photo sharing capability (for job context)
- Typing indicator
- Message read/delivery status
- Masked identifiers (no phone numbers shown)

**Security:**
- End-to-end encrypted (optional, but recommended)
- Messages stored with encryption
- Admin can view chat for disputes only

#### 9. Payment & Escrow
**Screen: Payment Authorization**
- Booking summary (service, worker, amount)
- Amount to be authorized (not charged immediately)
- Payment method selector
- "Authorize Payment" button
- Disclaimer: "Funds will be charged only upon job completion"

**After Completion:**
- Amount captured automatically
- Receipt displayed
- Payment breakdown shown (service cost + platform fee)
- Option to download receipt

#### 10. Rating & Review
**Screen: Rate Handyman (Post-Job)**
- Handyman photo and name
- 5-star rating selector
- Detailed review text box (optional)
- Photo upload (optional - job photos for reference)
- Submit button
- Option to skip

**Trust Score Calculation:**
- Aggregate of all ratings
- Display as both stars and percentage
- Influences worker visibility in search rankings

#### 11. Notifications & Settings
**Screen: Notifications**
- List of in-app notifications (status updates, alerts)
- Notification history
- Mark as read / Archive

**Screen: Notification Preferences**
- Toggle push notifications (On/Off)
- Toggle email notifications (On/Off)
- Toggle SMS notifications (On/Off)
- Select notification categories (booking updates, promotions, etc.)

**Notification Types:**
- Booking accepted
- Handyman in transit
- Handyman arrived
- Work started
- Work completed
- Payment captured
- New review posted
- Promotional alerts

#### 12. User Account
**Screen: Profile**
- User photo
- Full name
- Email address
- Phone number
- Saved addresses (quick link)
- Payment methods
- Saved payment method indicator

**Screen: Account Settings**
- Edit profile (name, photo)
- Change password
- Two-factor authentication toggle
- Privacy settings
- Notification preferences (link)
- Feedback / Help

---

## HANDYMAN APP (Mobile - Service Providers)

### Primary Goal
Efficient job management and lead conversion for service providers.

### User Journey
Profile setup/KYC → Toggle "Online" → Receive Request → Navigate to Job → Complete Work → Request Payout

### Screens & Features

#### 1. Onboarding & KYC
**Screen: Sign Up**
- Phone number
- Full name
- Email address
- Password setup
- Terms acceptance

**Screen: KYC Document Upload**
- Government ID selection (Driver's License, Passport, etc.)
- ID photo (front side)
- ID photo (back side, if applicable)
- Selfie verification (liveness check, optional)
- Address confirmation
- Submit for verification

**Backend Verification:**
- Admin reviews in Admin dashboard
- Approval/rejection with feedback
- Worker notified of status

#### 2. Profile Setup
**Screen: Service Provider Profile**
- Photo upload (profile picture)
- Hourly rate or per-service pricing
- Service category selection (multi-select)
- Service description (bio)
- Availability calendar (default hours)
- Years of experience
- Certifications (optional)

#### 3. Online/Offline Toggle
**Screen: Dashboard / Status**
- Large toggle button: "Go Online" / "Go Offline"
- Current status indicator (Online - green, Offline - gray)
- Number of pending requests (if online)
- Active bookings counter
- Recent earnings (today, this week)
- Quick access to job inbox

**Functionality:**
- When offline: worker is invisible in client search results
- When online: worker appears in location-based search
- Can toggle at any time

#### 4. Job Inbox & Management
**Screen: Active Jobs / Job Inbox**
- List of incoming job requests (when online)
- Each job card shows:
  - Client name and rating
  - Service category
  - Booking type (On-Demand or Scheduled)
  - Job location (distance from current location)
  - Estimated pay
  - "Accept" and "Decline" buttons
  - Job details expand button

**Sorting/Filtering:**
- Most recent first (default)
- Filter by service category
- Filter by distance
- Filter by estimated pay

#### 5. Job Details & Acceptance
**Screen: Job Details / Request**
- Client name and profile rating
- Service category
- Job description (as entered by client)
- Job location (address and map)
- Distance to job
- Booking type (On-Demand or Scheduled)
- Scheduled time (if applicable)
- Photos shared by client (if any)
- Estimated pay / proposed rate
- Client's chat contact information (blocked until accepted)
- Accept / Decline buttons

**Upon Acceptance:**
- Job moves to "Active Jobs"
- State changes to "Accepted"
- Worker can view client phone (masked, for contact purposes)
- In-app messaging becomes available

#### 6. State-Driven Workflow
**Screen: Active Job / Job Progress**
- Large status indicator (visual state)
- Current action button (context-dependent):
  - "I've Arrived" (when state is Accepted, after arriving at location)
  - "Start Work" (when state is Arrived)
  - "Complete Work" (when state is Work Started)

**Navigation Features:**
- Navigate to job button (opens Google Maps/Apple Maps)
- Current location (map view with job location)
- Distance to job and ETA
- Client contact (in-app messaging)
- Emergency SOS button

#### 7. Photo Proof Requirement
**Screen: Complete Work / Upload Proof**
- "Before" photo (required, taken at Work Started phase)
- "After" photo (required, taken at Complete Work phase)
- Camera access requirement
- Photo preview and confirmation
- Retake option if needed
- Submit button

**Implementation:**
- Photos stored in Private Storage bucket
- Accessible to Admin for dispute resolution
- Stored with metadata (timestamp, GPS location)

#### 8. Job Completion & Status
**Screen: Work Completed**
- Confirmation message
- Summary of work done
- Duration of work
- Photos uploaded (preview)
- Amount earned (displayed)
- Tip option (optional, client can add)
- Next steps indication (awaiting client completion or rating)

#### 9. Active Jobs List
**Screen: My Active Jobs**
- List of ongoing jobs
- Each job shows:
  - Client name
  - Current status
  - Time elapsed
  - Location
  - Tap to view details
- Completed but unrated jobs highlighted

#### 10. Digital Wallet & Earnings
**Screen: Wallet Dashboard**
- Current balance
- Today's earnings
- This week's earnings
- This month's earnings
- Total earnings (all-time)
- Breakdown of fees (platform fee %)

**Screen: Earnings History**
- List of completed jobs with payment status
- Each entry shows:
  - Date
  - Client name
  - Service category
  - Gross amount
  - Platform fee deduction
  - Net earnings
  - Status (Completed, Paid, Pending payout)
- Filter by date range
- Filter by status

**Screen: Payout Request**
- Available balance to withdraw
- Request payout button
- Select payout method (bank account, GCash, etc.)
- Payout history (recent payouts)
- Estimated processing time

**Payout Flow:**
- Worker requests payout
- Admin approves/reviews in Admin dashboard
- Funds transferred to worker's account
- Notification sent to worker
- Payout status visible in history

#### 11. Tiered Membership (Gamification)
**Screen: Membership / Status**
- Current tier (Bronze, Silver, Gold, Platinum)
- Progress to next tier
- Tier benefits display:
  - Lower platform fees
  - Early access to high-paying jobs
  - Priority support
- Jobs completed counter
- Average rating display

**Tier Calculation:**
- Gold Status: 5-star rating for 50+ jobs
- Higher tiers based on volume and rating

#### 12. Notifications & Settings
**Screen: Notifications**
- List of in-app notifications
- Job requests (when online)
- Payout approvals
- Rating notifications
- Admin messages
- Mark as read / Archive

**Screen: Availability Calendar**
- Calendar view of available hours
- Set default availability (e.g., 9 AM - 5 PM, weekends off)
- Block specific dates/times
- Bulk set for week/month

#### 13. Ratings & Reviews
**Screen: My Reviews**
- List of reviews from clients
- Sort by recent, highest rated, lowest rated
- Filter by rating (5 stars, 4+ stars, etc.)
- Display full review text
- Response to review option (optional feature)

#### 14. Worker Account
**Screen: My Profile**
- Profile photo
- Full name
- Service categories
- Average rating
- Jobs completed counter
- Years of experience
- Bio/description

**Screen: Account Settings**
- Edit profile (photo, bio, experience)
- Edit service categories and pricing
- Change password
- Bank account / payout method management
- Two-factor authentication
- Privacy settings
- Contact support

---

## ADMIN DASHBOARD (Web)

### Primary Goal
Platform governance, business intelligence, and dispute resolution.

### User Journey
Verify worker IDs → Monitor Transaction logs → Manage disputes → View analytics

### Screens & Features

#### 1. Dashboard / Home
**Screen: Admin Overview**
- Key metrics cards:
  - Total bookings (today, this week, this month)
  - Total platform fees collected
  - Active users (clients + handymen)
  - New signups (today, this week)
  - Platform health indicator (uptime %)
- Charts:
  - Bookings over time (line chart, last 30 days)
  - Revenue trend (line chart, last 30 days)
  - Top services (bar chart)
  - Active users by location (map view)
- Recent activity feed
- Quick action buttons

#### 2. User Management
**Screen: Users List**
- Filterable table of all users (Clients + Workers)
- Columns: Name, Type (Client/Worker), Email, Status (Active/Suspended/Banned), Signup Date, Last Activity
- Search by name, email, phone
- Filter by user type
- Filter by status
- Sort by any column

**Screen: User Detail**
- User profile information
- Contact details
- Account status
- Join date
- Total transactions / bookings
- Average rating (if worker)
- Action buttons:
  - Suspend account
  - Reinstate account
  - Send message
  - View activity logs

#### 3. KYC Verification Portal
**Screen: Pending Verification Queue**
- List of workers awaiting KYC approval
- Each worker card shows:
  - Name
  - Signup date
  - Document type submitted
  - "Review" button
  - Time in queue

**Screen: KYC Review Detail**
- Worker information
  - Name
  - Email
  - Phone
  - Service categories
- Submitted documents:
  - Government ID (front and back)
  - Selfie (if submitted)
- Admin actions:
  - Approve button
  - Reject button (with reason text field)
  - Request resubmission
  - Flag for manual review

**Rejection Reasons:**
- Document unclear
- Document expired
- Name mismatch
- Multiple accounts detected
- Other (with custom message)

**Workflow:**
- Workers notified of approval/rejection via push + email
- Approved workers can immediately go online
- Rejected workers receive feedback and retry option

#### 4. Transaction & Payment Monitoring
**Screen: Transactions List**
- Table of all transactions
- Columns: Date, Booking ID, Client, Worker, Amount, Status (Authorized, Captured, Failed, Refunded), Platform Fee
- Search by booking ID, client name, worker name
- Filter by date range
- Filter by status
- Filter by payment method
- Sort by date, amount, status

**Screen: Transaction Detail**
- Booking ID and link to booking
- Client details
- Worker details
- Service details
- Payment timeline:
  - Authorized: [date/time]
  - Captured: [date/time]
  - Settled: [date/time]
- Amount breakdown:
  - Gross amount
  - Platform fee (%)
  - Net to worker
- Payment method used
- Payment processor response codes

#### 5. Dispute Resolution Center
**Screen: Disputes List**
- List of active disputes and resolved disputes
- Each dispute shows:
  - Dispute ID
  - Booking reference
  - Reporter (Client or Worker)
  - Issue type (Refund request, Quality issue, Non-completion, etc.)
  - Status (Open, In Review, Resolved, Closed)
  - Created date
  - "Review" button

**Screen: Dispute Detail**
- Booking information (full summary)
- Dispute information:
  - Reporter name and side (client or worker)
  - Reported date
  - Issue description
- Evidence:
  - Chat log (full conversation thread)
  - Photos uploaded (before/after from worker)
  - Any file attachments
- Admin actions:
  - View full chat log
  - Side with client (issue refund)
  - Side with worker (confirm payment)
  - Request more information
  - Close dispute with resolution message
  - Ban user (if fraud detected)

**Refund Workflow:**
- Admin initiates refund
- Original amount credited back to client's card/wallet
- Worker's earnings adjusted (deducted)
- Both parties notified

#### 6. Bookings Management
**Screen: Bookings List**
- Table of all bookings
- Columns: Booking ID, Date, Client, Worker, Service, Status (Pending, Accepted, Completed, Paid, Cancelled), Amount
- Search by booking ID, client name, worker name
- Filter by date range
- Filter by status
- Filter by service category
- Sort by date, status, amount

**Screen: Booking Detail**
- Full booking summary:
  - Booking ID
  - Booking date and time
  - Client name, rating, profile link
  - Worker name, rating, profile link
  - Service category and description
  - Job location
  - Booking type (On-Demand or Scheduled)
- Status timeline:
  - Pending: [date/time]
  - Accepted: [date/time]
  - In-Transit: [date/time]
  - Arrived: [date/time]
  - Work Started: [date/time]
  - Completed: [date/time]
  - Paid: [date/time]
- Payment information (escrow details)
- Photos (if job completed with proof)
- Chat log link
- Ratings (client → worker, worker → client)
- Admin notes field

#### 7. Verification & Safety
**Screen: Verification Dashboard**
- Pending verifications counter
- Verified workers counter
- KYC queue status
- Recent rejections

**Screen: Reported Users**
- Users flagged for suspicious activity
- Reasons for flag
- Number of complaints
- Action taken (warning, suspension, ban)

#### 8. Analytics & Reporting
**Screen: Analytics Dashboard**
- Metrics:
  - Total revenue (MoM growth %)
  - Total bookings (MoM growth %)
  - Average booking value
  - Conversion rate (bookings / searches)
  - Customer retention rate
  - Worker retention rate
- Charts:
  - Revenue by service category (pie chart)
  - Bookings by service category (bar chart)
  - Peak hours (line chart)
  - Geographic distribution (map)
  - Daily/weekly/monthly trends
- User acquisition funnel
- Churn analysis

**Screen: Custom Reports**
- Date range selector
- Metric selector (checkboxes for which metrics to include)
- Export options (PDF, CSV, Excel)
- Scheduled report delivery

#### 9. Settings & Configuration
**Screen: Platform Settings**
- Commission/platform fee (percentage, editable)
- Surge pricing multiplier range
- Cancellation fee rules
- Dispute resolution timeout (days)
- KYC auto-approval settings (optional)
- Notification templates editor
- Email template editor

**Screen: Feature Flags**
- Toggle features on/off for testing
- Surge pricing toggle
- Rating system toggle
- Specific feature rollout controls

#### 10. Support & Messaging
**Screen: Support Tickets**
- List of user-submitted support tickets
- Status (Open, In Progress, Resolved, Closed)
- Priority (Low, Medium, High, Critical)
- Assign to team member
- Response time tracking
- View full conversation

**Screen: Send Broadcast Message**
- Compose message
- Target audience (All Users, All Workers, Specific User, etc.)
- Message type (Notification, Email, SMS)
- Schedule send or send immediately
- Preview message

#### 11. Compliance & Audit Logs
**Screen: Audit Log**
- Log of all system changes
- Timestamp, admin user, action, details
- Filter by action type (Payment captured, User suspended, Dispute resolved, etc.)
- Filter by date range
- Filter by admin user
- Export audit log

**Screen: Compliance Checklist**
- OWASP Top 10 compliance status
- Data protection compliance (GDPR, local regulations)
- Payment compliance (PCI-DSS)
- Regular security audit checklist

---

## Sub-Features & Technical Implementation

### Unified Notification Engine
**Implementation:**
- Trigger: Each state change in booking lifecycle
- Channels: Push (mobile), Email, SMS
- Templating system for dynamic content
- Retry logic for failed deliveries
- User preference respect (opt-out support)

**Notification Flow:**
```
Event (state change) → Message Queue → Send to all channels → Log delivery status
```

**Examples:**
- Booking Accepted: "Your handyman John has accepted your request"
- In-Transit: "John is on the way! ETA 12 minutes"
- Work Completed: "Work completed. Rate John and release payment?"
- Payment Captured: "Payment of ₱1,500 captured. Handyman paid ₱1,350"

### In-App Messaging
**Features:**
- One-to-one encrypted chat
- Message persistence (database storage)
- Read receipts
- Typing indicators
- Photo sharing
- Masked user identifiers (worker ID instead of phone)
- Admin access for disputes only

**Database Schema:**
```
messages table:
- id (PK)
- booking_id (FK)
- sender_id (FK to users)
- receiver_id (FK to users)
- message_text
- photos (array of storage URLs)
- read_at (timestamp)
- created_at (timestamp)
```

### Real-Time Location Tracking
**Architecture:**
- Handyman publishes location periodically (every 30 seconds, battery-optimized)
- Client listens to handyman's location channel via WebSocket
- Map updates in real-time
- Geofence triggers when handyman within 100m of destination

**Optimization:**
- Background mode support (iOS & Android)
- Battery throttling when handyman idle
- Resume tracking when entering active zone

### Rating & Review System
**Two-Way Rating:**
- Client rates Handyman (1-5 stars + text review)
- Handyman rates Client (1-5 stars + text review)
- Both triggered post-job automatically

**Trust Score Calculation:**
```
trust_score = (sum of all ratings / number of ratings) * 100
displayed as: 4.8/5.0 (87 reviews)
```

**Moderation:**
- Flag inappropriate reviews
- Admin can hide reviews if needed
- Auto-detect spam keywords

### Escrow & Payment Flow
**Step-by-Step:**
1. Client initiates booking
2. Payment method selected
3. Amount authorized (hold placed, not charged)
4. Booking accepted by worker
5. Work completed by worker
6. Client confirms completion (or admin auto-confirms after timeout)
7. Payment captured
8. Platform fee deducted automatically
9. Net amount transferred to worker's wallet
10. Client receives receipt

**Failure Handling:**
- Authorization fails: booking cancelled, user notified
- Capture fails: retry logic with exponential backoff
- Refund initiated: original payment method credited

### Surge Pricing & Dynamic Pricing
**Trigger Conditions:**
- Low worker availability (< 5 workers online in area)
- High demand (> 10 bookings pending in area)
- Weather events (rain, storm detected via external API)
- Time of day (peak hours, e.g., 5-7 PM)

**Calculation:**
```
base_price = distance * rate_per_km + service_fee
surge_multiplier = 1.0 to 2.5 (configurable max)
final_price = base_price * surge_multiplier
```

**Display:**
- Transparent pricing shown before booking
- Surge indicator displayed
- Real-time price updates if conditions change before confirmation

### Cancellation & Travel Fees
**Cancellation Fee Logic:**
- If cancelled before worker accepts: No fee, full authorization hold released
- If cancelled after acceptance but before In-Transit: No fee to client, travel fee (if set) to worker
- If cancelled after In-Transit: Full travel fee to worker, partial refund to client

**Travel Fee Deduction:**
- Calculated as percentage of booking amount or flat fee
- Deducted from client's authorized hold
- Remainder released back to client

### Saved Addresses & Geofencing
**Saved Address Features:**
- Store multiple addresses (Home, Office, etc.)
- Auto-complete address search
- Set default address
- Edit/delete functionality

**Geofencing Notifications:**
- Trigger contextual notifications based on saved addresses
- Example: "It's raining near your home. Need a plumber check-up?"
- Requires user opt-in to location-based notifications

**Database:**
```
saved_addresses table:
- id (PK)
- user_id (FK)
- address_text (string)
- label (Home, Office, etc.)
- latitude (float)
- longitude (float)
- is_default (boolean)
```

### Emergency SOS / Panic Button
**Functionality:**
- One-tap access (large red button)
- Immediately sends location to Admin team
- Can send to local authorities (optional, jurisdiction-based)
- Worker and Client both have SOS button

**Data Sent:**
- User ID
- Current GPS location (latitude, longitude)
- User type (Client or Worker)
- Booking ID (if active)
- Timestamp

**Admin View:**
- Alert notification
- SOS location on admin map
- User details
- Action buttons: Contact user, Contact authorities, Mark resolved

### Masked Calling
**Implementation:**
- VoIP integration (Twilio or similar) or number masking provider
- Never expose actual phone numbers
- Virtual numbers assigned per booking
- Call logs recorded (for support/disputes)
- Number deactivated after booking complete

**Flow:**
1. Handyman dials masked virtual number
2. System routes call to Client's phone (without exposing their number)
3. Client dials masked virtual number (reverse)
4. System routes to Handyman
5. Both parties see virtual number only

---

## Development Phases & Milestones

### Phase 1: System Design (May 5 – June 5, 2026)
- Figma design system completion
- Low-fi and high-fi mockups for all three apps
- PostgreSQL/PostGIS schema design
- State machine specification
- API contract / OpenAPI spec
- Tech stack finalization
- CI/CD pipeline setup

**Deliverable: Final interactive mockups + database architecture approved**

### Phase 2: Core Build (June 8 – August 7, 2026)
- Authentication system (signup, login, password reset)
- User profiles (Client, Handyman, Admin)
- KYC system (document upload, storage, admin review)
- Booking system (core logic, state machine)
- PostGIS geospatial search
- Job inbox and management
- Rating & review system
- Admin verification portal
- 100% test coverage for core flows

**Deliverable: Functional booking, worker workflow, admin verification, rating loop**

### Phase 3: Integration (August 10 – October 9, 2026)
- Payment provider integration (Stripe/PayMongo)
- Escrow system implementation
- Digital wallet and payouts
- WebSocket real-time location tracking
- Saved addresses and geofencing
- Unified notification engine (push, email, SMS)
- In-app messaging
- Safety features (SOS, photo proof, masked calling)
- Surge pricing engine
- Cancellation fee logic
- Tiered membership system
- End-to-end integration tests

**Deliverable: Escrow, real-time logistics, notifications, dynamic pricing live**

### Phase 4: Launch & Audit (October 12 – November 13, 2026)
- Security audit (OWASP Top 10)
- Penetration testing
- Load testing (target: 10k-100k concurrent users)
- Stress testing (payment, search, sockets)
- Database optimization
- Closed beta testing
- App Store & Play Store submission
- Production deployment
- On-call monitoring setup

**Deliverable: Public launch on App Store & Play Store**

---

## Performance & Quality Standards

### Latency Requirements
- Search results: < 2 seconds
- Location update (live tracking): < 1 second
- Notification delivery: < 5 seconds
- Payment authorization: < 3 seconds
- Page load (Admin dashboard): < 2 seconds

### Uptime & Reliability
- Target uptime: 99.9% during Beta and Launch
- Database backup: Daily, with point-in-time recovery
- Failover: Automated database replica promotion
- CDN: Global content delivery for static assets

### Test Coverage
- Unit tests: 80%+ coverage for critical paths
- Integration tests: All API endpoints
- E2E tests: Core user journeys (booking, payment, rating)
- Manual QA: Full regression on each phase

### Security Requirements
- All API endpoints require authentication
- Row Level Security enforced on all database tables
- HTTPS only (no HTTP)
- Rate limiting on auth endpoints (5 attempts/minute)
- CORS properly configured (whitelist domains)
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize user input)
- CSRF token validation on state-changing requests

---

## Success Metrics (KPIs)

### Technical Metrics
1. **Latency**: Search results < 2 seconds
2. **Uptime**: 99.9% availability during Beta phase
3. **Conversion**: 80% of users who start booking complete payment authorization

### Business Metrics
1. Booking completion rate: Target 75%+
2. Customer retention: Target 50%+ monthly active users
3. Worker retention: Target 60%+ monthly active workers
4. Average rating: Target 4.5+ stars
5. Platform revenue: ₱platform_fee × number_of_bookings

---

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL + PostGIS | Data storage + geospatial queries |
| Auth | Supabase Auth | User authentication + JWT |
| Storage | Supabase Storage | KYC documents, photos, files |
| Realtime | Supabase Realtime | Live job status, location tracking |
| Mobile | React Native (Expo) | Cross-platform mobile apps |
| Web Frontend | Next.js + Tailwind | Admin dashboard + web client |
| Backend API | Supabase (serverless) | REST API endpoints |
| Notifications | Supabase + third-party | Push, email, SMS delivery |
| Payments | Stripe or PayMongo | Payment processing + escrow |
| Maps | Google Maps / PostGIS | Location search + tracking |
| Hosting | Vercel (Web), Expo (Mobile) | Deployment + CDN |
| CI/CD | GitHub Actions | Automated testing + deployment |
| Monitoring | Sentry + custom logging | Error tracking + analytics |

---

## Notes for Development Team

1. **Start with Core First**: The booking + state machine is the foundation. Everything else depends on it being solid.

2. **Test Early**: Implement unit + integration tests from day 1. Don't write code first and test later.

3. **Security by Default**: Use Supabase RLS, never store plain passwords, mask user data in messaging.

4. **Real-Time is Hard**: Test WebSocket connections thoroughly. Include fallback polling for location tracking if WebSocket fails.

5. **Payment Testing**: Use provider's sandbox environment extensively. Test edge cases (declined cards, timeouts, refunds).

6. **Mobile Optimization**: Location tracking drains battery. Implement aggressive throttling when idle. Test on real devices, not just simulators.

7. **Admin Tools Matter**: The admin dashboard is where disputes get resolved. Make it powerful but intuitive.

8. **Document APIs**: Keep OpenAPI spec updated as you build. Use it to generate client SDKs if needed.

9. **Monitor from Day 1**: Set up error tracking, performance monitoring, and logging early. You'll need this for debugging production issues.

10. **User Feedback Loop**: Collect feedback from closed beta. Be ready to pivot on UX if needed.

---

## Appendix: Key Files & Directories Structure

```
/client-app                    # React Native - Client
  /screens
    /auth
    /discovery
    /booking
    /tracking
    /wallet
  /components
  /hooks
  /utils

/handyman-app                  # React Native - Handyman
  /screens
    /auth
    /jobs
    /workflow
    /wallet
    /profile
  /components
  /hooks
  /utils

/admin-dashboard              # Next.js - Admin
  /pages
    /dashboard
    /users
    /kyc
    /transactions
    /disputes
    /analytics
  /components
  /lib
  /utils

/backend                       # Supabase Functions (serverless)
  /functions
    /auth
    /bookings
    /payments
    /notifications
  /migrations                  # SQL migrations (PostgreSQL + PostGIS)
  /rls-policies               # Row Level Security policies

/shared                        # Shared types & utilities
  /types
  /utils
  /constants
```

---

## Questions or Clarifications?

Refer to this document when:
- Adding new features
- Designing new screens
- Implementing backend logic
- Writing tests
- Creating pull requests

Keep this in sync with the actual codebase. When in doubt, ask the team before building.
