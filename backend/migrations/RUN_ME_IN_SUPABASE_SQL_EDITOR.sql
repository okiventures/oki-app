-- ============================================================================
-- OKI Handyman Marketplace — Complete Database Setup
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core schema (from 001_core_schema.sql)
CREATE TYPE user_type AS ENUM ('client', 'handyman', 'admin');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE kyc_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT');
CREATE TYPE service_category AS ENUM (
  'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting',
  'HVAC', 'Roofing', 'Landscaping', 'Appliance Repair', 'General Handyman'
);
CREATE TYPE booking_status AS ENUM (
  'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED',
  'WORK_STARTED', 'COMPLETED', 'PAID', 'CANCELLED'
);
CREATE TYPE booking_type AS ENUM ('ON_DEMAND', 'SCHEDULED');
CREATE TYPE payment_status AS ENUM ('AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
CREATE TYPE wallet_tx_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE membership_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- Users table (mirrors auth.users)
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  user_type       user_type NOT NULL DEFAULT 'client',
  user_status     user_status NOT NULL DEFAULT 'ACTIVE',
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ,
  CONSTRAINT users_email_unique UNIQUE (email)
);
CREATE INDEX idx_users_user_type ON users (user_type);
CREATE INDEX idx_users_user_status ON users (user_status);

