import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  HandymanOnboardingHero,
  HandymanDocumentsStep,
  HandymanPendingStep,
  HandymanProfileStep,
  HandymanServicesStep,
  useHandymanOnboardingFlow,
} from '../../../src/components/onboarding/handyman';
import { Navbar } from '../../../src/components/navigation/Navbar';
import { Button } from '../../../src/components/ui/Button';
import { useTheme } from '../../../src/context/ThemeContext';

export default function HandymanOnboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const compactLayout = height < 760;
  const {
    currentStep,
    currentStepIndex,
    fullName,
    phone,
    city,
    yearsExperience,
    bio,
    servicePricing,
    uploads,
    selectedServices,
    profileValidation,
    canContinue,
    setFullName,
    setPhone,
    setCity,
    setYearsExperience,
    setBio,
    toggleService,
    updateServicePrice,
    startUpload,
    goToNextStep,
    goToPreviousStep,
  } = useHandymanOnboardingFlow();

  const handleContinue = () => {
    if (currentStep === 'Pending') {
      router.replace('/(handyman)');
      return;
    }

    goToNextStep();
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      router.back();
      return;
    }

    goToPreviousStep();
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1"
      style={{ flex: 1, backgroundColor: colors.ui.background }}>
      <Navbar title="Handyman Onboarding" showBack={currentStepIndex === 0} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1 }}>
          <ScrollView
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            style={{ flex: 1, backgroundColor: colors.ui.background }}
            contentContainerStyle={{
              padding: compactLayout ? 16 : 20,
              paddingBottom: 32,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <HandymanOnboardingHero
              compactLayout={compactLayout}
              currentStep={currentStep}
              currentStepIndex={currentStepIndex}
            />

            <View style={{ marginTop: compactLayout ? -40 : -24 }}>
              {currentStep === 'Profile' ? (
                <HandymanProfileStep
                  fullName={fullName}
                  phone={phone}
                  city={city}
                  yearsExperience={yearsExperience}
                  bio={bio}
                  profileValidation={profileValidation}
                  onFullNameChange={setFullName}
                  onPhoneChange={setPhone}
                  onCityChange={setCity}
                  onYearsExperienceChange={setYearsExperience}
                  onBioChange={setBio}
                />
              ) : null}

              {currentStep === 'Services' ? (
                <HandymanServicesStep
                  servicePricing={servicePricing}
                  onToggleService={toggleService}
                  onPriceChange={updateServicePrice}
                />
              ) : null}

              {currentStep === 'Documents' ? (
                <HandymanDocumentsStep uploads={uploads} onUpload={startUpload} />
              ) : null}

              {currentStep === 'Pending' ? (
                <HandymanPendingStep selectedServices={selectedServices} servicePricing={servicePricing} />
              ) : null}
            </View>
          </ScrollView>

          <View
            className="border-t border-gray-200 px-4 pb-4 pt-3"
            style={{ backgroundColor: colors.ui.background }}>
            <View className="flex-row gap-3" style={{ width: '100%' }}>
              {currentStep !== 'Pending' ? (
                <View style={{ flex: 1 }}>
                  <Button
                    label={currentStepIndex === 0 ? 'Cancel' : 'Back'}
                    variant="tertiary"
                    onPress={handleBack}
                    fullWidth
                  />
                </View>
              ) : null}

              <View style={{ flex: 1 }}>
                <Button
                  label={currentStep === 'Documents' ? 'Submit Application' : currentStep === 'Pending' ? 'Go to Dashboard' : 'Continue'}
                  onPress={handleContinue}
                  fullWidth
                  disabled={!canContinue}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}