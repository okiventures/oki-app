import {
  getAvailabilityForHandyman,
  setDayAvailability,
  removeDayAvailability,
  resetAvailabilityStore,
  MOCK_AVAILABILITY_BLOCKS,
} from '../../src/mocks/availability';
import { getAvailabilityForDay, validateBookingSlot } from '../../src/services/searchService';

beforeEach(() => {
  resetAvailabilityStore();
});

describe('getAvailabilityForHandyman', () => {
  it('returns blocks for a known handyman', () => {
    const blocks = getAvailabilityForHandyman('h1');
    expect(blocks.length).toBe(7);
    blocks.forEach((b) => expect(b.handymanId).toBe('h1'));
  });

  it('returns empty array for unknown handyman', () => {
    expect(getAvailabilityForHandyman('unknown')).toEqual([]);
  });

  it('blocks contain startHour and endHour', () => {
    const blocks = getAvailabilityForHandyman('h1');
    for (const b of blocks) {
      expect(typeof b.startHour).toBe('number');
      expect(typeof b.endHour).toBe('number');
      expect(b.startHour).toBeLessThan(b.endHour);
    }
  });
});

describe('setDayAvailability', () => {
  it('adds a new block for a new handyman', () => {
    setDayAvailability('h-new', 0, 9, 17);
    const blocks = getAvailabilityForHandyman('h-new');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startHour).toBe(9);
    expect(blocks[0].endHour).toBe(17);
    expect(blocks[0].id).toBe('h-new-d0');
    expect(blocks[0].recurrence).toBe('weekly');
  });

  it('replaces existing block for same handyman and day', () => {
    const before = getAvailabilityForHandyman('h1');
    const monBlock = before.find((b) => b.id === 'h1-d0')!;
    expect(monBlock.startHour).toBe(6);
    expect(monBlock.endHour).toBe(21);

    setDayAvailability('h1', 0, 10, 16);
    const after = getAvailabilityForHandyman('h1');
    const updated = after.find((b) => b.id === 'h1-d0')!;
    expect(updated.startHour).toBe(10);
    expect(updated.endHour).toBe(16);
  });
});

describe('removeDayAvailability', () => {
  it('removes block for given handyman and day', () => {
    expect(getAvailabilityForHandyman('h1').length).toBe(7);
    removeDayAvailability('h1', 0);
    const blocks = getAvailabilityForHandyman('h1');
    expect(blocks).toHaveLength(6);
    expect(blocks.find((b) => b.id === 'h1-d0')).toBeUndefined();
  });

  it('no-op for non-existent block', () => {
    const before = getAvailabilityForHandyman('h1');
    removeDayAvailability('h1', 99);
    expect(getAvailabilityForHandyman('h1')).toEqual(before);
  });
});

describe('getAvailabilityForDay', () => {
  it('returns windows for matching day of week', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = new Date(2026, 6, 27);
    const windows = getAvailabilityForDay(blocks, monday);
    expect(windows.length).toBeGreaterThan(0);
  });
});

describe('validateBookingSlot', () => {
  it('accepts a slot within available hours', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = new Date(2026, 6, 27);
    const slotStart = new Date(monday);
    slotStart.setHours(10, 0, 0, 0);
    const slotEnd = new Date(monday);
    slotEnd.setHours(11, 0, 0, 0);
    expect(validateBookingSlot(blocks, slotStart, slotEnd)).toEqual({ valid: true });
  });

  it('rejects a slot outside available hours', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = new Date(2026, 6, 27);
    const slotStart = new Date(monday);
    slotStart.setHours(22, 0, 0, 0);
    const slotEnd = new Date(monday);
    slotEnd.setHours(23, 0, 0, 0);
    const result = validateBookingSlot(blocks, slotStart, slotEnd);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Slot falls outside available hours');
  });

  it('rejects when no blocks at all for handyman', () => {
    const result = validateBookingSlot([], new Date(), new Date());
    expect(result.valid).toBe(false);
  });
});

describe('MOCK_AVAILABILITY_BLOCKS snapshot', () => {
  it('has 22 total blocks', () => {
    expect(MOCK_AVAILABILITY_BLOCKS).toHaveLength(22);
  });
});
