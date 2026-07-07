import { Review } from '../types';

let nextReviewId = 3;

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
      'Alex did a fantastic job painting our living room! He was quick, clean, and very professional. Highly recommended.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'r2',
    bookingId: 'b99',
    reviewerId: 'c3',
    reviewerName: 'Princess Jaena',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=emily',
    revieweeId: 'h1',
    rating: 4,
    comment:
      'Mike arrived a bit late due to traffic but he fixed the plumbing issue perfectly. Good service overall.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];
