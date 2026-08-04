import { ViewStyle } from 'react-native';

export const SHADOW: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
};

/**
 * Semantic status colors for inline (JS) styling. Mirror of the
 * `--color-success/danger/warning/info` tokens in `global.css` — keep in sync.
 */
export const SEMANTIC_COLORS = {
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export const LAYOUT = {
  /** Matches Tailwind `px-4`. */
  screenPadding: 16,
  /** Matches Tailwind `rounded-2xl`. */
  cardRadius: 16,
} as const;
