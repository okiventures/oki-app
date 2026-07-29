-- ============================================================================
-- Local development seed.
--
-- Applied automatically by `supabase db reset` (see [db.seed] in config.toml),
-- as the postgres superuser — so RLS is bypassed and the booking FSM trigger
-- can be switched off to plant bookings in mid-lifecycle states.
--
-- Accounts (all password: password123)
--   princess@example.com  client    Princess Jaena
--   mara@example.com      client    Mara Sy
--   kyle@example.com      handyman  Kyle Lee            online,  KYC APPROVED
--   cef@example.com       handyman  Ceferino Jumao-as V online,  KYC APPROVED
--   rico@example.com      handyman  Rico Dalisay        offline, KYC PENDING
--   admin@oki.app         admin     Admin User
--
-- Everything is anchored on Cebu City (10.3157, 123.8854) to match the app's
-- default booking coordinates, so proximity dispatch actually matches.
-- ============================================================================

-- The FSM trigger pins every INSERT to PENDING and validates status changes.
-- Seeding needs to place bookings directly into ACCEPTED/WORK_STARTED/PAID,
-- so bypass it for this session (only honoured for postgres/service_role).
SET app.bypass_booking_fsm_trigger = 'true';

-- ---------------------------------------------------------------------------
-- Services catalog
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Auth users
--
-- public.users references auth.users(id), so auth comes first. The
-- handle_new_user() trigger creates the initial public.users row (collapsing
-- any self-asserted 'admin' to 'client'); the upsert further down sets the
-- real user_type, which is exactly how admins are meant to be provisioned —
-- out of band, not via signup metadata.
--
-- The empty-string token columns are deliberate: GoTrue scans them into Go
-- strings and errors on NULL for users it did not create itself.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, phone_change_token, reauthentication_token,
  email_change, phone_change, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'princess@example.com',
   crypt('password123', gen_salt('bf')), now(), '+639123456789', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Princess Jaena", "user_type": "client"}',
   '', '', '', '', '', '', '', '', now(), now()),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'kyle@example.com',
   crypt('password123', gen_salt('bf')), now(), '+639159876543', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Kyle Lee", "user_type": "handyman"}',
   '', '', '', '', '', '', '', '', now(), now()),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'mara@example.com',
   crypt('password123', gen_salt('bf')), now(), '+639231234567', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Mara Sy", "user_type": "client"}',
   '', '', '', '', '', '', '', '', now(), now()),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated', 'cef@example.com',
   crypt('password123', gen_salt('bf')), now(), '+639172223344', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Ceferino Jumao-as V", "user_type": "handyman"}',
   '', '', '', '', '', '', '', '', now(), now()),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005',
   'authenticated', 'authenticated', 'admin@oki.app',
   crypt('password123', gen_salt('bf')), now(), '+639559988776', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Admin User", "user_type": "admin"}',
   '', '', '', '', '', '', '', '', now(), now()),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000006',
   'authenticated', 'authenticated', 'rico@example.com',
   crypt('password123', gen_salt('bf')), now(), '+639064445566', now(),
   '{"provider": "email", "providers": ["email"]}',
   '{"full_name": "Rico Dalisay", "user_type": "handyman"}',
   '', '', '', '', '', '', '', '', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Auth identities
