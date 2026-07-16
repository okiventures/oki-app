-- Seed services catalog
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
-- Seed Auth Users
-- Since public.users references auth.users(id), we must seed auth.users first.
-- The handle_new_user() trigger will automatically insert initial rows in public.users.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'princess@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '+639123456789',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Princess Jaena", "user_type": "client"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'kyle@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '+639159876543',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Kyle Lee", "user_type": "handyman"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'mara@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '+639231234567',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Mara Sy", "user_type": "client"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'cef@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '+639172223344',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Ceferino Jumao-as V", "user_type": "handyman"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'admin@oki.app',
    crypt('password123', gen_salt('bf')),
    now(),
    '+639559988776',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin User", "user_type": "admin"}',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Update and Complete User Profile Seed Data
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, user_type, user_status, full_name, email, phone, last_active_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'client',   'ACTIVE',  'Princess Jaena',      'princess@example.com', '+639123456789', now()),
  ('a0000000-0000-0000-0000-000000000002', 'handyman', 'ACTIVE',  'Kyle Lee',            'kyle@example.com',     '+639159876543', now()),
  ('a0000000-0000-0000-0000-000000000003', 'client',   'ACTIVE',  'Mara Sy',             'mara@example.com',     '+639231234567', now()),
  ('a0000000-0000-0000-0000-000000000004', 'handyman', 'ACTIVE',  'Ceferino Jumao-as V', 'cef@example.com',      '+639172223344', now()),
  ('a0000000-0000-0000-0000-000000000005', 'admin',    'ACTIVE',  'Admin User',          'admin@oki.app',        '+639559988776', now())
ON CONFLICT (id) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  user_status = EXCLUDED.user_status,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  last_active_at = EXCLUDED.last_active_at,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Handymen Profiles
-- ---------------------------------------------------------------------------
INSERT INTO public.handymen (id, bio, hourly_rate, location, is_online, kyc_status, trust_score, review_count, jobs_completed, wallet_balance)
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
ON CONFLICT (id) DO UPDATE SET
  bio = EXCLUDED.bio,
  hourly_rate = EXCLUDED.hourly_rate,
  location = EXCLUDED.location,
  is_online = EXCLUDED.is_online,
  kyc_status = EXCLUDED.kyc_status,
  trust_score = EXCLUDED.trust_score,
  review_count = EXCLUDED.review_count,
  jobs_completed = EXCLUDED.jobs_completed,
  wallet_balance = EXCLUDED.wallet_balance,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Handyman Services Mappings
-- ---------------------------------------------------------------------------
INSERT INTO public.handyman_services (handyman_id, service_id, price_override)
VALUES
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-wiring'), 750.00),
  ('a0000000-0000-0000-0000-000000000002', (SELECT id FROM services WHERE slug = 'electrical-lighting'), 550.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'plumbing-general'), 450.00),
  ('a0000000-0000-0000-0000-000000000004', (SELECT id FROM services WHERE slug = 'general-handyman'), 280.00)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
INSERT INTO public.bookings (client_id, handyman_id, service_id, booking_type, status, description, address_text, location, amount, platform_fee)
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
