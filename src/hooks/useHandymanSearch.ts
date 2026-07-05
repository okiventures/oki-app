import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceCategory } from '@/types';

export interface HandymanSearchResult {
  handyman_id: string;
  user_name: string;
  photo_url: string | null;
  is_online: boolean;
  distance_meters: number;
}

interface UseHandymanSearchProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  category: ServiceCategory | null;
}

export function useHandymanSearch({
  latitude,
  longitude,
  radiusMeters,
  category,
}: UseHandymanSearchProps) {
  const [handymen, setHandymen] = useState<HandymanSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyHandymen = useCallback(async () => {
    if (!latitude || !longitude || !category) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_nearest_handymen', {
        p_client_lat: latitude,
        p_client_lng: longitude,
        p_radius_meters: radiusMeters,
        p_category: category,
      });

      if (rpcError) throw rpcError;

      setHandymen(data as HandymanSearchResult[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search handymen';
      setError(message);
      setHandymen([]);
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, radiusMeters, category]);

  useEffect(() => {
    fetchNearbyHandymen();
  }, [fetchNearbyHandymen]);

  return { handymen, isLoading, error, refetch: fetchNearbyHandymen };
}
