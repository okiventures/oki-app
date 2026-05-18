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
    clientName: 'Alice W.',
    handymanName: 'Tom K.',
    reason: 'Poor quality of work',
    status: 'Open',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'd2',
    bookingId: 'b88',
    clientName: 'Robert B.',
    handymanName: 'Mike Torres',
    reason: 'No show',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const MOCK_KYC_REQUESTS = [
  {
    id: 'kyc1',
    handymanName: 'Jake S.',
    serviceCategory: 'Roofing',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'Pending',
    riskScore: 'Low',
  },
  {
    id: 'kyc2',
    handymanName: 'Maria L.',
    serviceCategory: 'Cleaning',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'Pending',
    riskScore: 'Medium',
  },
];
