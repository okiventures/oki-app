import {
  getAvailabilityForHandyman,
  setDayAvailability,
  removeDayAvailability,
  resetAvailabilityStore,
  MOCK_AVAILABILITY_BLOCKS,
} from '../../src/mocks/availability';
import {
  getAvailabilityForDay,
  validateBookingSlot,
  isWeeklyBlock,
  getBlockDayOfWeek,
} from '../../src/services/searchService';
import { AvailabilityBlock } from '../../src/types';

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
    setDayAvailability('h-new', 0, [{ startHour: 9, endHour: 17 }]);
    const blocks = getAvailabilityForHandyman('h-new');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startHour).toBe(9);
    expect(blocks[0].endHour).toBe(17);
    expect(blocks[0].recurrence).toBe('weekly');
  });

  it('replaces existing block for same handyman and day', () => {
    const before = getAvailabilityForHandyman('h1');
    const monBlock = before.find((b) => b.dayOfWeek === 1)!;
    expect(monBlock.startHour).toBe(6);
    expect(monBlock.endHour).toBe(21);

    setDayAvailability('h1', 0, [{ startHour: 10, endHour: 16 }]);
    const after = getAvailabilityForHandyman('h1');
    expect(after).toHaveLength(7);
    const updated = after.find((b) => b.dayOfWeek === 1)!;
    expect(updated.startHour).toBe(10);
    expect(updated.endHour).toBe(16);
  });

  it('keeps one block per contiguous run when gaps exist', () => {
    setDayAvailability('h-gap', 0, [
      { startHour: 8, endHour: 10 },
      { startHour: 14, endHour: 16 },
    ]);
    const blocks = getAvailabilityForHandyman('h-gap');
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.startHour)).toEqual([8, 14]);
    expect(blocks.map((b) => b.endHour)).toEqual([10, 16]);
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

describe('isWeeklyBlock / getBlockDayOfWeek', () => {
  it('uses the dayOfWeek field when present (DB column path)', () => {
    const dbBlock: AvailabilityBlock = {
      id: 'c0a80101-0000-0000-0000-000000000001',
      handymanId: 'h1',
      startTime: '2026-07-20T00:00:00.000Z',
      endTime: '2026-07-20T00:00:00.000Z',
      startHour: 6,
      endHour: 21,
      dayOfWeek: 1,
      recurrence: 'weekly',
    };
    expect(isWeeklyBlock(dbBlock)).toBe(true);
    expect(getBlockDayOfWeek(dbBlock)).toBe(1);
  });

  it('derives day of week from the id for legacy blocks without dayOfWeek', () => {
    const legacyBlock: AvailabilityBlock = {
      id: 'h1-d0',
      handymanId: 'h1',
      startTime: '2026-07-20T00:00:00.000Z',
      endTime: '2026-07-20T00:00:00.000Z',
      startHour: 6,
      endHour: 21,
      recurrence: 'weekly',
    };
    expect(getBlockDayOfWeek(legacyBlock)).toBe(1);
  });

  it('matches weekly windows on the mapped day', () => {
    const blocks = getAvailabilityForHandyman('h1');
    const monday = new Date(2026, 6, 27);
    const sunday = new Date(2026, 6, 26);
    expect(getAvailabilityForDay(blocks, monday).length).toBeGreaterThan(0);
    expect(getAvailabilityForDay(blocks, sunday).length).toBeGreaterThan(0);
  });
});
