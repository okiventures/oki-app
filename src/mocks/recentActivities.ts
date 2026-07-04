export interface RecentActivity {
  id: string;
  serviceName: string;
  providerName: string;
  status: 'in_progress' | 'completed' | 'pending';
  time: string;
}

export const MOCK_RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: '1',
    serviceName: 'Plumbing Service',
    providerName: 'Ceferino Jumao-as V',
    status: 'in_progress',
    time: '2 hours ago',
  },
  {
    id: '2',
    serviceName: 'Electrical Repair',
    providerName: 'Maria Santos',
    status: 'completed',
    time: 'Yesterday',
  },
  {
    id: '3',
    serviceName: 'AC Installation',
    providerName: 'John Doe',
    status: 'pending',
    time: 'Tomorrow',
  },
];
