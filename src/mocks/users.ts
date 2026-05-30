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
  name: 'Ceferino Jumaoas',
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
