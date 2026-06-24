import { DisputeStatus, KycStatus, UserStatus } from '../types';

export const MOCK_ADMIN_STATS = {
  activeUsers: 12450,
  activeUsersGrowth: '+12%',
  totalRevenue: 285400,
  revenueGrowth: '+8.5%',
  activeDisputes: 14,
  disputesChange: '-2',
  pendingKYC: 38,
};

export const MOCK_ADMIN_CHART_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  revenue: [1200, 1900, 1500, 2200, 2800, 3500, 3100],
  bookings: [45, 62, 55, 78, 110, 145, 130],
};

export const MOCK_DISPUTES = [
  {
    id: 'd1',
    bookingId: 'b45',
    clientName: 'Princess Jaena',
    handymanName: 'Kyle Lee',
    reason: 'Poor quality of work',
    status: DisputeStatus.Open,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'd2',
    bookingId: 'b88',
    clientName: 'Kyle Lee',
    handymanName: 'Ceferino Jumao-as V',
    reason: 'No show',
    status: DisputeStatus.InReview,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const MOCK_ADMIN_USERS = [
  {
    id: 'u1',
    name: 'Ishah Bautista',
    email: 'ishah@example.com',
    phone: '+63 912 345 6789',
    userType: 'client',
    status: UserStatus.Active,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'u2',
    name: 'James Ty',
    email: 'james@example.com',
    phone: '+63 915 987 6543',
    userType: 'handyman',
    status: UserStatus.Active,
    createdAt: new Date(Date.now() - 86400000 * 28).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'u3',
    name: 'Mara Sy',
    email: 'mara@example.com',
    phone: '+63 923 123 4567',
    userType: 'client',
    status: UserStatus.Suspended,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    lastActive: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'u4',
    name: 'Kyle Lee',
    email: 'kyle@example.com',
    phone: '+63 917 222 3344',
    userType: 'handyman',
    status: UserStatus.Active,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastActive: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
  },
];

export const MOCK_TRANSACTIONS = [
  {
    id: 't1',
    bookingId: 'b1',
    clientName: 'Ishah Bautista',
    handymanName: 'Ceferino Jumao-as V',
    amount: 150,
    platformFee: 15,
    netAmount: 135,
    status: 'Captured',
    paymentMethod: 'Card',
    authorizedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    capturedAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    settledAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 't2',
    bookingId: 'b2',
    clientName: 'Ishah Bautista',
    handymanName: 'James Ty',
    amount: 450,
    platformFee: 45,
    netAmount: 405,
    status: 'Authorized',
    paymentMethod: 'Gcash',
    authorizedAt: new Date(Date.now() - 86400000).toISOString(),
    capturedAt: undefined,
    settledAt: undefined,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 't3',
    bookingId: 'b3',
    clientName: 'Kyle Lee',
    handymanName: 'James Ty',
    amount: 120,
    platformFee: 12,
    netAmount: 108,
    status: 'Refunded',
    paymentMethod: 'Card',
    authorizedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    capturedAt: new Date(Date.now() - 86400000 * 3 + 3600000).toISOString(),
    settledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const MOCK_ADMIN_FEED = [
  {
    id: 'a1',
    title: 'New KYC request received',
    description: 'James Ty submitted a roofing ID verification request.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'a2',
    title: 'Dispute opened for booking b88',
    description: 'Handyman no-show reported by client Kyle Lee.',
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'a3',
    title: 'Booking b2 completed',
    description: 'Payment captured successfully for 4/27 completed service.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
];

export const MOCK_KYC_REQUESTS = [
  {
    id: 'kyc1',
    handymanName: 'James Ty',
    serviceCategory: 'Roofing',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: KycStatus.Pending,
    riskScore: 'Low',
  },
  {
    id: 'kyc2',
    handymanName: 'Princess Jaena',
    serviceCategory: 'Cleaning',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: KycStatus.Pending,
    riskScore: 'Medium',
  },
];
