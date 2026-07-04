import React from 'react';
import { View } from 'react-native';

interface StepDotsProps {
  steps: readonly string[];
  current: number;
}

export function NewBookingStepDots({ steps, current }: StepDotsProps) {
  return (
    <View className="mb-6 flex-row items-center justify-center gap-1.5">
      {steps.map((s, i) => (
        <View
          key={s}
          className="rounded-full"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor: i === current ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
          }}
        />
      ))}
    </View>
  );
}
