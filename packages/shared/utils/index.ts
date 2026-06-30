export function formatCurrency(amount: number, currency = '₱'): string {
  return `${currency}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function formatBookingStatus(status: string): string {
  const labels: Record<string, string> = {
    Pending: 'Pending',
    Accepted: 'Accepted',
    InTransit: 'In Transit',
    Arrived: 'Arrived',
    WorkStarted: 'Work Started',
    Completed: 'Completed',
    Paid: 'Paid',
    Cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

export function formatTransactionStatus(status: string): string {
  const labels: Record<string, string> = {
    Authorized: 'Authorized',
    Captured: 'Captured',
    Failed: 'Failed',
    Refunded: 'Refunded',
  };
  return labels[status] ?? status;
}
