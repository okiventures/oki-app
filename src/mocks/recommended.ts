export interface RecommendedService {
  id: string;
  title: string;
  price: string;
  icon: string;
  color: string;
  description: string;
}

export const MOCK_RECOMMENDED_SERVICES: RecommendedService[] = [
  {
    id: '1',
    title: 'AC Cleaning',
    price: '800',
    icon: 'thermometer-outline',
    color: '#EF4444',
    description: 'Deep clean your air conditioner',
  },
  {
    id: '2',
    title: 'Refrigerator Repair',
    price: '1200',
    icon: 'snowflake-outline',
    color: '#3B82F6',
    description: 'Fix cooling issues',
  },
  {
    id: '3',
    title: 'Washing Machine Repair',
    price: '900',
    icon: 'washing-machine-outline',
    color: '#10B981',
    description: 'Spin cycle and drainage fixes',
  },
];
