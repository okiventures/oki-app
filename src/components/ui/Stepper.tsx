import React from 'react';
import { View, Text } from 'react-native';

export interface StepperProps {
  steps: string[];
  currentStep: string;
  primaryColor: string;
  primaryLight: string;
}

export function Stepper({ steps, currentStep, primaryColor, primaryLight }: StepperProps) {
  const currentIdx = steps.indexOf(currentStep);

  return (
    <View className="flex-row items-center px-1 my-3">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = idx === currentIdx;

        const dotSize = isActive ? 14 : 10;
        const dotColor = isCompleted || isActive ? primaryColor : '#D3D1C7';
        const lineColor = isCompleted ? primaryColor : '#D3D1C7';

        return (
          <React.Fragment key={step}>
            <View className="items-center gap-1">
              {/* Dot – size/color are dynamic so style stays */}
              <View
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: dotColor,
                  borderWidth: isActive ? 2.5 : 0,
                  borderColor: isActive ? primaryLight : 'transparent',
                  shadowColor: isActive ? primaryColor : 'transparent',
                  shadowOpacity: isActive ? 0.35 : 0,
                  shadowRadius: isActive ? 4 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: isActive ? 2 : 0,
                }}
              />
              {/* Label */}
              <Text
                className="max-w-[52px] text-center"
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? '500' : '400',
                  color: isActive ? primaryColor : isCompleted ? '#6B7280' : '#B0AEA8',
                }}>
                {step}
              </Text>
            </View>

            {idx < steps.length - 1 && (
              <View
                className="mb-3.5 flex-1"
                style={{ height: 1.5, backgroundColor: lineColor }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
