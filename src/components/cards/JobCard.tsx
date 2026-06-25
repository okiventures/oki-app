import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { JobCardData, BookingType } from '../../types';
import { formatCurrency, truncate } from '../../utils';
import { SERVICE_CATEGORY_ICONS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface JobCardProps {
  job: JobCardData;
  onAccept: () => void;
  onDecline: () => void;
  onExpand?: () => void;
  expanded?: boolean;
}

export function JobCard({ job, onAccept, onDecline, onExpand, expanded = false }: JobCardProps) {
  const { colors } = useTheme();
  const iconName = (SERVICE_CATEGORY_ICONS[job.serviceCategory] ?? 'hammer') as never;

  return (
    <Card className="mb-2">
      <View className="mb-2 flex-row items-center">
        <View className="bg-primary-50 mr-2.5 h-8 w-8 items-center justify-center rounded-full">
          <Ionicons name={iconName} size={18} color={colors.primary['600']} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-gray-900">{job.serviceCategory}</Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Badge
              variant={job.bookingType === BookingType.OnDemand ? 'status' : 'tier'}
              label={job.bookingType === BookingType.OnDemand ? 'On-Demand' : 'Scheduled'}
            />
          </View>
        </View>
        <Text className="text-primary-700 text-base font-bold">
          {formatCurrency(job.estimatedPay)}
        </Text>
      </View>

      <View className="mb-1.5 flex-row items-center gap-1">
        <Ionicons name="location-outline" size={14} color="#9CA3AF" />
        <Text className="flex-1 text-[11px] text-gray-500">
          {job.location} · {job.distance}
        </Text>
      </View>

      <Text className="mb-2 text-[13px] leading-5 text-gray-700">
        {expanded ? job.description : truncate(job.description, 80)}
      </Text>

      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Avatar name={job.clientName} size={30} />
          <View>
            <Text className="text-[11px] font-semibold text-gray-700">{job.clientName}</Text>
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text className="text-[11px] text-gray-500">{job.clientRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        {onExpand && (
          <TouchableOpacity onPress={onExpand} accessibilityLabel="View job details">
            <Text className="text-primary-600 text-[11px] font-semibold">
              {expanded ? 'Less' : 'Details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Button label="Decline" onPress={onDecline} variant="tertiary" fullWidth />
        </View>
        <View className="flex-1">
          <Button label="Accept" onPress={onAccept} variant="primary" fullWidth />
        </View>
      </View>
    </Card>
  );
}
