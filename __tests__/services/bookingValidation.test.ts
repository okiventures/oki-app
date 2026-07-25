import {
  getBookingsOnDate,
  isSlotOverlapping,
  hasMinimumGap,
  validateBookingSlot,
  rankHandymen,
} from '../../src/services/searchService';
import { getAvailabilityForHandyman, resetAvailabilityStore } from '../../src/mocks/availability';
import { getFreshMockBookings } from '../../src/mocks/bookings';
import { Booking, ServiceCategory, BookingStatus } from '../../src/types';
import { HandymanSearchResult } from '../../src/hooks/useHandymanSearch';

beforeEach(() => {
  resetAvailabilityStore();
});

function makeDate(day: number, hour: number, min = 0): Date {
  const d = new Date(2026, 6, day);
  d.setHours(hour, min, 0, 0);
  return d;
}

describe('getBookingsOnDate', () => {
  it('returns only h1 bookings on a given date', () => {
    const all = getFreshMockBookings();
    const date = new Date();
    const onDate = getBookingsOnDate(all, 'h1', date);
    expect(onDate.length).toBeGreaterThan(0);
    onDate.forEach((b) => expect(b.handymanId).toBe('h1'));
  });

  it('returns empty for handyman with no bookings that day', () => {
    const all = getFreshMockBookings();
    const farDate = new Date(2026, 11, 25);
    expect(getBookingsOnDate(all, 'h1', farDate)).toEqual([]);
  });

  it('excludes cancelled bookings', () => {
    const booking: Booking = {
      id: 'test-cancelled',
      handymanId: 'h1',
      scheduledAt: makeDate(27, 14).toISOString(),
      status: BookingStatus.Cancelled,
    } as Booking;
    expect(getBookingsOnDate([booking], 'h1', makeDate(27, 0))).toEqual([]);
  });
});

describe('isSlotOverlapping', () => {
  it('detects partial overlap at start', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    const result = isSlotOverlapping(existing, makeDate(27, 9, 30), makeDate(27, 10, 30));
    expect(result.overlaps).toBe(true);
    expect(result.conflicting!.id).toBe('e1');
  });

  it('detects full containment', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 9).toISOString(), durationMinutes: 120 } as Booking,
    ];
    expect(isSlotOverlapping(existing, makeDate(27, 9, 30), makeDate(27, 10)).overlaps).toBe(true);
  });

  it('accepts adjacent slot without overlap', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    expect(isSlotOverlapping(existing, makeDate(27, 11), makeDate(27, 12)).overlaps).toBe(false);
  });

  it('accepts slot ending exactly at start of existing', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    expect(isSlotOverlapping(existing, makeDate(27, 9), makeDate(27, 10)).overlaps).toBe(false);
  });

  it('returns no overlap for empty existing', () => {
    expect(isSlotOverlapping([], makeDate(27, 9), makeDate(27, 10)).overlaps).toBe(false);
  });
});

describe('hasMinimumGap', () => {
  it('rejects slot too close before existing booking', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    const result = hasMinimumGap(existing, makeDate(27, 9, 15), makeDate(27, 9, 45));
    expect(result.hasGap).toBe(false);
  });

  it('rejects slot too close after existing booking', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 9).toISOString(), durationMinutes: 60 } as Booking,
    ];
    const result = hasMinimumGap(existing, makeDate(27, 10, 15), makeDate(27, 10, 45));
    expect(result.hasGap).toBe(false);
  });

  it('accepts slot with sufficient gap before', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    expect(hasMinimumGap(existing, makeDate(27, 8, 30), makeDate(27, 9, 30), 30).hasGap).toBe(true);
  });

  it('accepts slot with sufficient gap after', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 9).toISOString(), durationMinutes: 60 } as Booking,
    ];
    expect(hasMinimumGap(existing, makeDate(27, 10, 30), makeDate(27, 11, 30), 30).hasGap).toBe(
      true
    );
  });

  it('applies custom gap duration', () => {
    const existing: Booking[] = [
      { id: 'e1', scheduledAt: makeDate(27, 10).toISOString(), durationMinutes: 60 } as Booking,
    ];
    expect(hasMinimumGap(existing, makeDate(27, 9), makeDate(27, 10), 60).hasGap).toBe(false);
    expect(hasMinimumGap(existing, makeDate(27, 9), makeDate(27, 10), 0).hasGap).toBe(true);
  });
});

describe('validateBookingSlot (availability only)', () => {
  it('accepts slot within h1 availability (6AM–9PM)', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = makeDate(27, 14);
    expect(validateBookingSlot(blocks, monday, makeDate(27, 15))).toEqual({ valid: true });
  });

  it('rejects slot at 10PM (outside h1 availability)', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = makeDate(27, 22);
    expect(validateBookingSlot(blocks, monday, makeDate(27, 23)).valid).toBe(false);
  });

  it('rejects slot on saturday for h3 (no weekend)', () => {
    const blocks = getAvailabilityForHandyman('h3');
    const saturday = makeDate(25, 10);
    expect(validateBookingSlot(blocks, saturday, makeDate(25, 11)).valid).toBe(false);
  });

  it('rejects slot on weekday for h5 (weekends only)', () => {
    const blocks = getAvailabilityForHandyman('h5');
    const monday = makeDate(27, 10);
    expect(validateBookingSlot(blocks, monday, makeDate(27, 11)).valid).toBe(false);
  });
});

describe('validateBookingSlot (real mock data)', () => {
  it('h1 mock booking at 7PM is within availability (6AM–9PM)', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const today = new Date();
    const slotStart = new Date(today);
    slotStart.setHours(19, 0, 0, 0);
    const slotEnd = new Date(today);
    slotEnd.setHours(20, 0, 0, 0);
    expect(validateBookingSlot(blocks, slotStart, slotEnd)).toEqual({ valid: true });
  });
});

describe('rankHandymen — ranking heuristics', () => {
  const base: HandymanSearchResult = {
    handyman_id: '',
    user_name: '',
    photo_url: null,
    is_online: true,
    distance_meters: 1000,
    trust_score: null,
  };

  it('sorts nearest first, then by trust_score', () => {
    const results = rankHandymen([
      { ...base, handyman_id: 'h3', distance_meters: 3000, trust_score: 4.8 },
      { ...base, handyman_id: 'h1', distance_meters: 1000, trust_score: 4.9 },
      { ...base, handyman_id: 'h2', distance_meters: 1000, trust_score: 4.5 },
    ]);
    expect(results.map((r) => r.handyman_id)).toEqual(['h1', 'h2', 'h3']);
  });

  it('availability check for h3 on Monday returns windows', () => {
    const blocks = getAvailabilityForHandyman('h3');
    const monday = makeDate(27, 10);
    const windows = blocks.filter((b) => {
      const storeDayMatch = b.id.match(/-d(\d)$/);
      if (!storeDayMatch) return false;
      const storeDay = parseInt(storeDayMatch[1], 10);
      const jsDay = (storeDay + 1) % 7;
      return jsDay === monday.getDay();
    });
    expect(windows.length).toBeGreaterThan(0);
  });
});