-- Handymen (1:1 extension of users)
CREATE TABLE handymen (
  id                UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  bio               TEXT,
  hourly_rate       NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  years_experience  SMALLINT NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  location          GEOGRAPHY(POINT, 4326),
  is_online         BOOLEAN NOT NULL DEFAULT false,
  kyc_status        kyc_status NOT NULL DEFAULT 'PENDING',
  membership_tier   membership_tier NOT NULL DEFAULT 'BRONZE',
  trust_score       NUMERIC(3, 2) CHECK (trust_score IS NULL OR (trust_score >= 1 AND trust_score <= 5)),
  review_count      INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  jobs_completed    INTEGER NOT NULL DEFAULT 0 CHECK (jobs_completed >= 0),
  wallet_balance    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  response_time_avg INTERVAL,
  certifications    TEXT[],
  last_seen_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_handymen_location ON handymen USING GIST (location);
CREATE INDEX idx_handymen_online_kyc ON handymen (is_online, kyc_status) WHERE is_online = true;

-- Services catalog
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  category          service_category NOT NULL,
  description       TEXT,
  base_rate         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  estimated_duration INTERVAL NOT NULL DEFAULT interval '1 hour',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_category ON services (category) WHERE is_active = true;

-- Handyman services (M:N junction)
CREATE TABLE handyman_services (
  handyman_id     UUID NOT NULL REFERENCES handymen (id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  price_override  NUMERIC(10, 2) CHECK (price_override IS NULL OR price_override >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (handyman_id, service_id)
);
CREATE INDEX idx_handyman_services_service ON handyman_services (service_id);

-- Bookings
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  handyman_id         UUID REFERENCES users (id) ON DELETE RESTRICT,
  service_id          UUID NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  booking_type        booking_type NOT NULL,
  status              booking_status NOT NULL DEFAULT 'PENDING',
  description         TEXT NOT NULL,
  address_text        TEXT NOT NULL,
  location            GEOGRAPHY(POINT, 4326) NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  platform_fee        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount          NUMERIC(12, 2) GENERATED ALWAYS AS (amount - platform_fee) STORED,
  surge_multiplier    NUMERIC(4, 2) NOT NULL DEFAULT 1.0 CHECK (surge_multiplier >= 1.0),
  scheduled_at        TIMESTAMPTZ,
  request_expires_at  TIMESTAMPTZ,
  photos              TEXT[],
  before_photo_url    TEXT,
  after_photo_url     TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_handyman_required_after_pending
    CHECK (status = 'PENDING' OR handyman_id IS NOT NULL),
  CONSTRAINT bookings_scheduled_at_for_scheduled
    CHECK ((booking_type = 'SCHEDULED' AND scheduled_at IS NOT NULL) OR (booking_type = 'ON_DEMAND'))
);
CREATE INDEX idx_bookings_client ON bookings (client_id, created_at DESC);
CREATE INDEX idx_bookings_handyman ON bookings (handyman_id, created_at DESC) WHERE handyman_id IS NOT NULL;
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_location ON bookings USING GIST (location);
CREATE INDEX idx_bookings_pending ON bookings (status, service_id) WHERE status = 'PENDING';

-- Payments (escrow)
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE RESTRICT,
  client_id           UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status              payment_status NOT NULL DEFAULT 'AUTHORIZED',
  amount_authorized   NUMERIC(12, 2) NOT NULL CHECK (amount_authorized >= 0),
  amount_captured     NUMERIC(12, 2) CHECK (amount_captured IS NULL OR amount_captured >= 0),
  currency            CHAR(3) NOT NULL DEFAULT 'PHP',
  payment_method      TEXT,
  provider            TEXT NOT NULL DEFAULT 'paymongo',
  provider_payment_id TEXT,
  provider_auth_id    TEXT,
  authorized_at       TIMESTAMPTZ,
  captured_at         TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  failure_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_client ON payments (client_id);
CREATE INDEX idx_payments_status ON payments (status);

-- Reviews (two-way)
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
  reviewer_id   UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reviewee_id   UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  photos        TEXT[],
  is_hidden     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_one_per_direction UNIQUE (booking_id, reviewer_id),
  CONSTRAINT reviews_different_parties CHECK (reviewer_id <> reviewee_id)
);
CREATE INDEX idx_reviews_reviewee ON reviews (reviewee_id, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_reviews_booking ON reviews (booking_id);

-- Wallet transactions (handyman ledger)
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handyman_id     UUID NOT NULL REFERENCES handymen (id) ON DELETE RESTRICT,
  booking_id      UUID REFERENCES bookings (id) ON DELETE SET NULL,
  payment_id      UUID REFERENCES payments (id) ON DELETE SET NULL,
  tx_type         wallet_tx_type NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  balance_after   NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_handyman ON wallet_transactions (handyman_id, created_at DESC);
CREATE INDEX idx_wallet_tx_booking ON wallet_transactions (booking_id) WHERE booking_id IS NOT NULL;

-- Disputes
CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
  reporter_id     UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  issue_type      TEXT NOT NULL,
  description     TEXT NOT NULL,
  evidence_urls   TEXT[],
  status          dispute_status NOT NULL DEFAULT 'OPEN',
  resolution      TEXT,
  resolved_by     UUID REFERENCES users (id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disputes_booking ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status);
CREATE INDEX idx_disputes_reporter ON disputes (reporter_id);

-- Booking events (immutable audit log)
CREATE TABLE booking_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings (id) ON DELETE RESTRICT,
  actor_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  from_status   booking_status,
  to_status     booking_status NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_events_booking ON booking_events (booking_id, created_at ASC);

-- Trigger helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_handymen_updated_at
  BEFORE UPDATE ON handymen FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone || '@phone.oki.app'),
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'client')
  );

  IF NEW.raw_user_meta_data->>'user_type' = 'handyman' THEN
    INSERT INTO public.handymen (id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Admin helper for RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. RLS policies (from 001_core_rls.sql)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE handymen ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE handyman_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Users RLS
CREATE POLICY users_select_own ON users FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY users_select_public ON users FOR SELECT TO authenticated USING (user_status = 'ACTIVE');
CREATE POLICY users_update_own ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND user_type = (SELECT user_type FROM users WHERE id = auth.uid()));
CREATE POLICY users_admin_all ON users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Handymen RLS
CREATE POLICY handymen_select_searchable ON handymen FOR SELECT TO authenticated USING (is_admin() OR id = auth.uid() OR (is_online = true AND kyc_status = 'APPROVED'));
CREATE POLICY handymen_insert_own ON handymen FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman'));
CREATE POLICY handymen_update_own ON handymen FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND kyc_status = (SELECT kyc_status FROM handymen WHERE id = auth.uid()));
CREATE POLICY handymen_admin_update ON handymen FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Services RLS
CREATE POLICY services_select_all ON services FOR SELECT TO authenticated USING (is_active = true OR is_admin());
CREATE POLICY services_admin_write ON services FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Handyman services RLS
CREATE POLICY handyman_services_select ON handyman_services FOR SELECT TO authenticated USING (true);
CREATE POLICY handyman_services_write_own ON handyman_services FOR INSERT TO authenticated WITH CHECK (handyman_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'handyman'));
CREATE POLICY handyman_services_update_own ON handyman_services FOR UPDATE TO authenticated USING (handyman_id = auth.uid()) WITH CHECK (handyman_id = auth.uid());
CREATE POLICY handyman_services_delete_own ON handyman_services FOR DELETE TO authenticated USING (handyman_id = auth.uid());
CREATE POLICY handyman_services_admin ON handyman_services FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Bookings RLS
CREATE POLICY bookings_select_participant ON bookings FOR SELECT TO authenticated USING (is_admin() OR client_id = auth.uid() OR handyman_id = auth.uid());
CREATE POLICY bookings_insert_client ON bookings FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'client') AND status = 'PENDING');
CREATE POLICY bookings_update_client ON bookings FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid() AND (status IN ('PENDING', 'CANCELLED') OR (SELECT status FROM bookings WHERE id = bookings.id) = status));
CREATE POLICY bookings_update_handyman ON bookings FOR UPDATE TO authenticated USING (handyman_id = auth.uid()) WITH CHECK (handyman_id = auth.uid());
CREATE POLICY bookings_admin ON bookings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Payments RLS
CREATE POLICY payments_select_client ON payments FOR SELECT TO authenticated USING (client_id = auth.uid() OR is_admin());
CREATE POLICY payments_select_handyman ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND b.handyman_id = auth.uid()));

