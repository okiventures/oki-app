import React from 'react';
import { Text, View } from 'react-native';

import { Badge } from '../../ui/Badge';
import { Stepper } from '../../ui/Stepper';
import { useTheme } from '../../../context/ThemeContext';
import { ONBOARDING_STEPS, type HandymanOnboardingStep } from './shared';

interface HandymanOnboardingHeroProps {
  compactLayout: boolean;
  currentStep: HandymanOnboardingStep;
  currentStepIndex: number;
}

export function HandymanOnboardingHero({
  compactLayout,
  currentStep,
  currentStepIndex,
}: HandymanOnboardingHeroProps) {
  const { colors } = useTheme();

  return (
    <View
      className="rounded-[28px]"
      style={{
        backgroundColor: colors.primary['600'],
        paddingHorizontal: compactLayout ? 16 : 20,
        paddingTop: compactLayout ? 14 : 16,
        paddingBottom: compactLayout ? 14 : 20,
      }}>
      <Badge
        variant="warning"
        text={`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}`}
      />
      <Text className={`font-heading mt-3 ${compactLayout ? 'text-xl' : 'text-2xl'} text-white`}>
        Apply to work on OKI
      </Text>
      <Text
        className={`mt-2 ${compactLayout ? 'text-[12px]' : 'text-[13px]'} leading-5 text-white/80`}>
        Complete your profile, choose your services, and upload KYC documents for review.
      </Text>

      {compactLayout ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <View
                key={step}
                className="rounded-full px-2.5 py-1"
                style={{
                  backgroundColor:
                    isActive || isCompleted ? colors.secondary['500'] : 'rgba(255,255,255,0.12)',
                }}>
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: isActive || isCompleted ? colors.primary['900'] : '#FFFFFF' }}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Stepper
          steps={[...ONBOARDING_STEPS]}
          currentStep={currentStep}
          primaryColor={colors.secondary['500']}
          primaryLight={colors.secondary['200']}
        />
      )}
    </View>
  );
}
