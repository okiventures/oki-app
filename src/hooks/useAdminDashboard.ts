import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminActivity,
  fetchAdminMetrics,
  fetchAdminTransactions,
  type AdminActivityItem,
  type AdminMetrics,
} from '../services/adminService';
import { isMockEnv } from '../services/bookingService';
import type { Transaction } from '../types';

interface UseAdminDashboardReturn {
  metrics: AdminMetrics | null;
  transactions: Transaction[];
  activity: AdminActivityItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Metrics, transactions and the activity feed for the admin console. */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const { session } = useAuth();
  const mockMode = isMockEnv();
  const isAdmin = mockMode || session?.user?.userType === 'admin';

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setMetrics(null);
      setTransactions([]);
      setActivity([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const [nextMetrics, nextTransactions, nextActivity] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminTransactions(),
        fetchAdminActivity(),
      ]);
      setMetrics(nextMetrics);
      setTransactions(nextTransactions);
      setActivity(nextActivity);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, transactions, activity, isLoading, error, refresh };
}
