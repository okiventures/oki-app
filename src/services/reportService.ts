import { supabase } from '../lib/supabase';
import { ReportReason, ReportStatus, UserReport } from '../types';
import { isMockEnv } from './bookingService';

// A report in the UI is a row in `disputes`. The table has no target column —
// the reported party is whichever side of the booking the reporter is not — so
// the booking is joined in to resolve both names.
interface DisputeRow {
  id: string;
  booking_id: string;
  reporter_id: string;
  issue_type: string;
  description: string;
  status: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  booking?: {
    client_id: string;
    handyman_id: string | null;
    client: { full_name: string | null } | null;
    handyman: { user: { full_name: string | null } | null } | null;
  } | null;
  reporter?: { full_name: string | null } | null;
}

export interface SubmitReportInput {
  bookingId: string;
  reason: ReportReason;
  description: string;
}

// dispute_status is the DB vocabulary; ReportStatus is the UI's. CLOSED maps to
// Dismissed because a closed-without-resolution dispute is what the reports
// list calls dismissed.
const DB_STATUS_TO_REPORT: Record<string, ReportStatus> = {
  OPEN: ReportStatus.Pending,
  IN_REVIEW: ReportStatus.Reviewed,
  RESOLVED: ReportStatus.Resolved,
  CLOSED: ReportStatus.Dismissed,
};

// The handyman's name is two hops out: bookings.handyman_id references
// handymen(id), not users(id).
const DISPUTE_SELECT =
  '*, reporter:users!reporter_id(full_name), ' +
  'booking:bookings!booking_id(client_id, handyman_id, ' +
  'client:users!client_id(full_name), handyman:handymen!handyman_id(user:users!id(full_name)))';

function mapDisputeRow(row: DisputeRow): UserReport {
  const booking = row.booking;
  const reporterIsClient = booking ? booking.client_id === row.reporter_id : true;

  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter?.full_name ?? '',
    reporterType: reporterIsClient ? 'client' : 'handyman',
    targetId: (reporterIsClient ? booking?.handyman_id : booking?.client_id) ?? '',
    targetName:
      (reporterIsClient ? booking?.handyman?.user?.full_name : booking?.client?.full_name) ?? '',
    bookingId: row.booking_id,
    reason: row.issue_type as ReportReason,
    description: row.description,
    status: DB_STATUS_TO_REPORT[row.status] ?? ReportStatus.Pending,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Reports the signed-in user filed, newest first. */
export async function fetchMyReports(): Promise<UserReport[]> {
  if (isMockEnv()) {
    const { MOCK_REPORTS } = await import('../mocks/reports');
    return MOCK_REPORTS;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('disputes')
    .select(DISPUTE_SELECT)
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return (data ?? []).map((row) => mapDisputeRow(row as unknown as DisputeRow));
}

/** One report by id, or null if it is not visible to the signed-in user. */
export async function fetchReport(reportId: string): Promise<UserReport | null> {
  if (isMockEnv()) {
    const { getReportById } = await import('../mocks/reports');
    return getReportById(reportId) ?? null;
  }

  const { data, error } = await supabase
    .from('disputes')
    .select(DISPUTE_SELECT)
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch report: ${error.message}`);
  return data ? mapDisputeRow(data as unknown as DisputeRow) : null;
}

/**
 * File a report against the other party on a booking.
 *
 * reporter_id comes from the session — disputes_insert_participant pins it to
 * auth.uid() and requires the caller to be on the booking, so a rejection means
 * the booking is not theirs.
 */
export async function submitReport(input: SubmitReportInput): Promise<UserReport> {
  if (isMockEnv()) {
    const { addReport } = await import('../mocks/reports');
    return addReport({
      reporterId: 'mock-reporter',
      reporterName: 'You',
      reporterType: 'client',
      targetId: '',
      targetName: '',
      bookingId: input.bookingId,
      reason: input.reason,
      description: input.description,
    });
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('You must be signed in to file a report.');

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      booking_id: input.bookingId,
      reporter_id: userId,
      issue_type: input.reason,
      description: input.description.trim(),
    })
    .select(DISPUTE_SELECT)
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error('You can only report a booking you were part of.');
    }
    throw new Error(`Failed to submit report: ${error.message}`);
  }

  return mapDisputeRow(data as unknown as DisputeRow);
}
