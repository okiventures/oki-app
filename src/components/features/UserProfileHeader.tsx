import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { RatingDisplay } from '../ui/RatingDisplay';

interface UserProfileHeaderProps {
  name: string;
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
  isOnline?: boolean;
  isVerified?: boolean;
  subtitle?: string;
  membershipTier?: string;
  jobsCompleted?: number;
  onEditPress?: () => void;
  large?: boolean;
}

export function UserProfileHeader({
  name,
  photoUrl,
  rating,
  reviewCount,
  isOnline,
  isVerified,
  subtitle,
  membershipTier,
  jobsCompleted,
  onEditPress,
  large = false,
}: UserProfileHeaderProps) {
  const avatarSize = large ? 88 : 60;

  return (
    <View className={`py-4 ${large ? 'items-center' : 'items-start'}`}>
      <View className="relative mb-3">
        <Avatar
          name={name}
          photoUrl={photoUrl}
          size={avatarSize}
          showOnlineDot={isOnline !== undefined}
          isOnline={isOnline}
        />
        {onEditPress && (
          <TouchableOpacity
            onPress={onEditPress}
            accessibilityLabel="Edit profile photo"
            className="bg-primary-600 absolute right-0 bottom-0 rounded-full border-2 border-white p-1"></TouchableOpacity>
        )}
      </View>

      <Text
        className={`font-bold text-gray-900 ${large ? 'text-center text-2xl' : 'text-left text-lg'}`}>
        {name}
      </Text>

      {subtitle && (
        <Text className={`mt-0.5 text-sm text-gray-500 ${large ? 'text-center' : 'text-left'}`}>
          {subtitle}
        </Text>
      )}

      <View
        className={`mt-2 flex-row flex-wrap gap-1.5 ${large ? 'justify-center' : 'justify-start'}`}>
        {isVerified && <Badge variant="verified" label="Verified" />}
        {isOnline !== undefined && (
          <Badge
            variant={isOnline ? 'online' : 'offline'}
            label={isOnline ? 'Online' : 'Offline'}
          />
        )}
        {membershipTier && <Badge variant="tier" label={membershipTier} />}
      </View>

      <View className={`mt-3 flex-row gap-5 ${large ? 'justify-center' : 'justify-start'}`}>
        {rating !== undefined && (
          <RatingDisplay rating={rating} reviewCount={reviewCount} size="md" />
        )}
        {jobsCompleted !== undefined && (
          <Text className="text-sm text-gray-500">
            <Text className="font-bold text-gray-700">{jobsCompleted}</Text> jobs
          </Text>
        )}
      </View>
    </View>
  );
}
