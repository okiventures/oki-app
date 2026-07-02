export function formatCurrency(amount: number, currency = '₱'): string {
  return `${currency}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return 'N/A';
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}
