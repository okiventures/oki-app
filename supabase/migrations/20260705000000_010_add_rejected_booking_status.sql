-- Week 9: add REJECTED to booking_status for handyman-rejected bookings.
--
-- A handyman rejecting a PENDING request moves it to the terminal REJECTED
-- state (distinct from client-initiated CANCELLED). ADD VALUE cannot be used
-- in the same transaction that references it, so this migration only extends
-- the enum — consumers (reject-booking) ship in later migrations/functions.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'REJECTED';
