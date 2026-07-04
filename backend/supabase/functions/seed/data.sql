-- Seed data for development and testing
-- Run: psql -f seed/data.sql

-- Service categories
INSERT INTO services (id, name, description, base_price) VALUES
  ('srv_plumbing', 'Plumbing', 'Pipe repairs, faucet installation, drain cleaning', 350.00),
  ('srv_electrical', 'Electrical', 'Wiring, outlet installation, light fixture repair', 400.00),
  ('srv_carpentry', 'Carpentry', 'Furniture assembly, cabinet installation, framing', 300.00),
  ('srv_cleaning', 'Cleaning', 'Home cleaning, deep cleaning, move-out cleaning', 250.00),
  ('srv_painting', 'Painting', 'Interior and exterior painting, touch-ups', 500.00),
  ('srv_hvac', 'HVAC', 'Aircon cleaning, repair, installation', 600.00),
  ('srv_roofing', 'Roofing', 'Roof repair, gutter cleaning, leak fix', 450.00),
  ('srv_landscaping', 'Landscaping', 'Lawn mowing, gardening, tree trimming', 350.00),
  ('srv_appliance', 'Appliance Repair', 'Washer, dryer, refrigerator, oven repair', 400.00),
  ('srv_general', 'General Handyman', 'Odd jobs, furniture assembly, mounting', 300.00)
ON CONFLICT (id) DO NOTHING;

-- Test client account (password: test123)
-- Auth user would be created via Supabase Auth UI or API
-- This assumes the auth user already exists
INSERT INTO users (id, user_type, full_name, phone, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'client', 'Maria Santos', '+639123456789', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000002', 'handyman', 'Juan Dela Cruz', '+639987654321', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000003', 'admin', 'Harold Vince', '+639555555555', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Test handyman profile
INSERT INTO handymen (id, location, is_online, kyc_status, hourly_rate, years_experience, membership_tier) VALUES
  ('00000000-0000-0000-0000-000000000002',
   ST_SetSRID(ST_MakePoint(120.9842, 14.5995), 4326),
   true, 'APPROVED', 350, 5, 'Gold')
ON CONFLICT (id) DO NOTHING;

-- Link handyman to services
INSERT INTO handyman_services (handyman_id, service_id) VALUES
  ('00000000-0000-0000-0000-000000000002', 'srv_plumbing'),
  ('00000000-0000-0000-0000-000000000002', 'srv_electrical'),
  ('00000000-0000-0000-0000-000000000002', 'srv_general')
ON CONFLICT DO NOTHING;
