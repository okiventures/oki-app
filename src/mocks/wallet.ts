import { HandymanWallet } from '../types';

export const MOCK_HANDYMAN_WALLET: HandymanWallet = {
  availableBalance: 1240.5,
  pendingBalance: 615.0,
  minimumPayoutThreshold: 1500,
  payoutStage: 'Processing',
  transactions: [
    {
      id: 'wtx-001',
      bookingReference: 'BK-2026-3019',
      type: 'Credit',
      description: 'Pipe leak repair payout',
      amount: 850,
      createdAt: '2026-05-30T09:30:00Z',
    },
    {
      id: 'wtx-002',
      bookingReference: 'BK-2026-3004',
      type: 'Debit',
      description: 'Platform fee adjustment',
      amount: 120,
      createdAt: '2026-05-29T05:45:00Z',
    },
    {
      id: 'wtx-003',
      bookingReference: 'BK-2026-2991',
      type: 'Credit',
      description: 'Electrical rewiring payout',
      amount: 1425,
      createdAt: '2026-05-27T07:20:00Z',
    },
    {
      id: 'wtx-004',
      bookingReference: 'BK-2026-2985',
      type: 'Debit',
      description: 'Manual payout to bank account',
      amount: 1000,
      createdAt: '2026-05-25T03:15:00Z',
    },
  ],
};
