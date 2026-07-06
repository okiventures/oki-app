import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface BlockedSlotRaw {
  blocked_start: string;
  blocked_end: string;
}

interface UseHandymanAvailabilityProps {
  handymanId?: string;
  targetDate: Date;
}

export function useHandymanAvailability({ handymanId, targetDate }: UseHandymanAvailabilityProps) {
  const [blockedRanges, setBlockedRanges] = useState<{ start: Date; end: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = useMemo(() => targetDate.toDateString(), [targetDate]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!handymanId) return;

      setIsLoading(true);
      setError(null);

      const startOfDay = new Date(dateKey);
      const endOfDay = new Date(dateKey);
      endOfDay.setDate(endOfDay.getDate() + 1);

      try {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not fetch worker schedule.';
        setError(message);
        console.warn('useHandymanAvailability:', message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [handymanId, dateKey]);

  const isTimeSlotBlocked = useCallback(
    (hour: number): boolean => {
      const slotToCheck = new Date(targetDate);
      slotToCheck.setHours(hour, 0, 0, 0);

      const minimumLeadTime = new Date();
      minimumLeadTime.setHours(minimumLeadTime.getHours() + 2);
      if (slotToCheck < minimumLeadTime) return true;

      return blockedRanges.some((range) => slotToCheck >= range.start && slotToCheck < range.end);
    },
    [targetDate, blockedRanges]
  );

  return { isLoading, isTimeSlotBlocked, error };
}
