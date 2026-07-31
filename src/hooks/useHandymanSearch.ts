import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceCategory } from '@/types';
import { rankHandymen } from '../services/searchService';
import { isMockEnv } from '../services/bookingService';
import { MOCK_HANDYMEN } from '../mocks';

const CATEGORY_SKILL_MATCH: Record<ServiceCategory, string[]> = {
  [ServiceCategory.Plumbing]: ['Plumbing'],
  [ServiceCategory.Electrical]: ['Electrical'],
  [ServiceCategory.Carpentry]: ['Carpentry'],
  [ServiceCategory.Cleaning]: ['Cleaning'],
  [ServiceCategory.Painting]: ['Painting'],
  [ServiceCategory.HVAC]: ['HVAC'],
  [ServiceCategory.Roofing]: ['Roofing'],
  [ServiceCategory.Landscaping]: ['Landscaping'],
  [ServiceCategory.Appliance]: ['Appliance Repair', 'General Handyman'],
  [ServiceCategory.General]: [],
};

export interface HandymanSearchResult {
  handyman_id: string;
  user_name: string;
  photo_url: string | null;
  is_online: boolean;
  distance_meters: number;
  trust_score: number | null;
}

interface UseHandymanSearchProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  category: ServiceCategory | null;
}

const MOCK_HANDYMAN_RESULTS: HandymanSearchResult[] = [
  {
    handyman_id: 'h1',
    user_name: 'Ceferino Jumao-as V',
    photo_url: 'https://api.dicebear.com/7.x/shapes/png?seed=Ceferino',
    is_online: true,
    distance_meters: 1200,
    trust_score: 4.9,
  },
  {
    handyman_id: 'h2',
    user_name: 'James Ty',
    photo_url: 'https://api.dicebear.com/7.x/shapes/png?seed=James',
    is_online: true,
    distance_meters: 2800,
    trust_score: 4.7,
  },
  {
    handyman_id: 'h3',
    user_name: 'Mara Sy',
    photo_url: 'https://api.dicebear.com/7.x/shapes/png?seed=Mara',
    is_online: true,
    distance_meters: 3500,
    trust_score: 4.8,
  },
  {
    handyman_id: 'h4',
    user_name: 'Kyle Lee',
    photo_url: 'https://api.dicebear.com/7.x/shapes/png?seed=Kyle',
    is_online: true,
    distance_meters: 800,
    trust_score: 4.6,
  },
  {
    handyman_id: 'h5',
    user_name: 'Princess Jaena',
    photo_url: 'https://api.dicebear.com/7.x/shapes/png?seed=Princess',
    is_online: false,
    distance_meters: 5200,
    trust_score: 5.0,
  },
];

function getMockResults(category: ServiceCategory | null): HandymanSearchResult[] {
  if (!category) return MOCK_HANDYMAN_RESULTS;

  const matchSkills = CATEGORY_SKILL_MATCH[category];

  if (category === ServiceCategory.General || matchSkills.length === 0) {
    return MOCK_HANDYMAN_RESULTS;
  }

  return MOCK_HANDYMAN_RESULTS.filter((r) => {
    const profile = MOCK_HANDYMEN.find((h) => h.id === r.handyman_id);
    if (!profile) return false;
    return profile.skills.some((s) => matchSkills.includes(s));
  });
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
    if (!latitude || !longitude) return;

    setIsLoading(true);
    setError(null);

    try {
      const useMock = isMockEnv();
      if (useMock) {
        setHandymen(rankHandymen(getMockResults(category)));
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('search_nearest_handymen', {
        p_client_lat: latitude,
        p_client_lng: longitude,
        p_radius_meters: radiusMeters,
        p_category: category,
      });

      if (rpcError) throw rpcError;

      setHandymen(rankHandymen(data as HandymanSearchResult[]));
    } catch (err) {
      console.warn('useHandymanSearch: RPC failed', err);
      if (isMockEnv()) {
        setHandymen(rankHandymen(getMockResults(category)));
      } else {
        setError('Failed to load nearby handymen. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, radiusMeters, category]);

  useEffect(() => {
    fetchNearbyHandymen();
  }, [fetchNearbyHandymen]);

  return { handymen, isLoading, error, refetch: fetchNearbyHandymen };
}
