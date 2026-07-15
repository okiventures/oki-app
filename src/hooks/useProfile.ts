import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as profileService from '../services/profileService';
import type {
  Profile,
  UpdateUserProfileInput,
  UpdateHandymanProfileInput,
  HandymanServiceRow,
  ServiceCatalogItem,
} from '../services/profileService';

interface UseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateUser: (input: UpdateUserProfileInput) => Promise<void>;
  updateHandyman: (input: UpdateHandymanProfileInput) => Promise<void>;
  uploadAvatar: (source?: 'gallery' | 'camera') => Promise<string>;
  services: HandymanServiceRow[];
  serviceCatalog: ServiceCatalogItem[];
  refreshServices: () => Promise<void>;
  addService: (serviceId: string, priceOverride?: number | null) => Promise<void>;
  updateServicePrice: (serviceId: string, priceOverride: number | null) => Promise<void>;
  removeService: (serviceId: string) => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<HandymanServiceRow[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>([]);

  const userId = session?.user?.id;

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await profileService.getProfile(userId);
      setProfile(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load profile';
      setError(message);
      console.warn('useProfile: refreshProfile failed:', message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const refreshServices = useCallback(async () => {
    if (!userId) {
      setServices([]);
      return;
    }
    try {
      const [own, catalog] = await Promise.all([
        profileService.listHandymanServices(userId),
        profileService.listServiceCatalog(),
      ]);
      setServices(own);
      setServiceCatalog(catalog);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load services';
      setError(message);
      console.warn('useProfile: refreshServices failed:', message);
    }
  }, [userId]);

  useEffect(() => {
    refreshServices();
  }, [refreshServices]);

  const addService = useCallback(
    async (serviceId: string, priceOverride?: number | null) => {
      if (!userId) throw new Error('Not authenticated');
      const added = await profileService.addHandymanService(userId, serviceId, priceOverride);
      setServices((prev) => [...prev, added]);
    },
    [userId]
  );

  const updateServicePriceHandler = useCallback(
    async (serviceId: string, priceOverride: number | null) => {
      if (!userId) throw new Error('Not authenticated');
      const updated = await profileService.updateServicePrice(userId, serviceId, priceOverride);
      setServices((prev) => prev.map((s) => (s.service_id === serviceId ? updated : s)));
    },
    [userId]
  );

  const removeService = useCallback(
    async (serviceId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await profileService.removeHandymanService(userId, serviceId);
      setServices((prev) => prev.filter((s) => s.service_id !== serviceId));
    },
    [userId]
  );

  const updateUser = useCallback(
    async (input: UpdateUserProfileInput) => {
      if (!userId) throw new Error('Not authenticated');
      setError(null);
      try {
        const updated = await profileService.updateUserProfile(userId, input);
        setProfile((prev) =>
          prev ? { ...prev, user: updated } : { user: updated, handyman: null }
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to update profile';
        setError(message);
        throw e;
      }
    },
    [userId]
  );

  const updateHandyman = useCallback(
    async (input: UpdateHandymanProfileInput) => {
      if (!userId) throw new Error('Not authenticated');
      setError(null);
      try {
        const updated = await profileService.updateHandymanProfile(userId, input);
        setProfile((prev) =>
          prev ? { ...prev, handyman: updated } : { user: null as never, handyman: updated }
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to update handyman profile';
        setError(message);
        throw e;
      }
    },
    [userId]
  );

  const uploadAvatar = useCallback(
    async (source: 'gallery' | 'camera' = 'gallery') => {
      if (!userId) throw new Error('Not authenticated');
      setError(null);
      try {
        const url = await profileService.pickAndUploadAvatar(userId, source);
        setProfile((prev) => (prev ? { ...prev, user: { ...prev.user, photo_url: url } } : prev));
        return url;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Avatar upload failed';
        setError(message);
        throw e;
      }
    },
    [userId]
  );

  return {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateUser,
    updateHandyman,
    uploadAvatar,
    services,
    serviceCatalog,
    refreshServices,
    addService,
    updateServicePrice: updateServicePriceHandler,
    removeService,
  };
}