--
-- Password sign-in resolves the user through auth.identities, not auth.users.
-- Without a matching identity row, signInWithPassword returns "Invalid login
-- credentials" for a user whose password is perfectly correct.
--
-- The identities schema changed across GoTrue versions (older: text `id` as PK
-- with provider; newer: uuid `id` plus a separate `provider_id`), so branch on
-- what the local instance actually has.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_has_provider_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) INTO v_has_provider_id;

  IF v_has_provider_id THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    SELECT
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', true
      ),
      'email', now(), now(), now()
    FROM auth.users u
    WHERE u.id BETWEEN 'a0000000-0000-0000-0000-000000000001'
                   AND 'a0000000-0000-0000-0000-000000000006'
    ON CONFLICT (provider, provider_id) DO NOTHING;
  ELSE
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    SELECT
      u.id::text, u.id,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', true
      ),
      'email', now(), now(), now()
    FROM auth.users u
    WHERE u.id BETWEEN 'a0000000-0000-0000-0000-000000000001'
                   AND 'a0000000-0000-0000-0000-000000000006'
    ON CONFLICT (provider, id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Application profiles
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, user_type, user_status, full_name, email, phone, photo_url, last_active_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'client',   'ACTIVE', 'Princess Jaena',      'princess@example.com', '+639123456789', 'https://api.dicebear.com/7.x/shapes/png?seed=Princess', now()),
  ('a0000000-0000-0000-0000-000000000002', 'handyman', 'ACTIVE', 'Kyle Lee',            'kyle@example.com',     '+639159876543', 'https://api.dicebear.com/7.x/shapes/png?seed=Kyle',     now()),
  ('a0000000-0000-0000-0000-000000000003', 'client',   'ACTIVE', 'Mara Sy',             'mara@example.com',     '+639231234567', 'https://api.dicebear.com/7.x/shapes/png?seed=Mara',     now()),
  ('a0000000-0000-0000-0000-000000000004', 'handyman', 'ACTIVE', 'Ceferino Jumao-as V', 'cef@example.com',      '+639172223344', 'https://api.dicebear.com/7.x/shapes/png?seed=Ceferino', now()),
  ('a0000000-0000-0000-0000-000000000005', 'admin',    'ACTIVE', 'Admin User',          'admin@oki.app',        '+639559988776', NULL,                                                   now()),
  ('a0000000-0000-0000-0000-000000000006', 'handyman', 'ACTIVE', 'Rico Dalisay',        'rico@example.com',     '+639064445566', 'https://api.dicebear.com/7.x/shapes/png?seed=Rico',     now())
ON CONFLICT (id) DO UPDATE SET
  user_type      = EXCLUDED.user_type,
  user_status    = EXCLUDED.user_status,
  full_name      = EXCLUDED.full_name,
  email          = EXCLUDED.email,
  phone          = EXCLUDED.phone,
  photo_url      = EXCLUDED.photo_url,
  last_active_at = EXCLUDED.last_active_at,
  updated_at     = now();

-- ---------------------------------------------------------------------------
-- Handyman profiles
--
-- Rico is deliberately offline with PENDING KYC: he is the negative case for
-- the accept guards (transition_booking_state rejects both).
-- ---------------------------------------------------------------------------
INSERT INTO public.handymen (
  id, bio, hourly_rate, years_experience, location, is_online, kyc_status,
  membership_tier, trust_score, review_count, jobs_completed, wallet_balance
)
VALUES
  ('a0000000-0000-0000-0000-000000000002',
   'Licensed electrician with 8 years of experience. Fast, reliable, and clean work.',
   350.00, 8,
   ST_SetSRID(ST_MakePoint(123.8948, 10.3181), 4326)::GEOGRAPHY(POINT, 4326),
   true, 'APPROVED', 'GOLD', 4.8, 45, 120, 8500.00),

  ('a0000000-0000-0000-0000-000000000004',
   'Expert plumber and general handyman. 5+ years of experience in residential repairs.',
   400.00, 5,
   ST_SetSRID(ST_MakePoint(123.8900, 10.3050), 4326)::GEOGRAPHY(POINT, 4326),
   true, 'APPROVED', 'SILVER', 4.5, 28, 85, 3200.00),

  ('a0000000-0000-0000-0000-000000000006',
   'Carpenter and painter, newly joined. Documents under review.',
   280.00, 2,
   ST_SetSRID(ST_MakePoint(123.9050, 10.3300), 4326)::GEOGRAPHY(POINT, 4326),
   false, 'PENDING', 'BRONZE', NULL, 0, 0, 0.00)
ON CONFLICT (id) DO UPDATE SET
  bio              = EXCLUDED.bio,
  hourly_rate      = EXCLUDED.hourly_rate,
  years_experience = EXCLUDED.years_experience,
  location         = EXCLUDED.location,
  is_online        = EXCLUDED.is_online,
  kyc_status       = EXCLUDED.kyc_status,
  membership_tier  = EXCLUDED.membership_tier,
  trust_score      = EXCLUDED.trust_score,
  review_count     = EXCLUDED.review_count,
  jobs_completed   = EXCLUDED.jobs_completed,
  wallet_balance   = EXCLUDED.wallet_balance,
  updated_at       = now();

