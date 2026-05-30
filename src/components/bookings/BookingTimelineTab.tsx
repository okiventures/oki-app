import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BookingDetail } from '../../mocks/bookingDetails';
import { VerticalStepper } from '../ui/VerticalStepper';

import { SectionLabel } from './BookingShared';

interface BookingTimelineTabProps {
  booking: BookingDetail;
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}>
      {children}
    </View>
  );
}

export function BookingTimelineTab({ booking }: BookingTimelineTabProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];
  const primaryLight = colors.primary['100'];
  return (
    <View className="gap-5">
      <View>
        <SectionLabel label="Booking Progress" />
        <CardContainer>
          <View className="px-4 pt-4 pb-2">
            <VerticalStepper
              events={booking.timeline}
              currentStatus={booking.status}
              primaryColor={primaryColor}
              primaryLight={primaryLight}
            />
          </View>
        </CardContainer>
      </View>
    </View>
  );
}
