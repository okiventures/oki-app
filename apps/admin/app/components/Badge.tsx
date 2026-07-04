type BadgeVariant =
  | 'verified'
  | 'online'
  | 'offline'
  | 'tier'
  | 'status'
  | 'count'
  | 'primary'
  | 'warning'
  | 'error'
  | 'success';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  text?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  verified: 'bg-blue-100 text-blue-700',
  online: 'bg-green-100 text-green-700',
  offline: 'bg-gray-100 text-gray-500',
  tier: 'bg-amber-100 text-amber-800',
  status: 'bg-purple-100 text-purple-700',
  count: 'bg-red-100 text-red-700',
  primary: 'bg-primary-100 text-primary-700',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
};

export function Badge({ variant, label, text }: BadgeProps) {
  const displayText = text || label || '';
  return (
    <span
      className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${VARIANT_CLASSES[variant]}`}>
      {displayText}
    </span>
  );
}
