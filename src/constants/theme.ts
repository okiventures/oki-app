import { ColorScheme } from '../types';

export const COLOR_SCHEMES: Record<
  ColorScheme,
  {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    ui: {
      background: string;
      surface: string;
      border: string;
      text: string;
      textMuted: string;
      textLight: string;
    };
    label: string;
  }
> = {
  crimson: {
    label: 'Crimson & Amber',
    primary: {
      '50': '#fdf2f3',
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
      '50': '#fffbeb',
      '100': '#fef3c7',
      '200': '#fde68a',
      '300': '#fcd34d',
      '400': '#fbbf24',
      '500': '#f59e0b',
      '600': '#d97706',
      '700': '#b45309',
      '800': '#92400e',
      '900': '#78350f',
    },
    ui: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#1C1917',
      textMuted: '#6B7280',
      textLight: '#9CA3AF',
    },
  },
  teal: {
    label: 'Deep Teal & Coral',
    primary: {
      '50': '#f0fafa',
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
      '50': '#fdf3ee',
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
    ui: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#1C1917',
      textMuted: '#6B7280',
      textLight: '#9CA3AF',
    },
  },
  indigo: {
    label: 'Indigo & Amber',
    primary: {
      '50': '#f5f0fb',
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
      '50': '#fffbeb',
      '100': '#fef3c7',
      '200': '#fde68a',
      '300': '#fcd34d',
      '400': '#fbbf24',
      '500': '#f59e0b',
      '600': '#d97706',
      '700': '#b45309',
      '800': '#92400e',
      '900': '#78350f',
    },
    ui: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#1C1917',
      textMuted: '#6B7280',
      textLight: '#9CA3AF',
    },
  },
};

// ─── Semantic / status colors ───────────────────────────────────────────────
// These are intentionally fixed (not theme-dependent) so that statuses always
// carry universally recognised meaning regardless of brand colour.

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

export const MEMBERSHIP_TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
};

// ─── Service / category palette ──────────────────────────────────────────────
// Each category has a fixed semantic colour palette that persists across themes.
// Components should pull from here instead of hardcoding hex values.

export interface CategoryPalette {
  /** Icon / foreground colour */
  icon: string;
  /** Chip / card background */
  bg: string;
  /** Subtle border (optional use) */
  border: string;
}

export const SERVICE_CATEGORY_COLORS: Record<string, CategoryPalette> = {
  // Booking categories (new-booking flow)
  massage: { icon: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8' },
  cleaning: { icon: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  painting: { icon: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  general: { icon: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },

  // Dashboard quick-category tiles
  more: { icon: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },

  // Generic service categories (used in handyman / admin flows)
  Plumbing: { icon: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD' },
  Electrical: { icon: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  Carpentry: { icon: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  Cleaning: { icon: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  Painting: { icon: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  HVAC: { icon: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  Roofing: { icon: '#78716C', bg: '#F5F5F4', border: '#E7E5E4' },
  Landscaping: { icon: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0' },
  'Appliance Repair': { icon: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  'General Handyman': { icon: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
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

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENT = 10;
