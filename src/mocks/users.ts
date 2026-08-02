import { UserType, MembershipTier } from '../types';

export const MOCK_CLIENT = {
  id: 'c1',
  name: 'Ishah Bautista',
  type: 'client' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Ishah',
  rating: 4.8,
  reviewCount: 12,
  memberSince: '2026-01-15T08:00:00Z',
  location: 'Cebu City',
};

export const MOCK_HANDYMAN = {
  id: 'h1',
  name: 'Ceferino Jumao-as V',
  type: 'handyman' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Ceferino',
  rating: 4.9,
  reviewCount: 142,
  memberSince: '2021-06-22T08:00:00Z',
  location: 'Cebu City',
  isVerified: true,
  isOnline: true,
  membershipTier: MembershipTier.Gold,
  jobsCompleted: 318,
  skills: ['Plumbing', 'Electrical', 'General Handyman'],
  bio: 'Licensed plumber and electrician with over 10 years of experience. I fix things right the first time.',
  hourlyRate: 45,
};

export const MOCK_HANDYMAN_2 = {
  id: 'h2',
  name: 'James Ty',
  type: 'handyman' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=James',
  rating: 4.7,
  reviewCount: 89,
  memberSince: '2022-03-10T08:00:00Z',
  location: 'Mandaue City',
  isVerified: true,
  isOnline: true,
  membershipTier: MembershipTier.Silver,
  jobsCompleted: 204,
  skills: ['Painting', 'Carpentry', 'General Handyman'],
  bio: 'Professional painter and carpenter with 7 years of experience. Quality work guaranteed.',
  hourlyRate: 38,
};

export const MOCK_HANDYMAN_3 = {
  id: 'h3',
  name: 'Mara Sy',
  type: 'handyman' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Mara',
  rating: 4.8,
  reviewCount: 56,
  memberSince: '2023-01-05T08:00:00Z',
  location: 'Lapu-Lapu City',
  isVerified: true,
  isOnline: true,
  membershipTier: MembershipTier.Silver,
  jobsCompleted: 98,
  skills: ['Cleaning', 'General Handyman'],
  bio: 'Deep cleaning specialist. Your space will sparkle.',
  hourlyRate: 32,
};

export const MOCK_HANDYMAN_4 = {
  id: 'h4',
  name: 'Kyle Lee',
  type: 'handyman' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Kyle',
  rating: 4.6,
  reviewCount: 34,
  memberSince: '2024-06-18T08:00:00Z',
  location: 'Cebu City',
  isVerified: false,
  isOnline: true,
  membershipTier: MembershipTier.Bronze,
  jobsCompleted: 45,
  skills: ['Electrical', 'HVAC', 'General Handyman'],
  bio: 'Electrician and HVAC technician. Fast and reliable service.',
  hourlyRate: 40,
};

export const MOCK_HANDYMAN_5 = {
  id: 'h5',
  name: 'Princess Jaena',
  type: 'handyman' as UserType,
  photoUrl: 'https://api.dicebear.com/7.x/shapes/png?seed=Princess',
  rating: 5.0,
  reviewCount: 12,
  memberSince: '2025-09-01T08:00:00Z',
  location: 'Talisay City',
  isVerified: false,
  isOnline: false,
  membershipTier: MembershipTier.Bronze,
  jobsCompleted: 18,
  skills: ['General Handyman', 'Cleaning', 'Painting'],
  bio: 'Hardworking handyman ready to help with any task around the house.',
  hourlyRate: 28,
};

export const MOCK_HANDYMEN = [
  MOCK_HANDYMAN,
  MOCK_HANDYMAN_2,
  MOCK_HANDYMAN_3,
  MOCK_HANDYMAN_4,
  MOCK_HANDYMAN_5,
];
