import { JobCardData, BookingType, ServiceCategory } from '../types';

export const MOCK_AVAILABLE_JOBS: JobCardData[] = [
  {
    id: 'j1',
    serviceCategory: ServiceCategory.Plumbing,
    bookingType: BookingType.OnDemand,
    estimatedPay: 120,
    location: '123 Main St, Apt 4B',
    distance: '1.2 km',
    description: 'Kitchen sink is leaking underneath. Needs urgent fixing before it damages the cabinet.',
    clientName: 'Princess Jaena',
    clientRating: 4.9,
  },
  {
    id: 'j2',
    serviceCategory: ServiceCategory.Electrical,
    bookingType: BookingType.Scheduled,
    estimatedPay: 85,
    location: '456 Oak Avenue',
    distance: '3.5 km',
    description: 'Install two new ceiling fans in the living room and master bedroom. Wiring is already present.',
    clientName: 'Kyle Lee',
    clientRating: 4.7,
  },
  {
    id: 'j3',
    serviceCategory: ServiceCategory.General,
    bookingType: BookingType.OnDemand,
    estimatedPay: 50,
    location: '789 Pine Road',
    distance: '2.1 km',
    description: 'Need help mounting a 65-inch TV on a drywall. I have the mount but need tools and expertise.',
    clientName: 'James Ty',
    clientRating: 5.0,
  }
];
