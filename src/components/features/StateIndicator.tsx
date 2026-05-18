import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatus } from '../../types';

interface StateIndicatorProps {
  currentStatus: BookingStatus;
}

const STEPS = [
  { status: BookingStatus.Pending, label: 'Requested', icon: 'time-outline' },
  { status: BookingStatus.Accepted, label: 'Accepted', icon: 'checkmark-outline' },
  { status: BookingStatus.Arrived, label: 'Arrived', icon: 'pin-outline' },
  { status: BookingStatus.WorkStarted, label: 'Working', icon: 'hammer-outline' },
  { status: BookingStatus.Completed, label: 'Done', icon: 'flag-outline' },
];

export function StateIndicator({ currentStatus }: StateIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.status === currentStatus);

  if (currentStatus === BookingStatus.Cancelled) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-red-50 p-3">
        <Ionicons name="close-circle" size={20} color="#DC2626" />
        <Text className="text-sm font-semibold text-red-700">Booking Cancelled</Text>
      </View>
    );
  }

  return (
    <View className="py-4">
      <View className="flex-row items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <View key={step.status} className="relative flex-1 items-center">
              {/* Line connector */}
              {index > 0 && (
                <View
                  className={`absolute top-4 right-[50%] left-[-50%] h-0.5 ${index <= currentIndex ? 'bg-primary-500' : 'bg-gray-200'}`}
                />
              )}

              {/* Step Node */}
              <View
                className={`z-10 h-8 w-8 items-center justify-center rounded-full ${isCompleted ? 'bg-primary-500' : isCurrent ? 'bg-primary-600 border-2 border-white' : 'bg-gray-200'}`}>
                <Ionicons
                  name={step.icon as never}
                  size={14}
                  color={isCompleted || isCurrent ? '#FFF' : '#9CA3AF'}
                />
              </View>

              <Text
                className={`mt-1.5 text-[10px] font-medium ${isCurrent ? 'text-primary-600 font-bold' : 'text-gray-500'}`}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
