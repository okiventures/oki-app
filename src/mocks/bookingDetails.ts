import { BookingStatus, BookingType, ServiceCategory } from '../types';

export interface TimelineEvent {
  id: string;
  status: BookingStatus;
  label: string;
  description: string;
  timestamp: string | null; // null = future/pending
}

export interface OrderDetail {
  label: string;
  value: string;
}

export interface BookingDetail {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  handymanId: string;
  handymanName: string;
  handymanPhotoUrl?: string;
  handymanRating: number;
  handymanJobsCompleted: number;
  serviceCategory: ServiceCategory;
  bookingType: BookingType;
  status: BookingStatus;
  description: string;
  location: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  amount: number;
  platformFee: number;
  netAmount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  photos?: string[];
  paymentMethod: 'GCash' | 'Credit Card' | 'Cash' | 'Maya';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | 'Failed';
  paymentRef?: string;
  paidAt?: string;
  notes?: string;
  orderDetails: OrderDetail[];
  timeline: TimelineEvent[];
}

const now = Date.now();

export const MOCK_BOOKING_DETAILS: BookingDetail[] = [
  {
    id: 'b1',
    reference: '#OKI-B1',
    clientId: 'c1',
    clientName: 'Ishah Bautista',
    handymanId: 'h1',
    handymanName: 'Ceferino Jumao-as V',
    handymanPhotoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Ceferino',
    handymanRating: 4.9,
    handymanJobsCompleted: 318,
    serviceCategory: ServiceCategory.Plumbing,
    bookingType: BookingType.OnDemand,
    status: BookingStatus.WorkStarted,
    description: 'Fix leaking pipe under the kitchen sink.',
    location: 'Cebu City',
    fullAddress: '123 Mango Avenue, Cebu City, 6000 Cebu',
    latitude: 10.3157,
    longitude: 123.8854,
    amount: 150,
    platformFee: 15,
    netAmount: 135,
    scheduledAt: new Date(now - 3600000).toISOString(),
    createdAt: new Date(now - 3600000).toISOString(),
    updatedAt: new Date(now - 1800000).toISOString(),
    paymentMethod: 'GCash',
    paymentStatus: 'Pending',
    paymentRef: undefined,
    paidAt: undefined,
    notes: 'Sink has been dripping for 3 days. Water is shut off at the valve.',
    orderDetails: [
      { label: 'Service Type', value: 'Plumbing — On Demand' },
      { label: 'Duration', value: 'Est. 1–2 hours' },
      { label: 'Base Rate', value: '₱150.00' },
      { label: 'Platform Fee (5%)', value: '₱7.50' },
      { label: 'Total Charged', value: '₱157.50' },
    ],
    timeline: [
      {
        id: 't1',
        status: BookingStatus.Pending,
        label: 'Booking Placed',
        description: 'Your request was submitted and is being matched.',
        timestamp: new Date(now - 3600000).toISOString(),
      },
      {
        id: 't2',
        status: BookingStatus.Accepted,
        label: 'Accepted by Worker',
        description: 'Ceferino Jumao-as V accepted your booking.',
        timestamp: new Date(now - 3300000).toISOString(),
      },
      {
        id: 't3',
        status: BookingStatus.InTransit,
        label: 'Worker In Transit',
        description: 'Ceferino is on his way to your location.',
        timestamp: new Date(now - 2700000).toISOString(),
      },
      {
        id: 't4',
        status: BookingStatus.Arrived,
        label: 'Worker Arrived',
        description: 'Ceferino has arrived at your address.',
        timestamp: new Date(now - 2400000).toISOString(),
      },
      {
        id: 't5',
        status: BookingStatus.WorkStarted,
        label: 'Work In Progress',
        description: 'Fixing the leaking pipe under the kitchen sink.',
        timestamp: new Date(now - 1800000).toISOString(),
      },
      {
        id: 't6',
        status: BookingStatus.Completed,
        label: 'Work Completed',
        description: 'Service has been completed successfully.',
        timestamp: null,
      },
      {
        id: 't7',
        status: BookingStatus.Paid,
        label: 'Payment Released',
        description: 'Payment released to worker via GCash.',
        timestamp: null,
      },
    ],
  },
  {
    id: 'b2',
    reference: '#OKI-B2',
    clientId: 'c1',
    clientName: 'Ishah Bautista',
    handymanId: 'h2',
    handymanName: 'James Ty',
    handymanPhotoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=James',
    handymanRating: 4.7,
    handymanJobsCompleted: 204,
    serviceCategory: ServiceCategory.Painting,
    bookingType: BookingType.Scheduled,
    status: BookingStatus.Paid,
    description: 'Paint the living room walls. Color provided by client.',
    location: 'Cebu City',
    fullAddress: '123 Mango Avenue, Cebu City, 6000 Cebu',
    latitude: 10.3157,
    longitude: 123.8854,
    amount: 450,
    platformFee: 45,
    netAmount: 405,
    scheduledAt: new Date(now - 86400000 * 3).toISOString(),
    createdAt: new Date(now - 86400000 * 5).toISOString(),
    updatedAt: new Date(now - 86400000 * 2).toISOString(),
    paymentMethod: 'Credit Card',
    paymentStatus: 'Paid',
    paymentRef: 'TXN-9A3F2C',
    paidAt: new Date(now - 86400000 * 2).toISOString(),
    notes: 'Color is Dulux "Pure Brilliant White". Two coats needed. Furniture already moved.',
    orderDetails: [
      { label: 'Service Type', value: 'Painting — Scheduled' },
      { label: 'Duration', value: 'Est. 4–6 hours' },
      { label: 'Base Rate', value: '₱450.00' },
      { label: 'Platform Fee (5%)', value: '₱45.00' },
      { label: 'Total Charged', value: '₱450.00' },
    ],
    timeline: [
      {
        id: 't1',
        status: BookingStatus.Pending,
        label: 'Booking Placed',
        description: 'Your request was submitted and is being matched.',
        timestamp: new Date(now - 86400000 * 5).toISOString(),
      },
      {
        id: 't2',
        status: BookingStatus.Accepted,
        label: 'Accepted by Worker',
        description: 'James Ty accepted your scheduled booking.',
        timestamp: new Date(now - 86400000 * 4.5).toISOString(),
      },
      {
        id: 't3',
        status: BookingStatus.InTransit,
        label: 'Worker In Transit',
        description: 'James is on his way to your location.',
        timestamp: new Date(now - 86400000 * 3.1).toISOString(),
      },
      {
        id: 't4',
        status: BookingStatus.Arrived,
        label: 'Worker Arrived',
        description: 'James has arrived at your address.',
        timestamp: new Date(now - 86400000 * 3.05).toISOString(),
      },
      {
        id: 't5',
        status: BookingStatus.WorkStarted,
        label: 'Work In Progress',
        description: 'Painting the living room walls.',
        timestamp: new Date(now - 86400000 * 3).toISOString(),
      },
      {
        id: 't6',
        status: BookingStatus.Completed,
        label: 'Work Completed',
        description: 'Living room walls painted successfully.',
        timestamp: new Date(now - 86400000 * 2.5).toISOString(),
      },
      {
        id: 't7',
        status: BookingStatus.Paid,
        label: 'Payment Released',
        description: 'Payment of ₱405 released to James Ty.',
        timestamp: new Date(now - 86400000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'b3',
    reference: '#OKI-B3',
    clientId: 'c2',
    clientName: 'Kyle Lee',
    handymanId: 'h1',
    handymanName: 'Ceferino Jumao-as V',
    handymanPhotoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Ceferino',
    handymanRating: 4.9,
    handymanJobsCompleted: 318,
    serviceCategory: ServiceCategory.Electrical,
    bookingType: BookingType.Scheduled,
    status: BookingStatus.Pending,
    description: 'Install new ceiling fan in bedroom.',
    location: 'Cebu City',
    fullAddress: '45 Escario Street, Cebu City, 6000 Cebu',
    latitude: 10.3221,
    longitude: 123.8997,
    amount: 120,
    platformFee: 12,
    netAmount: 108,
    scheduledAt: new Date(now + 86400000 * 2).toISOString(),
    createdAt: new Date(now - 1800000).toISOString(),
    updatedAt: new Date(now - 1800000).toISOString(),
    paymentMethod: 'GCash',
    paymentStatus: 'Pending',
    notes: 'Fan is a Hanabishi 56-inch model, already unboxed. Ladder available on-site.',
    orderDetails: [
      { label: 'Service Type', value: 'Electrical — Scheduled' },
      { label: 'Duration', value: 'Est. 1 hour' },
      { label: 'Base Rate', value: '₱120.00' },
      { label: 'Platform Fee (5%)', value: '₱12.00' },
      { label: 'Total Charged', value: '₱120.00' },
    ],
    timeline: [
      {
        id: 't1',
        status: BookingStatus.Pending,
        label: 'Booking Placed',
        description: 'Your request was submitted and is awaiting worker confirmation.',
        timestamp: new Date(now - 1800000).toISOString(),
      },
      {
        id: 't2',
        status: BookingStatus.Accepted,
        label: 'Accepted by Worker',
        description: 'Waiting for a worker to accept.',
        timestamp: null,
      },
      {
        id: 't3',
        status: BookingStatus.InTransit,
        label: 'Worker In Transit',
        description: 'Worker will head to you on your scheduled date.',
        timestamp: null,
      },
      {
        id: 't4',
        status: BookingStatus.Arrived,
        label: 'Worker Arrived',
        description: 'Worker has arrived at your address.',
        timestamp: null,
      },
      {
        id: 't5',
        status: BookingStatus.WorkStarted,
        label: 'Work In Progress',
        description: 'Installing the ceiling fan.',
        timestamp: null,
      },
      {
        id: 't6',
        status: BookingStatus.Completed,
        label: 'Work Completed',
        description: 'Service has been completed.',
        timestamp: null,
      },
      {
        id: 't7',
        status: BookingStatus.Paid,
        label: 'Payment Released',
        description: 'Payment released to worker.',
        timestamp: null,
      },
    ],
  },
];
