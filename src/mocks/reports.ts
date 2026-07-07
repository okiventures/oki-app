import { UserReport, ReportStatus } from '../types';

const now = Date.now();

export const MOCK_REPORTS: UserReport[] = [
  {
    id: 'rpt-001',
    reporterId: 'c1',
    reporterName: 'Ishah Bautista',
    reporterType: 'client',
    targetId: 'h1',
    targetName: 'Ceferino Jumao-as V',
    bookingId: 'b1',
    reason: 'Incomplete Job',
    description:
      'The handyman fixed the main leak but left a secondary drip under the sink. I had to call someone else to finish it.',
    status: ReportStatus.Resolved,
    createdAt: new Date(now - 86400000 * 14).toISOString(),
    updatedAt: new Date(now - 86400000 * 10).toISOString(),
  },
  {
    id: 'rpt-002',
    reporterId: 'h1',
    reporterName: 'Ceferino Jumao-as V',
    reporterType: 'handyman',
    targetId: 'c2',
    targetName: 'Maria Santos',
    bookingId: 'b3',
    reason: 'No Show',
    description: 'Client booked a 9 AM slot but never showed up and was unreachable by phone.',
    status: ReportStatus.Pending,
    createdAt: new Date(now - 86400000 * 3).toISOString(),
    updatedAt: new Date(now - 86400000 * 3).toISOString(),
  },
  {
    id: 'rpt-003',
    reporterId: 'c1',
    reporterName: 'Ishah Bautista',
    reporterType: 'client',
    targetId: 'h2',
    targetName: 'Juan dela Cruz',
    bookingId: 'b2',
    reason: 'Unprofessional Conduct',
    description: 'Arrived 2 hours late without notice and was rude when asked about the delay.',
    status: ReportStatus.Reviewed,
    createdAt: new Date(now - 86400000 * 7).toISOString(),
    updatedAt: new Date(now - 86400000 * 5).toISOString(),
  },
];

export function getReportsByUser(userId: string): UserReport[] {
  return MOCK_REPORTS.filter((r) => r.reporterId === userId);
}

export function getReportById(id: string): UserReport | undefined {
  return MOCK_REPORTS.find((r) => r.id === id);
}
