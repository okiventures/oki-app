import { SERVICE_CATEGORY_COLORS } from './theme';

export const CATEGORY_ORDER = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Cleaning',
  'Painting',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Appliance Repair',
  'General Handyman',
];

export const CATEGORY_COLORS: Record<string, string> = {
  Plumbing: SERVICE_CATEGORY_COLORS.Plumbing.icon,
  Electrical: SERVICE_CATEGORY_COLORS.Electrical.icon,
  Carpentry: SERVICE_CATEGORY_COLORS.Carpentry.icon,
  Cleaning: SERVICE_CATEGORY_COLORS.Cleaning.icon,
  Painting: SERVICE_CATEGORY_COLORS.Painting.icon,
  HVAC: SERVICE_CATEGORY_COLORS.HVAC.icon,
  Roofing: SERVICE_CATEGORY_COLORS.Roofing.icon,
  Landscaping: SERVICE_CATEGORY_COLORS.Landscaping.icon,
  'Appliance Repair': SERVICE_CATEGORY_COLORS['Appliance Repair'].icon,
  'General Handyman': SERVICE_CATEGORY_COLORS['General Handyman'].icon,
};

export const CATEGORY_ICONS: Record<string, string> = {
  Plumbing: '\u{1F527}',
  Electrical: '\u26A1',
  Carpentry: '\u{1FA9F}',
  Cleaning: '\u{1F9F9}',
  Painting: '\u{1F3A8}',
  HVAC: '\u2744\uFE0F',
  Roofing: '\u{1F3E2}',
  Landscaping: '\u{1F331}',
  'Appliance Repair': '\u{1F9F0}',
  'General Handyman': '\u{1F6E0}',
};

export const CATEGORY_BG: Record<string, string> = {
  Plumbing: SERVICE_CATEGORY_COLORS.Plumbing.bg,
  Electrical: SERVICE_CATEGORY_COLORS.Electrical.bg,
  Carpentry: SERVICE_CATEGORY_COLORS.Carpentry.bg,
  Cleaning: SERVICE_CATEGORY_COLORS.Cleaning.bg,
  Painting: SERVICE_CATEGORY_COLORS.Painting.bg,
  HVAC: SERVICE_CATEGORY_COLORS.HVAC.bg,
  Roofing: SERVICE_CATEGORY_COLORS.Roofing.bg,
  Landscaping: SERVICE_CATEGORY_COLORS.Landscaping.bg,
  'Appliance Repair': SERVICE_CATEGORY_COLORS['Appliance Repair'].bg,
  'General Handyman': SERVICE_CATEGORY_COLORS['General Handyman'].bg,
};
