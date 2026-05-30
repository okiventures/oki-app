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
  id: 'ab1',
  reference: '#OKI-20503',
  serviceName: 'Plumbing Repair',
  estimatedCompletion: '~30 min',
  currentStep: 'Working',
  workerInitials: 'CJ',
  workerName: 'Ceferino Jumao-as V',
  workerRole: 'Licensed Plumber',
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
    iconColor: '#10B981',
    bgColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'water-outline',
    iconColor: '#3B82F6',
    bgColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline',
    iconColor: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  {
    id: 'more',
    name: 'More',
    icon: 'grid-outline',
    iconColor: '#6B7280',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
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
    accentColor: '',
    iconName: 'time-outline',
  },
  {
    id: 'book-later',
    type: 'later',
    title: 'Book Later',
    description: 'Schedule for a date and time',
    startingPrice: 199,
    accentColor: '#7C3AED',
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
