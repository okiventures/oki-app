import { useEffect, useState } from 'react';
import { fetchServiceCategories, type ServiceCategoryTile } from '../services/catalogService';

interface UseServiceCategoriesReturn {
  categories: ServiceCategoryTile[];
  isLoading: boolean;
}

/**
 * Bookable categories for the dashboard grid and the category strip.
 *
 * The catalog is small and effectively static within a session, so this fetches
 * once per mount and does not refresh.
 */
export function useServiceCategories(): UseServiceCategoriesReturn {
  const [categories, setCategories] = useState<ServiceCategoryTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchServiceCategories()
      .then((tiles) => {
        if (!cancelled) setCategories(tiles);
      })
      .catch(() => {
        // A failed catalog fetch leaves the grid empty rather than showing
        // categories nobody can book.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading };
}
