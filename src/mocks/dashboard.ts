import { SERVICE_CATEGORY_COLORS } from '../constants/theme';

export interface PlatformStats {
  avgWorkerRating: string;
  jobsCompletedPct: string;
  avgResponseTime: string;
}

export const MOCK_PLATFORM_STATS: PlatformStats = {
  avgWorkerRating: '4.9',
  jobsCompletedPct: '98%',
  avgResponseTime: '8 min',
};

export type ActiveBookingStep = 'Confirmed' | 'On the way' | 'Working' | 'Done';

export interface ActiveBooking {
  id: string;
  reference: string;
  serviceName: string;
  estimatedCompletion: string;
  currentStep: ActiveBookingStep;
  workerInitials: string;
  workerName: string;
  workerRole: string;
}

export const MOCK_ACTIVE_BOOKING: ActiveBooking | null = {
  id: 'b1',
  reference: '#OKI-B1',
  serviceName: 'Plumbing',
  estimatedCompletion: '~30 min',
  currentStep: 'Working',
  workerInitials: 'CJ',
  workerName: 'Ceferino Jumao-as V',
  workerRole: 'Service Professional',
};

export interface DashboardCategory {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

export const MOCK_DASHBOARD_CATEGORIES: DashboardCategory[] = [
  {
    id: 'massage',
    name: 'Massage',
    icon: 'leaf-outline',
    iconColor: SERVICE_CATEGORY_COLORS.massage.icon,
    bgColor: SERVICE_CATEGORY_COLORS.massage.bg,
    borderColor: SERVICE_CATEGORY_COLORS.massage.border,
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'water-outline',
    iconColor: SERVICE_CATEGORY_COLORS.cleaning.icon,
    bgColor: SERVICE_CATEGORY_COLORS.cleaning.bg,
    borderColor: SERVICE_CATEGORY_COLORS.cleaning.border,
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline',
    iconColor: SERVICE_CATEGORY_COLORS.painting.icon,
    bgColor: SERVICE_CATEGORY_COLORS.painting.bg,
    borderColor: SERVICE_CATEGORY_COLORS.painting.border,
  },
  {
    id: 'more',
    name: 'More',
    icon: 'grid-outline',
    iconColor: SERVICE_CATEGORY_COLORS.more.icon,
    bgColor: SERVICE_CATEGORY_COLORS.more.bg,
    borderColor: SERVICE_CATEGORY_COLORS.more.border,
  },
];

export interface QuickBookMode {
  id: string;
  type: 'now' | 'later';
  title: string;
  description: string;
  startingPrice: number;
  accentColor: string;
  iconName: string;
}

export const MOCK_QUICK_BOOK_MODES: QuickBookMode[] = [
  {
    id: 'book-now',
    type: 'now',
    title: 'Book Now',
    description: 'A worker heads to you right away',
    startingPrice: 299,
    accentColor: '', // filled from theme at render time
    iconName: 'time-outline',
  },
  {
    id: 'book-later',
    type: 'later',
    title: 'Book Later',
    description: 'Schedule for a date and time',
    startingPrice: 199,
    accentColor: SERVICE_CATEGORY_COLORS.painting.icon, // purple accent for "schedule"
    iconName: 'calendar-outline',
  },
];

export interface PromoData {
  id: string;
  description: string;
  code: string;
  expiresLabel: string;
}

export const MOCK_PROMO: PromoData = {
  id: 'promo1',
  description: 'Get ₱100 off your first booking',
  code: 'OKIFIRST',
  expiresLabel: 'Expires Jun 30',
};

export interface RecentActivityRow {
  id: string;
  categoryId: string;
  serviceName: string;
  dateLabel: string;
  workerName: string;
  price: number;
  status: 'Completed' | 'Cancelled' | 'In Progress';
}

export const MOCK_RECENT_ACTIVITY_ROWS: RecentActivityRow[] = [
  {
    id: 'r1',
    categoryId: 'plumbing',
    serviceName: 'Leaking Pipe Repair',
    dateLabel: 'May 28',
    workerName: 'Ceferino Jumao-as V',
    price: 450,
    status: 'Completed',
  },
  {
    id: 'r2',
    categoryId: 'electrical',
    serviceName: 'Outlet Installation',
    dateLabel: 'May 25',
    workerName: 'James Ty',
    price: 380,
    status: 'Completed',
  },
  {
    id: 'r3',
    categoryId: 'cleaning',
    serviceName: 'Deep House Clean',
    dateLabel: 'May 20',
    workerName: 'Maria Santos',
    price: 800,
    status: 'Completed',
  },
];
