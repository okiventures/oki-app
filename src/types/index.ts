export type UserType = 'client' | 'handyman' | 'admin';

export type ColorScheme = 'crimson' | 'teal' | 'indigo';

export enum BookingStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  InTransit = 'InTransit',
  Arrived = 'Arrived',
  WorkStarted = 'WorkStarted',
  Completed = 'Completed',
  Paid = 'Paid',
  Cancelled = 'Cancelled',
}

export enum ServiceCategory {
  Plumbing = 'Plumbing',
  Electrical = 'Electrical',
  Carpentry = 'Carpentry',
  Cleaning = 'Cleaning',
  Painting = 'Painting',
  HVAC = 'HVAC',
  Roofing = 'Roofing',
  Landscaping = 'Landscaping',
  Appliance = 'Appliance Repair',
  General = 'General Handyman',
}

export enum BookingType {
  OnDemand = 'OnDemand',
  Scheduled = 'Scheduled',
}

export enum KycStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Resubmit = 'Resubmit',
}

export enum MembershipTier {
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum',
}

export enum DisputeStatus {
  Open = 'Open',
  InReview = 'InReview',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum PayoutStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum TransactionStatus {
  Authorized = 'Authorized',
  Captured = 'Captured',
  Failed = 'Failed',
  Refunded = 'Refunded',
}

export enum UserStatus {
  Active = 'Active',
  Suspended = 'Suspended',
  Banned = 'Banned',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  userType: UserType;
  status: UserStatus;
  createdAt: string;
  lastActive?: string;
}

export interface ClientProfile extends User {
  savedAddresses: SavedAddress[];
  paymentMethods: PaymentMethod[];
}

export interface HandymanProfile extends User {
  bio: string;
  serviceCategories: ServiceCategory[];
  hourlyRate: number;
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  isOnline: boolean;
  kycStatus: KycStatus;
  membershipTier: MembershipTier;
  walletBalance: number;
  certifications?: string[];
  responseTime?: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  addressText: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'gcash' | 'bank';
  label: string;
  lastFour?: string;
  isDefault: boolean;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  handymanId: string;
  handymanName: string;
  serviceCategory: ServiceCategory;
  bookingType: BookingType;
  status: BookingStatus;
  description: string;
  location: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  photos?: string[];
  beforePhoto?: string;
  afterPhoto?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  photos?: string[];
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  photos?: string[];
  readAt?: string;
  createdAt: string;
  isMine: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  clientName: string;
  handymanName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: TransactionStatus;
  paymentMethod: string;
  authorizedAt?: string;
  capturedAt?: string;
  settledAt?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  reporterId: string;
  reporterName: string;
  reporterType: 'client' | 'handyman';
  issueType: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KycSubmission {
  id: string;
  handymanId: string;
  handymanName: string;
  handymanEmail: string;
  documentType: string;
  frontIdUrl: string;
  backIdUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface EarningsBreakdown {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}

export interface EarningsEntry {
  id: string;
  bookingId: string;
  clientName: string;
  serviceCategory: ServiceCategory;
  grossAmount: number;
  platformFee: number;
  netEarnings: number;
  status: PayoutStatus | 'Completed' | 'Pending';
  date: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userType: UserType;
  subject: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface JobCardData {
  id: string;
  clientName: string;
  clientRating: number;
  serviceCategory: ServiceCategory;
  bookingType: BookingType;
  distance: string;
  estimatedPay: number;
  description: string;
  location: string;
  scheduledAt?: string;
  photos?: string[];
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}
