import { supabase } from '../lib/supabase';
import { EarningsEntry, HandymanWallet, ServiceCategory, WalletTransactionEntry } from '../types';
import { isMockEnv } from './bookingService';

// A finished job as the earnings screen sees it. COMPLETED means the work is
// done but the capture has not run, so it counts as pending; PAID is money the
// handyman has actually been credited.
interface EarningsRow {
  id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'COMPLETED' | 'PAID';
  updated_at: string;
  services?: { category: string } | null;
  client?: { full_name: string | null } | null;
  // payments.booking_id is UNIQUE, so PostgREST resolves this as a to-one
  // relation and returns an object rather than an array.
  payment?: { captured_at: string | null } | null;
}

interface WalletTxRow {
  id: string;
  booking_id: string | null;
  tx_type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  created_at: string;
}

// Payouts are released once the balance clears this; the number is a product
// rule, not a stored column.
const MINIMUM_PAYOUT_THRESHOLD = 1500;

const EARNINGS_SELECT =
  'id, amount, platform_fee, net_amount, status, updated_at, ' +
  'services!service_id(category), client:users!client_id(full_name), ' +
  'payment:payments(captured_at)';

function mapEarningsRow(row: EarningsRow): EarningsEntry {
  const capturedAt = row.payment?.captured_at ?? null;

  return {
    id: row.id,
    bookingId: row.id,
    clientName: row.client?.full_name ?? '',
    serviceCategory: (row.services?.category ?? 'General Handyman') as ServiceCategory,
    grossAmount: Number(row.amount),
    platformFee: Number(row.platform_fee),
    netEarnings: Number(row.net_amount),
    status: row.status === 'PAID' ? 'Completed' : 'Pending',
    // Earnings are dated by when the money moved, falling back to the last
    // status change for a job that is done but not captured yet.
    date: capturedAt ?? row.updated_at,
  };
}

/**
 * Every finished job for the signed-in handyman.
 *
 * RLS scopes `bookings` to the assigned handyman, so no explicit handyman_id
 * filter is needed — but one is applied anyway so an admin hitting this screen
 * does not see the whole platform's jobs as their own earnings.
 */
export async function fetchEarnings(): Promise<EarningsEntry[]> {
  if (isMockEnv()) {
    const { MOCK_EARNINGS } = await import('../mocks');
    return MOCK_EARNINGS;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select(EARNINGS_SELECT)
    .eq('handyman_id', userId)
    .in('status', ['COMPLETED', 'PAID'])
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch earnings: ${error.message}`);
  return (data ?? []).map((row) => mapEarningsRow(row as unknown as EarningsRow));
}

function mapWalletTxRow(row: WalletTxRow): WalletTransactionEntry {
  return {
    id: row.id,
    bookingReference: row.booking_id ? `#OKI-${row.booking_id.slice(0, 8).toUpperCase()}` : '—',
    type: row.tx_type === 'CREDIT' ? 'Credit' : 'Debit',
    description: row.description,
    amount: Number(row.amount),
    createdAt: row.created_at,
  };
}

/**
 * Wallet state for the signed-in handyman.
 *
 * availableBalance is the authoritative `handymen.wallet_balance`, which the
 * payment webhook maintains. pendingBalance is derived: net payout on jobs that
 * are COMPLETED but whose payment has not been captured.
 */
export async function fetchWallet(): Promise<HandymanWallet> {
  if (isMockEnv()) {
    const { MOCK_HANDYMAN_WALLET } = await import('../mocks');
    return MOCK_HANDYMAN_WALLET;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    return {
      availableBalance: 0,
      pendingBalance: 0,
      minimumPayoutThreshold: MINIMUM_PAYOUT_THRESHOLD,
      payoutStage: 'Requested',
      transactions: [],
    };
  }

  const [walletResult, pendingResult, txResult] = await Promise.all([
    supabase.from('handymen').select('wallet_balance').eq('id', userId).maybeSingle(),
    supabase
      .from('bookings')
      .select('net_amount')
      .eq('handyman_id', userId)
      .eq('status', 'COMPLETED'),
    supabase
      .from('wallet_transactions')
      .select('id, booking_id, tx_type, amount, description, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (walletResult.error) throw new Error(`Failed to fetch wallet: ${walletResult.error.message}`);

  const availableBalance = Number(walletResult.data?.wallet_balance ?? 0);
  const pendingBalance = (pendingResult.data ?? []).reduce(
    (sum, row: { net_amount: number }) => sum + Number(row.net_amount),
    0
  );

  return {
    availableBalance,
    pendingBalance,
    minimumPayoutThreshold: MINIMUM_PAYOUT_THRESHOLD,
    // No payout request table exists yet, so the stage is inferred from whether
    // the balance has cleared the threshold.
    payoutStage: availableBalance >= MINIMUM_PAYOUT_THRESHOLD ? 'Processing' : 'Requested',
    transactions: (txResult.data ?? []).map((row) => mapWalletTxRow(row as WalletTxRow)),
  };
}
