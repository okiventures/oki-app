import { supabase } from '../lib/supabase';
import { Transaction, TransactionStatus } from '../types';
import { isMockEnv } from './bookingService';

interface PaymentRow {
  id: string;
  booking_id: string;
  status: string;
  amount_authorized: number;
  amount_captured: number | null;
  payment_method: string | null;
  authorized_at: string | null;
  captured_at: string | null;
  created_at: string;
  booking?: {
    platform_fee: number;
    net_amount: number;
    client: { full_name: string | null } | null;
    handyman: { user: { full_name: string | null } | null } | null;
  } | null;
}

export interface AdminMetrics {
  totalRevenue: number;
  revenueGrowth: string;
  activeUsersGrowth: string;
  chart: {
    labels: string[];
    bookings: number[];
    revenue: number[];
  };
}

export interface AdminActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const DB_PAYMENT_STATUS_TO_UI: Record<string, TransactionStatus> = {
  AUTHORIZED: TransactionStatus.Authorized,
  CAPTURED: TransactionStatus.Captured,
  FAILED: TransactionStatus.Failed,
  REFUNDED: TransactionStatus.Refunded,
};

// bookings.handyman_id references handymen(id), so the display name is two hops
// out: payments → bookings → handymen → users.
const PAYMENT_SELECT =
  '*, booking:bookings!booking_id(platform_fee, net_amount, ' +
  'client:users!client_id(full_name), handyman:handymen!handyman_id(user:users!id(full_name)))';

function mapPaymentRow(row: PaymentRow): Transaction {
  const captured = row.amount_captured === null ? null : Number(row.amount_captured);

  return {
    id: row.id,
    bookingId: row.booking_id,
    clientName: row.booking?.client?.full_name ?? '',
    handymanName: row.booking?.handyman?.user?.full_name ?? '',
    amount: captured ?? Number(row.amount_authorized),
    platformFee: Number(row.booking?.platform_fee ?? 0),
    netAmount: Number(row.booking?.net_amount ?? 0),
    status: DB_PAYMENT_STATUS_TO_UI[row.status] ?? TransactionStatus.Authorized,
    paymentMethod: row.payment_method ?? 'Unknown',
    authorizedAt: row.authorized_at ?? undefined,
    capturedAt: row.captured_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Every payment on the platform. RLS lets only admins past the client filter. */
export async function fetchAdminTransactions(): Promise<Transaction[]> {
  if (isMockEnv()) {
    const { MOCK_TRANSACTIONS } = await import('../mocks');
    // The mock literal widens `status` to string; the shape is otherwise exact.
    return MOCK_TRANSACTIONS as Transaction[];
  }

  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
  return (data ?? []).map((row) => mapPaymentRow(row as unknown as PaymentRow));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function growthLabel(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'new' : '—';
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

/**
 * Headline numbers and the 7-day chart.
 *
 * Bucketing happens client-side over a bounded window rather than in SQL — at
 * pilot volume that is a few hundred rows. If this platform grows, the whole
 * thing belongs in an admin-only aggregate RPC instead of three round trips.
 */
export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  if (isMockEnv()) {
    const { MOCK_ADMIN_STATS, MOCK_ADMIN_CHART_DATA } = await import('../mocks');
    return {
      totalRevenue: MOCK_ADMIN_STATS.totalRevenue,
      revenueGrowth: MOCK_ADMIN_STATS.revenueGrowth,
      activeUsersGrowth: MOCK_ADMIN_STATS.activeUsersGrowth,
      chart: MOCK_ADMIN_CHART_DATA,
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const [capturedResult, recentBookingsResult, recentUsersResult, priorUsersResult] =
    await Promise.all([
      supabase
        .from('payments')
        .select('amount_captured, captured_at')
        .eq('status', 'CAPTURED')
        .gte('captured_at', sixtyDaysAgo.toISOString()),
      supabase.from('bookings').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString()),
    ]);

  if (capturedResult.error) {
    throw new Error(`Failed to fetch revenue: ${capturedResult.error.message}`);
  }

  const captured = (capturedResult.data ?? []) as {
    amount_captured: number | null;
    captured_at: string | null;
  }[];

  let revenueLast30 = 0;
  let revenuePrior30 = 0;
  const revenueByDay = new Map<string, number>();

  for (const payment of captured) {
    if (!payment.captured_at) continue;
    const amount = Number(payment.amount_captured ?? 0);
    const at = new Date(payment.captured_at);

    if (at >= thirtyDaysAgo) revenueLast30 += amount;
    else revenuePrior30 += amount;

    if (at >= sevenDaysAgo) {
      const key = dayKey(at);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + amount);
    }
  }

  const bookingsByDay = new Map<string, number>();
  for (const booking of (recentBookingsResult.data ?? []) as { created_at: string }[]) {
    const key = dayKey(new Date(booking.created_at));
    bookingsByDay.set(key, (bookingsByDay.get(key) ?? 0) + 1);
  }

  // Fill the whole window so a quiet day renders as zero rather than shifting
  // the axis.
  const labels: string[] = [];
  const bookings: number[] = [];
  const revenue: number[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(now.getTime() - offset * 86400000);
    const key = dayKey(day);
    labels.push(day.toLocaleDateString('en-PH', { weekday: 'short' }));
    bookings.push(bookingsByDay.get(key) ?? 0);
    revenue.push(Math.round(revenueByDay.get(key) ?? 0));
  }

  return {
    // Lifetime revenue is not available from a 60-day window, so this is the
    // platform's captured revenue over that window — which is what the tile's
    // growth figure is comparing anyway.
    totalRevenue: revenueLast30 + revenuePrior30,
    revenueGrowth: growthLabel(revenueLast30, revenuePrior30),
    activeUsersGrowth: growthLabel(recentUsersResult.count ?? 0, priorUsersResult.count ?? 0),
    chart: { labels, bookings, revenue },
  };
}

/**
 * Recent platform activity, newest first.
 *
 * Built from the booking event trail plus filed disputes — the two things an
 * admin needs to notice. booking_events_select_participant grants admins the
 * whole table.
 */
export async function fetchAdminActivity(): Promise<AdminActivityItem[]> {
  if (isMockEnv()) {
    const { MOCK_ADMIN_FEED } = await import('../mocks');
    return MOCK_ADMIN_FEED;
  }

  const [eventsResult, disputesResult] = await Promise.all([
    supabase
      .from('booking_events')
      .select('id, booking_id, to_status, metadata, created_at, actor:users!actor_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('disputes')
      .select(
        'id, booking_id, issue_type, status, created_at, reporter:users!reporter_id(full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const items: AdminActivityItem[] = [];

  for (const event of (eventsResult.data ?? []) as any[]) {
    const action = (event.metadata?.action as string) ?? event.to_status;
    items.push({
      id: `event-${event.id}`,
      title: `Booking ${action.toLowerCase().replace(/_/g, ' ')}`,
      description: `${event.actor?.full_name ?? 'System'} moved #OKI-${String(event.booking_id)
        .slice(0, 8)
        .toUpperCase()} to ${event.to_status}.`,
      createdAt: event.created_at,
    });
  }

  for (const dispute of (disputesResult.data ?? []) as any[]) {
    items.push({
      id: `dispute-${dispute.id}`,
      title: `Dispute ${dispute.status.toLowerCase().replace(/_/g, ' ')}`,
      description: `${dispute.reporter?.full_name ?? 'Someone'} reported "${
        dispute.issue_type
      }" on #OKI-${String(dispute.booking_id).slice(0, 8).toUpperCase()}.`,
      createdAt: dispute.created_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);
}
