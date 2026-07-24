/**
 * Customer booking flow — new-booking wizard decision logic.
 *
 * Tests the pure logic app/new-booking.tsx runs while the customer moves
 * through the wizard: the per-step advance gate and the mapping that becomes
 * the create-booking payload. Rendering the full screen needs a React Native
 * test environment (jest-expo preset); this covers the same branches without
 * one. See docs/testing/README-e2e.md.
 *
 * Covers plan IDs: CB-02 (step gates), CB-03 (now vs later / scheduledAt),
 * CB-05 (category + slug mapping).
 */
import { BookingType, ServiceCategory } from '../../src/types';
import {
  DEFAULT_SLUG,
  bookingTypeFor,
  buildScheduledAt,
  canAdvance,
  resolveServiceCategory,
  resolveServiceSlug,
  type WizardState,
} from '../../src/components/bookings/newBookingLogic';

function state(overrides: Partial<WizardState> = {}): WizardState {
  return {
    stepIndex: 0,
    categoryId: null,
    subServiceId: null,
    address: '',
    description: '',
    bookingMode: 'now',
    isSelectedSlotBlocked: false,
    ...overrides,
  };
}

describe('canAdvance — step gates (CB-02)', () => {
  it('step 0 blocks until a category AND sub-service are chosen', () => {
    expect(canAdvance(state({ stepIndex: 0 }))).toBe(false);
    expect(canAdvance(state({ stepIndex: 0, categoryId: 'cleaning' }))).toBe(false);
    expect(
      canAdvance(state({ stepIndex: 0, categoryId: 'cleaning', subServiceId: 'cleaning-deep' }))
    ).toBe(true);
  });

  it('step 1 blocks until address and description are both non-empty', () => {
    expect(canAdvance(state({ stepIndex: 1, address: '123 Mango Ave' }))).toBe(false);
    expect(canAdvance(state({ stepIndex: 1, description: 'clean the unit' }))).toBe(false);
    // whitespace-only does not count
    expect(canAdvance(state({ stepIndex: 1, address: '   ', description: '   ' }))).toBe(false);
    expect(
      canAdvance(state({ stepIndex: 1, address: '123 Mango Ave', description: 'clean the unit' }))
    ).toBe(true);
  });

  it('step 2 blocks a blocked slot only in "later" mode', () => {
    expect(
      canAdvance(state({ stepIndex: 2, bookingMode: 'later', isSelectedSlotBlocked: true }))
    ).toBe(false);
    expect(
      canAdvance(state({ stepIndex: 2, bookingMode: 'later', isSelectedSlotBlocked: false }))
    ).toBe(true);
    // "now" mode ignores slot blocking entirely
    expect(
      canAdvance(state({ stepIndex: 2, bookingMode: 'now', isSelectedSlotBlocked: true }))
    ).toBe(true);
  });

  it('step 3 (review) always advances', () => {
    expect(canAdvance(state({ stepIndex: 3 }))).toBe(true);
  });
});

describe('booking type + schedule (CB-03)', () => {
  it('maps "now" to on-demand with no scheduledAt', () => {
    expect(bookingTypeFor('now')).toBe(BookingType.OnDemand);
    expect(buildScheduledAt('now', '2026-08-01', 9, 30)).toBeUndefined();
  });

  it('maps "later" to scheduled with a zero-padded local timestamp', () => {
    expect(bookingTypeFor('later')).toBe(BookingType.Scheduled);
    expect(buildScheduledAt('later', '2026-08-01', 9, 5)).toBe('2026-08-01T09:05:00');
    expect(buildScheduledAt('later', '2026-08-01', 14, 0)).toBe('2026-08-01T14:00:00');
  });
});

describe('service mapping (CB-05)', () => {
  it('maps each category id to its service category, defaulting to General', () => {
    expect(resolveServiceCategory('cleaning')).toBe(ServiceCategory.Cleaning);
    expect(resolveServiceCategory('painting')).toBe(ServiceCategory.Painting);
    expect(resolveServiceCategory('massage')).toBe(ServiceCategory.General);
    expect(resolveServiceCategory('unknown')).toBe(ServiceCategory.General);
    expect(resolveServiceCategory(null)).toBe(ServiceCategory.General);
  });

  it('resolves sub-service ids to a DB slug, defaulting to general-handyman', () => {
    expect(resolveServiceSlug('cleaning-deep')).toBe('cleaning-general');
    expect(resolveServiceSlug('painting-exterior')).toBe('painting-interior');
    expect(resolveServiceSlug('massage-swedish')).toBe('general-handyman');
    expect(resolveServiceSlug('does-not-exist')).toBe(DEFAULT_SLUG);
    expect(resolveServiceSlug(null)).toBe(DEFAULT_SLUG);
  });
});
