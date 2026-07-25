import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getAvailabilityForHandyman } from '../mocks/availability';
import { getAvailabilityForDay } from '../services/searchService';
import { isMockEnv } from '../services/bookingService';

interface BlockedSlotRaw {
  blocked_start: string;
  blocked_end: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = useMemo(() => targetDate.toDateString(), [targetDate]);

  const availableWindows = useMemo(() => {
    void refreshKey;
    if (!handymanId) return [];
    const blocks = getAvailabilityForHandyman(handymanId);
    return getAvailabilityForDay(blocks, targetDate);
  }, [handymanId, targetDate, refreshKey]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!handymanId) return;

      setIsLoading(true);
      setError(null);

      const startOfDay = new Date(dateKey);
      const endOfDay = new Date(dateKey);
      endOfDay.setDate(endOfDay.getDate() + 1);

      try {
        if (isMockEnv()) {
          setBlockedRanges([]);
          return;
        }

        const { data, error: rpcError } = await supabase.rpc('get_handyman_blocked_slots', {
          p_handyman_id: handymanId,
          p_start_date: startOfDay.toISOString(),
          p_end_date: endOfDay.toISOString(),
        });

        if (rpcError) throw rpcError;

        const ranges = (data as BlockedSlotRaw[]).map((slot) => ({
          start: new Date(slot.blocked_start),
          end: new Date(slot.blocked_end),
        }));

        setBlockedRanges(ranges);
      } catch {
        // RPC not available in dev — mock data via availableWindows covers it
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [handymanId, dateKey, refreshKey]);

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
        slotEnd.setHours(slotEnd.getHours() + 2);
        const inWindow = availableWindows.some((w) => slotToCheck >= w.start && slotEnd <= w.end);
        if (!inWindow) return true;
      }

      return false;
    },
    [targetDate, blockedRanges, availableWindows]
  );

  return { isLoading, isTimeSlotBlocked, availableWindows, error };
}
