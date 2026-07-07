import type { ReportStatus } from '../types';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  Pending: 'Pending',
  Reviewed: 'Reviewed',
  Resolved: 'Resolved',
  Dismissed: 'Dismissed',
};

export const REPORT_STATUS_VARIANTS: Record<
  ReportStatus,
  'warning' | 'status' | 'success' | 'error'
> = {
  Pending: 'warning',
  Reviewed: 'status',
  Resolved: 'success',
  Dismissed: 'error',
};
