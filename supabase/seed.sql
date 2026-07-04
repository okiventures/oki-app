-- Seed services catalog (run in Supabase SQL Editor)
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
