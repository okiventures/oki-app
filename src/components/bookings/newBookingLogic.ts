/**
 * Pure decision logic for the new-booking wizard (app/new-booking.tsx).
 *
 * Extracted so the step gating and the create-booking input mapping can be
 * unit-tested without rendering the full React Native screen. The screen keeps
 * ownership of state, navigation, and the async service lookup; everything here
 * is deterministic.
 */
import { BookingType, ServiceCategory } from '../../types';

export const CATEGORY_TO_SERVICE: Record<string, ServiceCategory> = {
  massage: ServiceCategory.General,
  cleaning: ServiceCategory.Cleaning,
  painting: ServiceCategory.Painting,
  general: ServiceCategory.General,
};

export const SUB_SERVICE_TO_SLUG: Record<string, string> = {
  // Cleaning
  'cleaning-general': 'cleaning-general',
  'cleaning-deep': 'cleaning-general',
  'cleaning-aircon': 'cleaning-general',
  'cleaning-laundry': 'cleaning-general',
  // Painting
  'painting-interior': 'painting-interior',
  'painting-exterior': 'painting-interior',
  'painting-touch': 'painting-interior',
  // Massage → no DB match, use general
  'massage-swedish': 'general-handyman',
  'massage-deep': 'general-handyman',
  'massage-shiatsu': 'general-handyman',
  'massage-foot': 'general-handyman',
  // General
  'general-furniture': 'general-handyman',
  'general-mounting': 'general-handyman',
  'general-repair': 'general-handyman',
  'general-other': 'general-handyman',
};

export const DEFAULT_SLUG = 'general-handyman';
export const DEFAULT_LAT = 10.3157;
export const DEFAULT_LNG = 123.8854;

export type BookingMode = 'now' | 'later';

export interface WizardState {
  stepIndex: number;
  categoryId: string | null;
  subServiceId: string | null;
  address: string;
  description: string;
  bookingMode: BookingMode;
  isSelectedSlotBlocked: boolean;
}

/**
 * Whether the wizard's primary CTA may advance from the current step.
 * Step 0: a category and sub-service are chosen.
 * Step 1: address and description are non-empty.
 * Step 2 (later mode): the chosen slot is not blocked.
 * Step 3 (review) and step 2 in "now" mode always advance.
 */
export function canAdvance(s: WizardState): boolean {
  if (s.stepIndex === 0) return s.categoryId !== null && !!s.subServiceId;
  if (s.stepIndex === 1) return s.address.trim().length > 0 && s.description.trim().length > 0;
  if (s.stepIndex === 2 && s.bookingMode === 'later') return !s.isSelectedSlotBlocked;
  return true;
}

export function resolveServiceCategory(categoryId: string | null): ServiceCategory {
  return (categoryId ? CATEGORY_TO_SERVICE[categoryId] : undefined) ?? ServiceCategory.General;
}

export function resolveServiceSlug(subServiceId: string | null): string {
  return (subServiceId ? SUB_SERVICE_TO_SLUG[subServiceId] : undefined) ?? DEFAULT_SLUG;
}

export function bookingTypeFor(mode: BookingMode): BookingType {
  return mode === 'now' ? BookingType.OnDemand : BookingType.Scheduled;
}

/**
 * The scheduled timestamp the wizard sends. Undefined for "now" bookings so the
 * backend treats them as on-demand.
 */
export function buildScheduledAt(
  mode: BookingMode,
  selectedDate: string,
  selectedHour: number,
  selectedMinute: number
): string | undefined {
  if (mode !== 'later') return undefined;
  const hh = String(selectedHour).padStart(2, '0');
  const mm = String(selectedMinute).padStart(2, '0');
  return `${selectedDate}T${hh}:${mm}:00`;
}
