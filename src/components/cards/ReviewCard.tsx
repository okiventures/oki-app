import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { RatingDisplay } from '../ui/RatingDisplay';
import { Review } from '../../types';
import { formatDate, truncate } from '../../utils';

interface ReviewCardProps {
  review: Review;
  expanded?: boolean;
}

export function ReviewCard({ review, expanded = false }: ReviewCardProps) {
  const text = expanded ? review.comment : truncate(review.comment, 120);

  return (
    <View className="border-b border-gray-100 py-2">
      <View className="mb-2 flex-row items-center">
        <Avatar name={review.reviewerName} photoUrl={review.reviewerPhotoUrl} size={38} />
        <View className="ml-2.5 flex-1">
          <Text className="text-[13px] font-semibold text-gray-900">{review.reviewerName}</Text>
          <Text className="text-[11px] text-gray-400">{formatDate(review.createdAt)}</Text>
        </View>
        <RatingDisplay rating={review.rating} showCount={false} size="sm" />
      </View>
      {review.comment ? <Text className="text-[13px] leading-5 text-gray-700">{text}</Text> : null}
    </View>
  );
}
