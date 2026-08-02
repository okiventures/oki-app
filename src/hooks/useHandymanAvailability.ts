import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getAvailabilityForHandyman } from '../mocks/availability';
import { getAvailabilityForDay, DEFAULT_SLOT_DURATION_MINUTES } from '../services/searchService';
import { isMockEnv } from '../services/bookingService';
import { AvailabilityRecurrence } from '../types';

interface BlockedSlotRaw {
  blocked_start: string;
  blocked_end: string;
}

interface AvailabilityBlockRaw {
  block_id: string;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
  start_time: string;
  end_time: string;
  recurrence: string;
}

interface UseHandymanAvailabilityProps {
  handymanId?: string;
  targetDate: Date;
  refreshKey?: number;
}

export function useHandymanAvailability({
  handymanId,
  targetDate,
  refreshKey = 0,
}: UseHandymanAvailabilityProps) {
  const [blockedRanges, setBlockedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const [availableWindows, setAvailableWindows] = useState<{ start: Date; end: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!handymanId) return;

      setIsLoading(true);
      setError(null);
      setBlockedRanges([]);
      setAvailableWindows([]);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      try {
        if (isMockEnv()) {
          const blocks = getAvailabilityForHandyman(handymanId);
          setAvailableWindows(getAvailabilityForDay(blocks, startOfDay));
          setBlockedRanges([]);
          return;
        }

        const [{ data: slotsData, error: slotsError }, { data: availData, error: availError }] =
          await Promise.all([
            supabase.rpc('get_handyman_blocked_slots', {
              p_handyman_id: handymanId,
              p_start_date: startOfDay.toISOString(),
              p_end_date: endOfDay.toISOString(),
            }),
            supabase.rpc('get_handyman_availability_blocks', {
              p_handyman_id: handymanId,
              p_start_date: startOfDay.toISOString(),
              p_end_date: endOfDay.toISOString(),
            }),
          ]);

        if (slotsError) throw slotsError;
        if (availError) throw availError;

        const ranges = (slotsData as BlockedSlotRaw[]).map((slot) => ({
          start: new Date(slot.blocked_start),
          end: new Date(slot.blocked_end),
        }));
        setBlockedRanges(ranges);

        const blocks = (availData as AvailabilityBlockRaw[]).map((row) => ({
          id: row.block_id,
          handymanId,
          startTime: row.start_time,
          endTime: row.end_time,
          startHour: row.start_hour,
          endHour: row.end_hour,
          dayOfWeek: row.day_of_week,
          recurrence: row.recurrence.toLowerCase() as AvailabilityRecurrence,
        }));
        setAvailableWindows(getAvailabilityForDay(blocks, startOfDay));
      } catch (err) {
        console.warn('useHandymanAvailability: RPC failed', err);
        setError('Failed to load availability');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [handymanId, targetDate, refreshKey]);

  const isTimeSlotBlocked = useCallback(
    (hour: number): boolean => {
      const slotToCheck = new Date(targetDate);
      slotToCheck.setHours(hour, 0, 0, 0);

      const minimumLeadTime = new Date();
      minimumLeadTime.setHours(minimumLeadTime.getHours() + 2);
      if (slotToCheck < minimumLeadTime) return true;

      if (blockedRanges.some((range) => slotToCheck >= range.start && slotToCheck < range.end)) {
        return true;
      }

      if (availableWindows.length > 0) {
        const slotEnd = new Date(slotToCheck);
        slotEnd.setMinutes(slotEnd.getMinutes() + DEFAULT_SLOT_DURATION_MINUTES);
        const inWindow = availableWindows.some((w) => slotToCheck >= w.start && slotEnd <= w.end);
        if (!inWindow) return true;
      }

      return false;
    },
    [targetDate, blockedRanges, availableWindows]
  );

  return { isLoading, isTimeSlotBlocked, availableWindows, error };
}
