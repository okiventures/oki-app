import { SERVICE_CATEGORY_COLORS } from '../constants/theme';

export const MOCK_CATEGORIES = [
  { name: 'Plumbing', icon: 'water-outline', color: SERVICE_CATEGORY_COLORS['Plumbing'].icon, bg: SERVICE_CATEGORY_COLORS['Plumbing'].bg },
  { name: 'Electrical', icon: 'flash-outline', color: SERVICE_CATEGORY_COLORS['Electrical'].icon, bg: SERVICE_CATEGORY_COLORS['Electrical'].bg },
  { name: 'Massage', icon: 'leaf-outline', color: SERVICE_CATEGORY_COLORS.massage.icon, bg: SERVICE_CATEGORY_COLORS.massage.bg },
  { name: 'Painting', icon: 'color-palette-outline', color: SERVICE_CATEGORY_COLORS.painting.icon, bg: SERVICE_CATEGORY_COLORS.painting.bg },
  { name: 'Carpentry', icon: 'hammer-outline', color: SERVICE_CATEGORY_COLORS['Carpentry'].icon, bg: SERVICE_CATEGORY_COLORS['Carpentry'].bg },
  { name: 'Home Services', icon: 'home-outline', color: SERVICE_CATEGORY_COLORS.more.icon, bg: SERVICE_CATEGORY_COLORS.more.bg },
];

export const MOCK_POPULAR_SERVICES = [
  { id: '1', title: 'Leaky Faucet', price: '400', icon: 'water', color: SERVICE_CATEGORY_COLORS['Plumbing'].icon },
  { id: '2', title: 'Light Fix', price: '350', icon: 'flash', color: SERVICE_CATEGORY_COLORS['Electrical'].icon },
];
