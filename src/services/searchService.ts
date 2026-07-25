import { HandymanSearchResult } from '../hooks/useHandymanSearch';
import { AvailabilityBlock, Booking, BookingStatus } from '../types';

export function rankHandymen(handymen: HandymanSearchResult[]): HandymanSearchResult[] {
  return [...handymen].sort((a, b) => {
    if (a.distance_meters !== b.distance_meters) {
      return a.distance_meters - b.distance_meters;
    }
    return (b.trust_score ?? 0) - (a.trust_score ?? 0);
  });
}

export function getAvailabilityForDay(
  blocks: AvailabilityBlock[],
  date: Date
): { start: Date; end: Date }[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return blocks.reduce<{ start: Date; end: Date }[]>((windows, block) => {
    if (block.recurrence === 'weekly') {
      const storeDayMatch = block.id.match(/-d(\d)$/);
      if (!storeDayMatch) return windows;
      const storeDay = parseInt(storeDayMatch[1], 10);
      const jsDay = (storeDay + 1) % 7;
      if (jsDay !== date.getDay()) return windows;

      const slotStart = new Date(date);
      slotStart.setHours(block.startHour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(block.endHour, 0, 0, 0);

      if (slotStart < dayEnd && slotEnd > dayStart) {
        windows.push({ start: slotStart, end: slotEnd });
      }
    } else {
      const blockStart = new Date(block.startTime);
      if (blockStart >= dayStart && blockStart < dayEnd) {
        windows.push({ start: blockStart, end: new Date(block.endTime) });
      }
    }

    return windows;
  }, []);
}

export function isSlotInAvailableWindow(
  availableWindows: { start: Date; end: Date }[],
  slotStart: Date,
  slotEnd: Date
): boolean {
  return availableWindows.some((w) => slotStart >= w.start && slotEnd <= w.end);
}

export function validateBookingSlot(
  blocks: AvailabilityBlock[],
  slotStart: Date,
  slotEnd: Date
): { valid: boolean; reason?: string } {
  const windows = getAvailabilityForDay(blocks, slotStart);
  if (windows.length === 0) {
    return { valid: false, reason: 'No availability set for this day' };
  }
  if (!isSlotInAvailableWindow(windows, slotStart, slotEnd)) {
    return { valid: false, reason: 'Slot falls outside available hours' };
  }
  return { valid: true };
}

export function getBookingsOnDate(bookings: Booking[], handymanId: string, date: Date): Booking[] {
  return bookings.filter(
    (b) =>
      b.handymanId === handymanId &&
      b.scheduledAt &&
      b.status !== BookingStatus.Cancelled &&
      b.status !== BookingStatus.Rejected &&
      new Date(b.scheduledAt).getFullYear() === date.getFullYear() &&
      new Date(b.scheduledAt).getMonth() === date.getMonth() &&
      new Date(b.scheduledAt).getDate() === date.getDate()
  );
}

export function isSlotOverlapping(
  existing: Booking[],
  slotStart: Date,
  slotEnd: Date
): { overlaps: boolean; conflicting?: Booking } {
  for (const b of existing) {
    if (!b.scheduledAt) continue;
    const bStart = new Date(b.scheduledAt);
    const bEnd = new Date(bStart);
    bEnd.setMinutes(bEnd.getMinutes() + (b.durationMinutes ?? 90));
    if (slotStart < bEnd && slotEnd > bStart) {
      return { overlaps: true, conflicting: b };
    }
  }
  return { overlaps: false };
}

export function hasMinimumGap(
  existing: Booking[],
  slotStart: Date,
  slotEnd: Date,
  gapMinutes: number = 30
): { hasGap: boolean; conflicting?: Booking } {
  for (const b of existing) {
    if (!b.scheduledAt) continue;
    const bStart = new Date(b.scheduledAt);
    const bEnd = new Date(bStart);
    bEnd.setMinutes(bEnd.getMinutes() + (b.durationMinutes ?? 90));
    const bufferedStart = new Date(bStart);
    bufferedStart.setMinutes(bufferedStart.getMinutes() - gapMinutes);
    const bufferedEnd = new Date(bEnd);
    bufferedEnd.setMinutes(bufferedEnd.getMinutes() + gapMinutes);
    if (slotStart < bufferedEnd && slotEnd > bufferedStart) {
      return { hasGap: false, conflicting: b };
    }
  }
  return { hasGap: true };
}
