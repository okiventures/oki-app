import { ColorScheme } from '../types';

export const COLOR_SCHEMES: Record<ColorScheme, {
  primary: Record<string, string>;
  secondary: Record<string, string>;
  label: string;
}> = {
  crimson: {
    label: 'Crimson & Amber',
    primary: {
      '50':  '#fdf2f3',
      '100': '#fce4e7',
      '200': '#f9c9cf',
      '300': '#f49faa',
      '400': '#ed6e7e',
      '500': '#A82839',
      '600': '#9a2234',
      '700': '#7d1b2a',
      '800': '#6B1A29',
      '900': '#5a1622',
    },
    secondary: {
      '50':  '#fdf9ed',
      '100': '#faf0cc',
      '200': '#f4de95',
      '300': '#edc757',
      '400': '#e8b430',
      '500': '#D4A642',
      '600': '#b8882a',
      '700': '#8B6914',
      '800': '#735410',
      '900': '#5f4512',
    },
  },
  teal: {
    label: 'Deep Teal & Coral',
    primary: {
      '50':  '#f0fafa',
      '100': '#d9f2f2',
      '200': '#b6e5e5',
      '300': '#82d0d0',
      '400': '#4ab4b4',
      '500': '#2D7A7A',
      '600': '#256868',
      '700': '#1e5555',
      '800': '#1A4D4D',
      '900': '#153f3f',
    },
    secondary: {
      '50':  '#fdf3ee',
      '100': '#fae4d5',
      '200': '#f5c5aa',
      '300': '#ee9d76',
      '400': '#e78e63',
      '500': '#E27C4C',
      '600': '#c9673a',
      '700': '#A85C3D',
      '800': '#8a4b32',
      '900': '#714029',
    },
  },
  indigo: {
    label: 'Indigo & Amber',
    primary: {
      '50':  '#f5f0fb',
      '100': '#ebe0f7',
      '200': '#d4beed',
      '300': '#b592df',
      '400': '#9463ce',
      '500': '#5D2E8C',
      '600': '#51267a',
      '700': '#421e64',
      '800': '#371952',
      '900': '#2C1650',
    },
    secondary: {
      '50':  '#fdf9ed',
      '100': '#faf0cc',
      '200': '#f4de95',
      '300': '#edc757',
      '400': '#e8b430',
      '500': '#D4A642',
      '600': '#b8882a',
      '700': '#8B6914',
      '800': '#735410',
      '900': '#5f4512',
    },
  },
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  Accepted: 'Accepted',
  InTransit: 'In Transit',
  Arrived: 'Arrived',
  WorkStarted: 'Work Started',
  Completed: 'Completed',
  Paid: 'Paid',
  Cancelled: 'Cancelled',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Accepted: '#3B82F6',
  InTransit: '#8B5CF6',
  Arrived: '#06B6D4',
  WorkStarted: '#F97316',
  Completed: '#10B981',
  Paid: '#059669',
  Cancelled: '#EF4444',
};

export const SERVICE_CATEGORY_ICONS: Record<string, string> = {
  Plumbing: 'water',
  Electrical: 'flash',
  Carpentry: 'construct',
  Cleaning: 'sparkles',
  Painting: 'color-palette',
  HVAC: 'thermometer',
  Roofing: 'home',
  Landscaping: 'leaf',
  'Appliance Repair': 'settings',
  'General Handyman': 'hammer',
};

export const PLATFORM_FEE_PERCENT = 10;

export const MEMBERSHIP_TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
};
