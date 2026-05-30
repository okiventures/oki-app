import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlatformStats } from '../../mocks/dashboard';

interface TrustStripProps {
  stats: PlatformStats;
}

interface StatColumnProps {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
}

function StatColumn({ icon, iconColor, value, label }: StatColumnProps) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <View className="flex-row items-center gap-1">
        <Ionicons name={icon as never} size={13} color={iconColor} />
        <Text className="text-base font-medium text-[#1C1917]">{value}</Text>
      </View>
      <Text className="text-center text-[10px] font-normal text-[#8A8780]">
        {label}
      </Text>
    </View>
  );
}

export function TrustStrip({ stats }: TrustStripProps) {
  return (
    <View className="mx-5 mb-5">
      <View className="flex-row items-center rounded-xl border border-[#D3D1C7] bg-white px-2 py-3">
        <StatColumn
          icon="star"
          iconColor="#F59E0B"
          value={stats.avgWorkerRating}
          label="Avg Worker Rating"
        />

        <View className="mx-0.5 w-px self-stretch bg-[#E8E6E1]" />

        <StatColumn
          icon="checkmark-circle"
          iconColor="#10B981"
          value={stats.jobsCompletedPct}
          label="Jobs Completed"
        />

        <View className="mx-0.5 w-px self-stretch bg-[#E8E6E1]" />

        <StatColumn
          icon="flash"
          iconColor="#3B82F6"
          value={stats.avgResponseTime}
          label="Avg Response Time"
        />
      </View>
    </View>
  );
}
