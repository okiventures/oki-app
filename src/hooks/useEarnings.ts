import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchEarnings, fetchWallet } from '../services/earningsService';
import { isMockEnv } from '../services/bookingService';
import { MOCK_EARNINGS, MOCK_HANDYMAN_WALLET } from '../mocks';
import type { EarningsEntry, HandymanWallet } from '../types';

interface UseEarningsReturn {
  earnings: EarningsEntry[];
  wallet: HandymanWallet;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_WALLET: HandymanWallet = {
  availableBalance: 0,
  pendingBalance: 0,
  minimumPayoutThreshold: 1500,
  payoutStage: 'Requested',
  transactions: [],
};

/** Finished jobs and wallet state for the signed-in handyman. */
export function useEarnings(): UseEarningsReturn {
  const { session } = useAuth();
  const mockMode = isMockEnv();

  const [earnings, setEarnings] = useState<EarningsEntry[]>(mockMode ? MOCK_EARNINGS : []);
  const [wallet, setWallet] = useState<HandymanWallet>(
    mockMode ? MOCK_HANDYMAN_WALLET : EMPTY_WALLET
  );
  const [isLoading, setIsLoading] = useState(!mockMode);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (mockMode) return;
    if (!userId) {
      setEarnings([]);
      setWallet(EMPTY_WALLET);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const [entries, walletState] = await Promise.all([fetchEarnings(), fetchWallet()]);
      setEarnings(entries);
      setWallet(walletState);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load earnings');
    } finally {
      setIsLoading(false);
    }
  }, [mockMode, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { earnings, wallet, isLoading, error, refresh };
}
