import { AvailabilityBlock } from '../types';

const MON = new Date('2026-07-20T00:00:00.000Z');

function ph(hourPH: number, offsetDays: number): [number, number] {
  const utcHour = (hourPH - 8 + 24) % 24;
  const dayShift = hourPH < 8 ? -1 : 0;
  return [offsetDays + dayShift, utcHour];
}

function time(hourPH: number, offsetDays: number): string {
  const [d, h] = ph(hourPH, offsetDays);
  const date = new Date(MON);
  date.setDate(date.getDate() + d);
  date.setUTCHours(h, 0, 0, 0);
  return date.toISOString();
}

const H1_HOURS: [number, number] = [6, 21];
const H2_HOURS: [number, number] = [9, 18];
const H3_HOURS: [number, number] = [8, 12];
const H4_HOURS: [number, number] = [14, 22];
const H5_HOURS: [number, number] = [8, 17];

export const MOCK_AVAILABILITY_BLOCKS: AvailabilityBlock[] = [
  ...[0, 1, 2, 3, 4, 5, 6].flatMap((d) => ({
    id: `h1-d${d}`,
    handymanId: 'h1',
    startTime: time(H1_HOURS[0], d),
    endTime: time(H1_HOURS[1], d),
    startHour: H1_HOURS[0],
    endHour: H1_HOURS[1],
    dayOfWeek: (d + 1) % 7,
    recurrence: 'weekly' as const,
  })),
  ...[1, 2, 3, 4, 5].flatMap((d) => ({
    id: `h2-d${d}`,
    handymanId: 'h2',
    startTime: time(H2_HOURS[0], d),
    endTime: time(H2_HOURS[1], d),
    startHour: H2_HOURS[0],
    endHour: H2_HOURS[1],
    dayOfWeek: (d + 1) % 7,
    recurrence: 'weekly' as const,
  })),
  ...[0, 2, 4].flatMap((d) => ({
    id: `h3-d${d}`,
    handymanId: 'h3',
    startTime: time(H3_HOURS[0], d),
    endTime: time(H3_HOURS[1], d),
    startHour: H3_HOURS[0],
    endHour: H3_HOURS[1],
    dayOfWeek: (d + 1) % 7,
    recurrence: 'weekly' as const,
  })),
  ...[0, 1, 2, 3, 4].flatMap((d) => ({
    id: `h4-d${d}`,
    handymanId: 'h4',
    startTime: time(H4_HOURS[0], d),
    endTime: time(H4_HOURS[1], d),
    startHour: H4_HOURS[0],
    endHour: H4_HOURS[1],
    dayOfWeek: (d + 1) % 7,
    recurrence: 'weekly' as const,
  })),
  ...[5, 6].flatMap((d) => ({
    id: `h5-d${d}`,
    handymanId: 'h5',
    startTime: time(H5_HOURS[0], d),
    endTime: time(H5_HOURS[1], d),
    startHour: H5_HOURS[0],
    endHour: H5_HOURS[1],
    dayOfWeek: (d + 1) % 7,
    recurrence: 'weekly' as const,
  })),
];

let availabilityStore: AvailabilityBlock[] = [...MOCK_AVAILABILITY_BLOCKS];

export function getAvailabilityForHandyman(handymanId: string): AvailabilityBlock[] {
  return availabilityStore.filter((b) => b.handymanId === handymanId);
}

export interface AvailabilityRun {
  startHour: number;
  endHour: number;
}

export function setDayAvailability(
  handymanId: string,
  storeDay: number,
  runs: AvailabilityRun[]
): void {
  if (storeDay < 0 || storeDay > 6) return;
  availabilityStore = availabilityStore.filter(
    (b) => !(b.handymanId === handymanId && b.dayOfWeek === (storeDay + 1) % 7)
  );

  for (const run of runs) {
    const block: AvailabilityBlock = {
      id: `${handymanId}-d${storeDay}-${run.startHour}`,
      handymanId,
      startTime: time(run.startHour, storeDay),
      endTime: time(run.endHour, storeDay),
      startHour: run.startHour,
      endHour: run.endHour,
      dayOfWeek: (storeDay + 1) % 7,
      recurrence: 'weekly',
    };
    availabilityStore.push(block);
  }
}

export function removeDayAvailability(handymanId: string, storeDay: number): void {
  if (storeDay < 0 || storeDay > 6) return;
  availabilityStore = availabilityStore.filter(
    (b) => !(b.handymanId === handymanId && b.dayOfWeek === (storeDay + 1) % 7)
  );
}

export function resetAvailabilityStore(): void {
  availabilityStore = MOCK_AVAILABILITY_BLOCKS.map((b) => ({ ...b }));
}
