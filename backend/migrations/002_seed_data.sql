-- 002_seed_data.sql
-- Oki Handyman Marketplace — Representative test data for all roles
-- Requires: 001_core_schema.sql and 001_core_rls.sql already applied

-- ---------------------------------------------------------------------------
-- Helper: create an auth user and return the user_id
-- Uses Supabase's auth.admin_create_user() or direct insert
-- NOTE: In production, users sign up via the app. This is only for dev/staging.
-- ---------------------------------------------------------------------------

-- Services catalog
INSERT INTO services (slug, name, category, description, base_rate) VALUES
  ('plumbing-general',    'General Plumbing',          'Plumbing',         'Fix leaks, install fixtures, unclog drains', 500.00),
  ('plumbing-water-heater', 'Water Heater Repair',     'Plumbing',         'Repair or replace water heaters', 1200.00),
  ('electrical-wiring',   'Wiring & Installation',     'Electrical',       'Install new wiring, outlets, switches', 800.00),
  ('electrical-lighting', 'Lighting Installation',     'Electrical',       'Install ceiling fans, chandeliers, sconces', 600.00),
  ('carpentry-furniture', 'Furniture Assembly',        'Carpentry',        'Assemble flat-pack furniture', 400.00),
  ('carpentry-custom',    'Custom Carpentry',          'Carpentry',        'Build shelves, cabinets, custom woodwork', 1500.00),
  ('cleaning-general',    'General Cleaning',          'Cleaning',         'Deep cleaning of rooms, kitchens, bathrooms', 350.00),
  ('painting-interior',   'Interior Painting',         'Painting',         'Paint interior walls, ceilings, trim', 2000.00),
  ('hvac-general',        'AC Repair & Maintenance',   'HVAC',             'Repair, clean, and service air conditioning units', 1000.00),
  ('general-handyman',    'General Handyman',          'General Handyman', 'Odd jobs, minor fixes, and general maintenance', 300.00)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Test users (for local Docker dev — uses hardcoded UUIDs)
-- In production/Supabase, users are created via auth.users + handle_new_user trigger.
-- For local Docker: insert directly since there's no Supabase Auth.
-- ---------------------------------------------------------------------------
INSERT INTO users (id, user_type, user_status, full_name, email, phone, last_active_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'client',   'ACTIVE',  'Princess Jaena',      'princess@example.com', '+639123456789', now()),
  ('a0000000-0000-0000-0000-000000000002', 'handyman', 'ACTIVE',  'Kyle Lee',            'kyle@example.com',     '+639159876543', now()),
  ('a0000000-0000-0000-0000-000000000003', 'client',   'ACTIVE',  'Mara Sy',             'mara@example.com',     '+639231234567', now()),
  ('a0000000-0000-0000-0000-000000000004', 'handyman', 'ACTIVE',  'Ceferino Jumao-as V', 'cef@example.com',      '+639172223344', now()),
  ('a0000000-0000-0000-0000-000000000005', 'admin',    'ACTIVE',  'Admin User',          'admin@oki.app',        '+639559988776', now())
ON CONFLICT (id) DO NOTHING;

-- Handyman profiles
INSERT INTO handymen (id, bio, hourly_rate, location, is_online, kyc_status, trust_score, review_count, jobs_completed, wallet_balance)
VALUES
  (
    'a0000000-0000-0000-0000-000000000002',
    'Licensed electrician with 8 years of experience. Fast, reliable, and clean work.',
    350.00,
    ST_SetSRID(ST_MakePoint(121.0438, 14.5556), 4326)::GEOGRAPHY(POINT, 4326),
    true, 'APPROVED', 4.8, 45, 120, 8500.00
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'Expert plumber and general handyman. 5+ years of experience in residential repairs.',
    400.00,
    ST_SetSRID(ST_MakePoint(121.0620, 14.5830), 4326)::GEOGRAPHY(POINT, 4326),
    true, 'APPROVED', 4.5, 28, 85, 3200.00
  )
ON CONFLICT (id) DO NOTHING;

-- Handyman-service mappings
INSERT INTO handyman_services (handyman_id, service_id, price_override)
VALUES
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-wiring'), 750.00),
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-lighting'), 550.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'plumbing-general'), 450.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'general-handyman'), 280.00)
ON CONFLICT DO NOTHING;

-- Sample completed booking for development
INSERT INTO bookings (client_id, handyman_id, service_id, booking_type, status, description, address_text, location, amount, platform_fee)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    (SELECT id FROM services WHERE slug = 'electrical-lighting'),
    'ON_DEMAND', 'COMPLETED',
    'Install 3 ceiling fans in the living room and bedrooms.',
    '123 Rizal St, Makati City',
    ST_SetSRID(ST_MakePoint(121.0450, 14.5560), 4326)::GEOGRAPHY(POINT, 4326),
    1650.00, 82.50
  )
ON CONFLICT DO NOTHING;