-- Reviews RLS
CREATE POLICY reviews_select_visible ON reviews FOR SELECT TO authenticated USING (is_hidden = false OR reviewer_id = auth.uid() OR reviewee_id = auth.uid() OR is_admin());
CREATE POLICY reviews_insert_participant ON reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid() AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.status IN ('COMPLETED', 'PAID') AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())));
CREATE POLICY reviews_admin_moderate ON reviews FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Wallet transactions RLS
CREATE POLICY wallet_tx_select_own ON wallet_transactions FOR SELECT TO authenticated USING (handyman_id = auth.uid() OR is_admin());

-- Disputes RLS
CREATE POLICY disputes_select_participant ON disputes FOR SELECT TO authenticated USING (is_admin() OR reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = disputes.booking_id AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())));
CREATE POLICY disputes_insert_participant ON disputes FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())));
CREATE POLICY disputes_update_reporter ON disputes FOR UPDATE TO authenticated USING (reporter_id = auth.uid() AND status = 'OPEN') WITH CHECK (reporter_id = auth.uid() AND status = 'OPEN');
CREATE POLICY disputes_admin_resolve ON disputes FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Booking events RLS
CREATE POLICY booking_events_select_participant ON booking_events FOR SELECT TO authenticated USING (is_admin() OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_events.booking_id AND (b.client_id = auth.uid() OR b.handyman_id = auth.uid())));

-- 4. Seed services catalog
INSERT INTO services (slug, name, category, description, base_rate, estimated_duration) VALUES
  ('plumbing-general',       'General Plumbing',          'Plumbing',         'Fix leaks, install fixtures, unclog drains',               500.00,  interval '1 hour'),
  ('plumbing-water-heater',  'Water Heater Repair',       'Plumbing',         'Repair or replace water heaters',                         1200.00,  interval '2 hours'),
  ('electrical-wiring',      'Wiring & Installation',     'Electrical',       'Install new wiring, outlets, switches',                    800.00,  interval '2 hours 30 minutes'),
  ('electrical-lighting',    'Lighting Installation',     'Electrical',       'Install ceiling fans, chandeliers, sconces',               600.00,  interval '1 hour 30 minutes'),
  ('carpentry-furniture',    'Furniture Assembly',        'Carpentry',        'Assemble flat-pack furniture',                             400.00,  interval '1 hour'),
  ('carpentry-custom',       'Custom Carpentry',          'Carpentry',        'Build shelves, cabinets, custom woodwork',                1500.00,  interval '3 hours'),
  ('cleaning-general',       'General Cleaning',          'Cleaning',         'Deep cleaning of rooms, kitchens, bathrooms',              350.00,  interval '2 hours'),
  ('painting-interior',      'Interior Painting',         'Painting',         'Paint interior walls, ceilings, trim',                    2000.00,  interval '4 hours'),
  ('hvac-general',           'AC Repair & Maintenance',   'HVAC',             'Repair, clean, and service air conditioning units',       1000.00,  interval '1 hour 30 minutes'),
  ('general-handyman',       'General Handyman',          'General Handyman', 'Odd jobs, minor fixes, and general maintenance',           300.00,  interval '1 hour')
ON CONFLICT (slug) DO NOTHING;

-- 5. Booking schedule validation triggers

CREATE OR REPLACE FUNCTION validate_scheduled_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.scheduled_at < NOW() + INTERVAL '2 hours' THEN
    RAISE EXCEPTION 'Bookings must be scheduled at least 2 hours in advance'
      USING ERRCODE = '42201';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_schedule_future
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.scheduled_at IS NOT NULL)
  EXECUTE FUNCTION validate_scheduled_booking_insert();

CREATE OR REPLACE FUNCTION validate_booking_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_overlapping INT;
  v_duration INTERVAL;
BEGIN
  IF NEW.handyman_id IS NOT NULL AND (OLD.handyman_id IS DISTINCT FROM NEW.handyman_id) THEN
    SELECT estimated_duration INTO STRICT v_duration
    FROM services
    WHERE id = NEW.service_id;

    SELECT COUNT(*) INTO v_overlapping
    FROM bookings
    WHERE handyman_id = NEW.handyman_id
      AND id != NEW.id
      AND status NOT IN ('CANCELLED', 'COMPLETED', 'PAID')
      AND scheduled_at IS NOT NULL
      AND tsrange(scheduled_at, scheduled_at + v_duration) &&
          tsrange(NEW.scheduled_at, NEW.scheduled_at + v_duration);

    IF v_overlapping > 0 THEN
      RAISE EXCEPTION 'Handyman is already booked during this time'
        USING ERRCODE = '42202';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_no_double_booking
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.handyman_id IS NOT NULL AND NEW.scheduled_at IS NOT NULL)
  EXECUTE FUNCTION validate_booking_accept();

-- ============================================================================
-- ✅ DONE! Your database is now fully set up with:
--    • All core tables (users, handymen, services, bookings, payments, etc.)
--    • PostGIS spatial columns for location-based queries
--    • Row Level Security (RLS) on every table
--    • Auto-profile creation on user signup
--    • Seed service catalog
--    • Booking schedule validation triggers
-- ============================================================================