-- ---------------------------------------------------------------------------
-- Live dispatch locations
--
-- Migration 013 moved proximity search off handymen.location onto
-- handyman_locations (search_nearest_handymen inner-joins it). Seeding only the
-- old column left every seeded handyman invisible to dispatch.
-- ---------------------------------------------------------------------------
INSERT INTO public.handyman_locations (id, location, updated_at)
SELECT h.id, h.location, now()
FROM public.handymen h
WHERE h.location IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  location   = EXCLUDED.location,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Offered services
--
-- Kyle covers Electrical, Cef covers Plumbing + General Handyman. The split
-- matters: list_available_bookings() filters the request inbox by category, so
-- a plumbing request reaches Cef and not Kyle.
-- ---------------------------------------------------------------------------
INSERT INTO public.handyman_services (handyman_id, service_id, price_override)
VALUES
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-wiring'),   750.00),
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-lighting'), 550.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'plumbing-general'),    450.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'general-handyman'),    280.00),
  ('a0000000-0000-0000-0000-000000000006', (SELECT id FROM services WHERE slug = 'carpentry-furniture'), 320.00),
  ('a0000000-0000-0000-0000-000000000006', (SELECT id FROM services WHERE slug = 'painting-interior'),  1800.00)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bookings — one per interesting FSM state
--
-- b…01  PENDING       unassigned plumbing  → shows in Cef's request inbox
-- b…02  PENDING       unassigned lighting  → shows in Kyle's request inbox
-- b…03  ACCEPTED      Princess + Kyle      → handyman can START_TRANSIT
-- b…04  ARRIVED       Mara + Cef           → START_WORK blocked (no before photo)
-- b…05  WORK_STARTED  Princess + Kyle      → COMPLETE blocked (no after photo)
-- b…06  COMPLETED     Mara + Kyle          → awaiting payment capture
-- b…07  PAID          Princess + Cef       → closed, reviewed, in earnings
-- b…08  CANCELLED     Mara                 → terminal, never assigned
-- b…09  ACCEPTED      Princess + Cef       → SCHEDULED, 3 days out
--
-- Historical bookings are ON_DEMAND with scheduled_at NULL on purpose: the
-- enforce_schedule_future trigger rejects any INSERT with a scheduled_at less
-- than 2 hours away, so a back-dated SCHEDULED booking cannot be seeded.
-- ---------------------------------------------------------------------------
INSERT INTO public.bookings (
  id, client_id, handyman_id, service_id, booking_type, status, description,
  address_text, location, amount, platform_fee, scheduled_at, request_expires_at,
  before_photo_url, after_photo_url, created_at, updated_at
) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', NULL,
   (SELECT id FROM services WHERE slug = 'plumbing-general'),
   'ON_DEMAND', 'PENDING',
   'Kitchen sink is draining very slowly and smells bad.',
   '12 Mango Ave, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::GEOGRAPHY(POINT, 4326),
   500.00, 50.00, NULL, now() + interval '30 minutes',
   NULL, NULL, now() - interval '4 minutes', now() - interval '4 minutes'),

  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003', NULL,
   (SELECT id FROM services WHERE slug = 'electrical-lighting'),
   'ON_DEMAND', 'PENDING',
   'Need two ceiling fans mounted in the bedrooms.',
   '88 Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8940, 10.3320), 4326)::GEOGRAPHY(POINT, 4326),
   600.00, 60.00, NULL, now() + interval '25 minutes',
   NULL, NULL, now() - interval '9 minutes', now() - interval '9 minutes'),

  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM services WHERE slug = 'electrical-wiring'),
   'ON_DEMAND', 'ACCEPTED',
   'Add two new outlets in the home office.',
   '12 Mango Ave, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::GEOGRAPHY(POINT, 4326),
   800.00, 80.00, NULL, NULL,
   NULL, NULL, now() - interval '40 minutes', now() - interval '30 minutes'),

  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM services WHERE slug = 'general-handyman'),
   'ON_DEMAND', 'ARRIVED',
   'Door hinge is loose and the handle keeps sticking.',
   '88 Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8940, 10.3320), 4326)::GEOGRAPHY(POINT, 4326),
   300.00, 30.00, NULL, NULL,
   NULL, NULL, now() - interval '2 hours', now() - interval '15 minutes'),

  ('b0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM services WHERE slug = 'electrical-lighting'),
   'ON_DEMAND', 'WORK_STARTED',
   'Replace the dining room chandelier.',
   '12 Mango Ave, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::GEOGRAPHY(POINT, 4326),
   600.00, 60.00, NULL, NULL,
   '/storage/v1/object/public/job-photos/seed-before.png', NULL,
   now() - interval '3 hours', now() - interval '35 minutes'),

  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM services WHERE slug = 'electrical-lighting'),
   'ON_DEMAND', 'COMPLETED',
   'Install LED strip lighting under the kitchen cabinets.',
   '88 Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8940, 10.3320), 4326)::GEOGRAPHY(POINT, 4326),
   600.00, 60.00, NULL, NULL,
   '/storage/v1/object/public/job-photos/seed-before.png',
   '/storage/v1/object/public/job-photos/seed-after.png',
   now() - interval '1 day', now() - interval '22 hours'),

  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM services WHERE slug = 'plumbing-general'),
   'ON_DEMAND', 'PAID',
   'Fixed a leaking pipe under the bathroom sink.',
   '12 Mango Ave, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::GEOGRAPHY(POINT, 4326),
   500.00, 50.00, NULL, NULL,
   '/storage/v1/object/public/job-photos/seed-before.png',
   '/storage/v1/object/public/job-photos/seed-after.png',
   now() - interval '5 days', now() - interval '5 days' + interval '3 hours'),

  ('b0000000-0000-0000-0000-000000000008',
   'a0000000-0000-0000-0000-000000000003', NULL,
   (SELECT id FROM services WHERE slug = 'cleaning-general'),
   'ON_DEMAND', 'CANCELLED',
   'Deep clean before moving out — changed my mind.',
   '88 Salinas Drive, Lahug, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8940, 10.3320), 4326)::GEOGRAPHY(POINT, 4326),
   350.00, 35.00, NULL, NULL,
   NULL, NULL, now() - interval '2 days', now() - interval '2 days' + interval '6 minutes'),

  ('b0000000-0000-0000-0000-000000000009',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM services WHERE slug = 'plumbing-general'),
   'SCHEDULED', 'ACCEPTED',
   'Annual check of all bathroom fixtures.',
   '12 Mango Ave, Cebu City',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::GEOGRAPHY(POINT, 4326),
   500.00, 50.00, now() + interval '3 days', NULL,
   NULL, NULL, now() - interval '6 hours', now() - interval '6 hours')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Booking events (audit trail / timeline UI)
