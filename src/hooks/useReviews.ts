import { useState, useEffect, useCallback } from 'react';
import { Review, ReviewSort } from '../types';
import { fetchReviewsForUser } from '../services/reviewService';

const PAGE_SIZE = 10;

interface UseReviewsReturn {
  reviews: Review[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  sort: ReviewSort;
  setSort: (sort: ReviewSort) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReviews(userId: string | undefined): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSortState] = useState<ReviewSort>('recent');
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number, sortMode: ReviewSort, replace: boolean) => {
      if (!userId) {
        setReviews([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }
      if (replace) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);
      try {
        const result = await fetchReviewsForUser(userId, {
          page: targetPage,
          limit: PAGE_SIZE,
          sort: sortMode,
        });
        setReviews((prev) => (replace ? result.reviews : [...prev, ...result.reviews]));
        setHasMore(result.hasMore);
        setPage(targetPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reviews');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load(1, sort, true);
  }, [load, sort]);

  const loadMore = useCallback(() => load(page + 1, sort, false), [load, page, sort]);

  const setSort = useCallback((next: ReviewSort) => {
    setSortState(next);
  }, []);

  const refresh = useCallback(() => load(1, sort, true), [load, sort]);

  return {
    reviews,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    sort,
    setSort,
    loadMore,
    refresh,
  };
}
