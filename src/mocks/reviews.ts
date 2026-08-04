import { Review } from '../types';

let nextReviewId = 8;

export function addReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
  const newReview: Review = {
    ...review,
    id: `rev-${String(nextReviewId++).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };
  MOCK_REVIEWS.push(newReview);
  return newReview;
}

export function getRatingForBooking(bookingId: string): number {
  const review = MOCK_REVIEWS.find((r) => r.bookingId === bookingId);
  return review?.rating ?? 0;
}

function daysAgo(days: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    bookingId: 'b2',
    reviewerId: 'c1',
    reviewerName: 'Ishah Bautista',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=sarah',
    revieweeId: 'h2',
    rating: 5,
    comment:
      'James did a fantastic job painting our living room! He was quick, clean, and very professional. Highly recommended.',
    createdAt: daysAgo(2, 10),
  },
  {
    id: 'r2',
    bookingId: 'b6',
    reviewerId: 'c2',
    reviewerName: 'Kyle Lee',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=kyle',
    revieweeId: 'h1',
    rating: 4,
    comment:
      'Ceferino fixed the wiring in the garage. He arrived a bit later than expected, but the work is solid and clean.',
    createdAt: daysAgo(1, 14),
  },
  {
    id: 'r3',
    bookingId: 'b-yesterday-am',
    reviewerId: 'c1',
    reviewerName: 'Ishah Bautista',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=sarah',
    revieweeId: 'h1',
    rating: 5,
    comment:
      'Replaced our shower head in under an hour. Quick, tidy, and friendly — exactly what we needed.',
    createdAt: daysAgo(1, 8),
  },
  {
    id: 'r4',
    bookingId: 'b-hist-001',
    reviewerId: 'c3',
    reviewerName: 'Princess Jaena',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=emily',
    revieweeId: 'h1',
    rating: 5,
    comment:
      'Ceferino mounted our TV and installed a ceiling fan — professional and fast. Would book again.',
    createdAt: daysAgo(5),
  },
  {
    id: 'r5',
    bookingId: 'b-hist-002',
    reviewerId: 'c4',
    reviewerName: 'Mara Sy',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=mara',
    revieweeId: 'h1',
    rating: 4,
    comment:
      'Rewired a faulty kitchen outlet. Clean work and on time. Communication could be a bit quicker.',
    createdAt: daysAgo(8),
  },
  {
    id: 'r6',
    bookingId: 'b-hist-003',
    reviewerId: 'c1',
    reviewerName: 'Ishah Bautista',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=sarah',
    revieweeId: 'h1',
    rating: 5,
    comment:
      'Ceferino is our go-to for any plumbing issue. Always on time and leaves the place spotless.',
    createdAt: daysAgo(12),
  },
  {
    id: 'r7',
    bookingId: 'b-hist-004',
    reviewerId: 'c2',
    reviewerName: 'Kyle Lee',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=kyle',
    revieweeId: 'h2',
    rating: 4,
    comment:
      'James built custom shelves and painted the hallway — good quality for the price. Took two visits to finish.',
    createdAt: daysAgo(6),
  },
];
