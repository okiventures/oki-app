import {
  rankHandymen,
  getAvailabilityForDay,
  isSlotInAvailableWindow,
} from '../../src/services/searchService';
import type { HandymanSearchResult } from '../../src/hooks/useHandymanSearch';
import { AvailabilityBlock } from '../../src/types';

describe('rankHandymen', () => {
  const base: HandymanSearchResult = {
    handyman_id: 'h1',
    user_name: 'A',
    photo_url: null,
    is_online: true,
    distance_meters: 1000,
    trust_score: null,
    review_count: 0,
  };

  it('sorts by distance ascending', () => {
    const results = rankHandymen([
      { ...base, handyman_id: 'h1', distance_meters: 3000 },
      { ...base, handyman_id: 'h2', distance_meters: 1000 },
      { ...base, handyman_id: 'h3', distance_meters: 2000 },
    ]);
    expect(results.map((r) => r.handyman_id)).toEqual(['h2', 'h3', 'h1']);
  });

  it('uses trust_score as secondary sort descending', () => {
    const results = rankHandymen([
      { ...base, handyman_id: 'h1', distance_meters: 1000, trust_score: 3.5 },
      { ...base, handyman_id: 'h2', distance_meters: 1000, trust_score: 4.2 },
      { ...base, handyman_id: 'h3', distance_meters: 1000, trust_score: null },
    ]);
    expect(results.map((r) => r.handyman_id)).toEqual(['h2', 'h1', 'h3']);
  });

  it('null trust_score sorts last within same distance', () => {
    const results = rankHandymen([
      { ...base, handyman_id: 'h1', distance_meters: 1000, trust_score: null },
      { ...base, handyman_id: 'h2', distance_meters: 1000, trust_score: 4.0 },
    ]);
    expect(results.map((r) => r.handyman_id)).toEqual(['h2', 'h1']);
  });

  it('does not mutate input', () => {
    const input: HandymanSearchResult[] = [
      { ...base, handyman_id: 'h2', distance_meters: 2000 },
      { ...base, handyman_id: 'h1', distance_meters: 1000 },
    ];
    const copy = [...input];
    rankHandymen(input);
    expect(input).toEqual(copy);
  });
});

describe('getAvailabilityForDay', () => {
  const blocks: AvailabilityBlock[] = [
    {
      id: 'h1-d0',
      handymanId: 'h1',
      startTime: '2026-07-20T00:00:00.000Z',
      endTime: '2026-07-20T09:00:00.000Z',
      startHour: 8,
      endHour: 17,
      recurrence: 'weekly',
    },
  ];

  it('returns window for matching day of week', () => {
    // block store day 0 = Monday; July 21, 2026 is Tuesday
    const tuesday = new Date(2026, 6, 21);
    expect(getAvailabilityForDay(blocks, tuesday)).toHaveLength(0);
  });

  it('returns nothing for non-matching day', () => {
    // July 25, 2026 is Saturday
    const saturday = new Date(2026, 6, 25);
    expect(getAvailabilityForDay(blocks, saturday)).toHaveLength(0);
  });

  it('expands weekly block to correct date', () => {
    // July 27, 2026 is Monday
    const monday = new Date(2026, 6, 27);
    const windows = getAvailabilityForDay(blocks, monday);
    expect(windows).toHaveLength(1);
    const durationHours = (windows[0].end.getTime() - windows[0].start.getTime()) / 3600000;
    expect(durationHours).toBe(9);
  });
});

describe('isSlotInAvailableWindow', () => {
  const windows = [
    { start: new Date('2026-07-21T08:00:00Z'), end: new Date('2026-07-21T17:00:00Z') },
  ];

  it('returns true when slot is within window', () => {
    const slot = new Date('2026-07-21T10:00:00Z');
    expect(isSlotInAvailableWindow(windows, slot, new Date('2026-07-21T12:00:00Z'))).toBe(true);
  });

  it('returns false when slot starts before window', () => {
    const slot = new Date('2026-07-21T07:00:00Z');
    expect(isSlotInAvailableWindow(windows, slot, new Date('2026-07-21T09:00:00Z'))).toBe(false);
  });

  it('returns false when slot ends after window', () => {
    const slot = new Date('2026-07-21T16:00:00Z');
    expect(isSlotInAvailableWindow(windows, slot, new Date('2026-07-21T18:00:00Z'))).toBe(false);
  });
});
