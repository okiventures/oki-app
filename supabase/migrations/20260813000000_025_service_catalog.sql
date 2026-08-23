-- ---------------------------------------------------------------------------
-- 025 — one catalog row per bookable sub-service
--
-- The booking form advertised prices from a hardcoded constant while
-- create_booking derived the charge from services.base_rate, and
-- SUB_SERVICE_TO_SLUG collapsed fifteen sub-services onto three catalog rows.
-- The two numbers were unrelated: a 350 touch-up billed at 2000, laundry
-- quoted at 200 billed at 350. Harmless while no money moved; a billing
-- defect the moment Week 15 captures funds.
--
-- This makes the catalog authoritative. Every sub-service the client can pick
-- now has its own row, keyed by the slug the app already used as the
-- sub-service id, priced at what the app advertises today. Prices are not
-- changed here — they are moved to where the charge is derived from.
--
-- Idempotent: three of these slugs already exist from seed.sql with different
-- rates, so this upserts rather than inserting.
-- ---------------------------------------------------------------------------

INSERT INTO services (slug, name, category, description, base_rate, estimated_duration) VALUES
  -- Massage. No massage value in the service_category enum; these are filed as
  -- general work, which is what SUB_SERVICE_TO_SLUG did too.
  ('massage-swedish',    'Swedish Massage',     'General Handyman', 'Full-body relaxation massage',                 350.00, interval '1 hour'),
  ('massage-deep',       'Deep Tissue',         'General Handyman', 'Targets muscle knots and tension',             450.00, interval '1 hour 30 minutes'),
  ('massage-shiatsu',    'Shiatsu',             'General Handyman', 'Pressure-point based Japanese technique',      400.00, interval '1 hour'),
  ('massage-foot',       'Foot Reflexology',    'General Handyman', 'Focused relief for feet and legs',             250.00, interval '45 minutes'),

  -- Cleaning
  ('cleaning-general',   'General Cleaning',    'Cleaning',         'Sweeping, mopping, and tidying up',            300.00, interval '2 hours'),
  ('cleaning-deep',      'Deep Cleaning',       'Cleaning',         'Thorough top-to-bottom clean',                 600.00, interval '4 hours'),
  ('cleaning-aircon',    'Aircon Cleaning',     'Cleaning',         'Filter wash and unit cleaning',                400.00, interval '1 hour 30 minutes'),
  ('cleaning-laundry',   'Laundry & Ironing',   'Cleaning',         'Wash, dry and press clothes',                  200.00, interval '2 hours'),

  -- Painting
  ('painting-interior',  'Interior Painting',   'Painting',         'Walls, ceilings, and trim indoors',            800.00, interval '4 hours'),
  ('painting-exterior',  'Exterior Painting',   'Painting',         'Facade, gates, and outdoor surfaces',         1200.00, interval '6 hours'),
  ('painting-touch',     'Touch-Up & Repair',   'Painting',         'Minor scuffs, peeling, or patches',            350.00, interval '1 hour 30 minutes'),

  -- General handyman
  ('general-furniture',  'Furniture Assembly',  'General Handyman', 'Flat-pack and modular assembly',               300.00, interval '1 hour'),
  ('general-mounting',   'TV / Shelf Mounting', 'General Handyman', 'Wall-mount installation and wiring',           350.00, interval '1 hour'),
  ('general-repair',     'Minor Repairs',       'General Handyman', 'Doors, hinges, handles, and fixtures',         250.00, interval '1 hour'),
  ('general-other',      'Other',               'General Handyman', 'Describe your task and we''ll find the right person', 200.00, interval '1 hour')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  base_rate   = EXCLUDED.base_rate,
  estimated_duration = EXCLUDED.estimated_duration,
  is_active   = true,
  updated_at  = now();