-- ---------------------------------------------------------------------------
INSERT INTO public.booking_events (booking_id, actor_id, from_status, to_status, metadata, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, 'PENDING', '{"action": "CREATE"}', now() - interval '4 minutes'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', NULL, 'PENDING', '{"action": "CREATE"}', now() - interval '9 minutes'),

  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', NULL, 'PENDING',  '{"action": "CREATE"}', now() - interval '40 minutes'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'PENDING', 'ACCEPTED', '{"action": "ACCEPT"}', now() - interval '30 minutes'),

  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', NULL, 'PENDING',    '{"action": "CREATE"}',        now() - interval '2 hours'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'PENDING', 'ACCEPTED',   '{"action": "ACCEPT"}',        now() - interval '105 minutes'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'ACCEPTED', 'IN_TRANSIT', '{"action": "START_TRANSIT"}', now() - interval '45 minutes'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'IN_TRANSIT', 'ARRIVED',  '{"action": "MARK_ARRIVED"}',  now() - interval '15 minutes'),

  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', NULL, 'PENDING',    '{"action": "CREATE"}',        now() - interval '3 hours'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'PENDING', 'ACCEPTED',   '{"action": "ACCEPT"}',        now() - interval '160 minutes'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'ACCEPTED', 'IN_TRANSIT', '{"action": "START_TRANSIT"}', now() - interval '80 minutes'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'IN_TRANSIT', 'ARRIVED',  '{"action": "MARK_ARRIVED"}',  now() - interval '50 minutes'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'ARRIVED', 'WORK_STARTED', '{"action": "START_WORK"}',  now() - interval '35 minutes'),

  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', NULL, 'PENDING',      '{"action": "CREATE"}',        now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'PENDING', 'ACCEPTED',     '{"action": "ACCEPT"}',        now() - interval '1 day' + interval '5 minutes'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'ACCEPTED', 'IN_TRANSIT',  '{"action": "START_TRANSIT"}', now() - interval '1 day' + interval '20 minutes'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'IN_TRANSIT', 'ARRIVED',   '{"action": "MARK_ARRIVED"}',  now() - interval '1 day' + interval '45 minutes'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'ARRIVED', 'WORK_STARTED', '{"action": "START_WORK"}',    now() - interval '1 day' + interval '50 minutes'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'WORK_STARTED', 'COMPLETED', '{"action": "COMPLETE"}',    now() - interval '22 hours'),

  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', NULL, 'PENDING',      '{"action": "CREATE"}',        now() - interval '5 days'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'PENDING', 'ACCEPTED',     '{"action": "ACCEPT"}',        now() - interval '5 days' + interval '4 minutes'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'ACCEPTED', 'IN_TRANSIT',  '{"action": "START_TRANSIT"}', now() - interval '5 days' + interval '15 minutes'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'IN_TRANSIT', 'ARRIVED',   '{"action": "MARK_ARRIVED"}',  now() - interval '5 days' + interval '40 minutes'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'ARRIVED', 'WORK_STARTED', '{"action": "START_WORK"}',    now() - interval '5 days' + interval '45 minutes'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'WORK_STARTED', 'COMPLETED', '{"action": "COMPLETE"}',    now() - interval '5 days' + interval '2 hours'),
  ('b0000000-0000-0000-0000-000000000007', NULL, 'COMPLETED', 'PAID', '{"action": "CAPTURE_PAYMENT"}', now() - interval '5 days' + interval '3 hours'),

  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', NULL, 'PENDING',   '{"action": "CREATE"}', now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'PENDING', 'CANCELLED', '{"action": "CANCEL"}', now() - interval '2 days' + interval '6 minutes'),

  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', NULL, 'PENDING', '{"action": "CREATE"}', now() - interval '6 hours'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 'PENDING', 'ACCEPTED', '{"action": "ACCEPT"}', now() - interval '6 hours' + interval '3 minutes')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Payments (escrow record per booking, created at booking time)
-- ---------------------------------------------------------------------------
INSERT INTO public.payments (
  booking_id, client_id, status, amount_authorized, amount_captured, currency,
  provider, provider_payment_id, authorized_at, captured_at, created_at
) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'AUTHORIZED', 800.00, NULL, 'PHP', 'paymongo', NULL, now() - interval '40 minutes', NULL, now() - interval '40 minutes'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'AUTHORIZED', 300.00, NULL, 'PHP', 'paymongo', NULL, now() - interval '2 hours',    NULL, now() - interval '2 hours'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'AUTHORIZED', 600.00, NULL, 'PHP', 'paymongo', NULL, now() - interval '3 hours',    NULL, now() - interval '3 hours'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'AUTHORIZED', 600.00, NULL, 'PHP', 'paymongo', NULL, now() - interval '1 day',      NULL, now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'CAPTURED',   500.00, 500.00, 'PHP', 'paymongo', 'pi_seed_0007',
     now() - interval '5 days', now() - interval '5 days' + interval '3 hours', now() - interval '5 days'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'AUTHORIZED', 500.00, NULL, 'PHP', 'paymongo', NULL, now() - interval '6 hours',    NULL, now() - interval '6 hours')
