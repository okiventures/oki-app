import { useEffect, useState } from 'react';
import { fetchBookableServices, type BookableService } from '../services/catalogService';

interface UseBookableServicesReturn {
  services: BookableService[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Bookable sub-services with catalog pricing, for the new-booking form.
 *
 * Fetched once per mount, matching useServiceCategories — the catalog is small
 * and effectively static within a session.
 */
export function useBookableServices(): UseBookableServicesReturn {
  const [services, setServices] = useState<BookableService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBookableServices()
      .then((rows) => {
        if (!cancelled) setServices(rows);
      })
      .catch((err: unknown) => {
        // No prices means no honest quote, so the form shows nothing to pick
        // rather than falling back to numbers the server will not charge.
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load services');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { services, isLoading, error };
}
