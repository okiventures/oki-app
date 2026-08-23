import { useCallback, useEffect, useState } from 'react';
import { fetchBookableServices, type BookableService } from '../services/catalogService';

interface UseBookableServicesReturn {
  services: BookableService[];
  isLoading: boolean;
  error: string | null;
  /** Re-run the fetch. Without this a transient failure stranded the form. */
  retry: () => void;
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
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBookableServices()
      .then((rows) => {
        if (!cancelled) setServices(rows);
      })
      .catch((err: unknown) => {
        // No prices means no honest quote, so the form shows nothing to pick
        // rather than falling back to numbers the server will not charge.
        //
        // The reason goes to the console, not the screen: this message renders
        // on the booking form, and PostgREST failures read like "permission
        // denied for table services" or "JWT expired" — no use to the person
        // booking, and it puts backend detail in front of them.
        console.warn(
          'useBookableServices: catalog fetch failed:',
          err instanceof Error ? err.message : err
        );
        if (!cancelled) setError('Could not load prices. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { services, isLoading, error, retry };
}