ON CONFLICT (booking_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Wallet ledger — mirrors the one captured payment.
-- balance_after must reconcile with handymen.wallet_balance (3200.00 for Cef).
-- ---------------------------------------------------------------------------
INSERT INTO public.wallet_transactions (
  handyman_id, booking_id, tx_type, amount, balance_after, description, created_at
) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000007',
   'CREDIT', 450.00, 3200.00, 'Payment for booking b0000000-0000-0000-0000-000000000007',
   now() - interval '5 days' + interval '3 hours')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Reviews (two-way, on the closed booking)
-- ---------------------------------------------------------------------------
INSERT INTO public.reviews (booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004',
   5, 'Showed up on time and fixed the leak in under an hour. Very tidy.',
   now() - interval '5 days' + interval '4 hours'),
  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   5, 'Clear instructions and easy to work with.',
   now() - interval '5 days' + interval '5 hours')
ON CONFLICT (booking_id, reviewer_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Disputes (one open case for the admin console)
-- ---------------------------------------------------------------------------
INSERT INTO public.disputes (booking_id, reporter_id, issue_type, description, status, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000003',
   'QUALITY',
   'One of the LED strips flickers and the handyman left before I could check it.',
   'OPEN',
   now() - interval '20 hours')
ON CONFLICT DO NOTHING;

RESET app.bypass_booking_fsm_trigger;
