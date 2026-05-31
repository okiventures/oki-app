import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Form } from '../../forms/Form';
import { Input } from '../../forms/Input';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../context/ThemeContext';

interface ProfileStepProps {
  fullName: string;
  phone: string;
  city: string;
  yearsExperience: string;
  bio: string;
  profileValidation: {
    fullName: boolean;
    phone: boolean;
    city: boolean;
    yearsExperience: boolean;
    bio: boolean;
  };
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onYearsExperienceChange: (value: string) => void;
  onBioChange: (value: string) => void;
}

export function HandymanProfileStep({
  fullName,
  phone,
  city,
  yearsExperience,
  bio,
  profileValidation,
  onFullNameChange,
  onPhoneChange,
  onCityChange,
  onYearsExperienceChange,
  onBioChange,
}: ProfileStepProps) {
  const { colors } = useTheme();

  return (
    <Card className="gap-4">
      <View>
        <Text className="font-heading text-lg" style={{ color: colors.ui.text }}>
          Personal details
        </Text>
        <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
          These details appear on your handyman profile and help the admin team review your application.
        </Text>
      </View>

      <Form gap={3}>
        <Input
          label="Full name"
          placeholder="Juan Dela Cruz"
          fillColor={colors.ui.surface}
          value={fullName}
          onChangeText={onFullNameChange}
          error={fullName.length > 0 && !profileValidation.fullName ? 'Use at least 3 characters.' : undefined}
          helperText={fullName.length === 0 ? 'Minimum 3 characters.' : undefined}
          leftIcon={<Ionicons name="person-outline" size={18} color={colors.ui.textMuted} />}
        />
        <Input
          label="Mobile number"
          placeholder="09xx xxx xxxx"
          fillColor={colors.ui.surface}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={onPhoneChange}
          error={phone.length > 0 && !profileValidation.phone ? 'Enter at least 10 digits.' : undefined}
          helperText={phone.length === 0 ? 'Digits only are counted. Minimum 10 digits.' : undefined}
          leftIcon={<Ionicons name="call-outline" size={18} color={colors.ui.textMuted} />}
        />
        <Input
          label="City or barangay"
          placeholder="Cebu City"
          fillColor={colors.ui.surface}
          value={city}
          onChangeText={onCityChange}
          error={city.length > 0 && !profileValidation.city ? 'Use at least 3 characters.' : undefined}
          helperText={city.length === 0 ? 'Minimum 3 characters.' : undefined}
          leftIcon={<Ionicons name="location-outline" size={18} color={colors.ui.textMuted} />}
        />
        <Input
          label="Years of experience"
          placeholder="3"
          fillColor={colors.ui.surface}
          keyboardType="number-pad"
          value={yearsExperience}
          onChangeText={onYearsExperienceChange}
          error={yearsExperience.length > 0 && !profileValidation.yearsExperience ? 'Enter 0 or a higher number.' : undefined}
          helperText={yearsExperience.length === 0 ? 'Required. Use a whole number like 0, 1, or 5.' : undefined}
          leftIcon={<Ionicons name="briefcase-outline" size={18} color={colors.ui.textMuted} />}
        />
        <Input
          label="Short bio"
          placeholder="Tell clients what kind of work you do best."
          fillColor={colors.ui.surface}
          multiline
          numberOfLines={4}
          value={bio}
          onChangeText={onBioChange}
          error={bio.length > 0 && !profileValidation.bio ? 'Use at least 16 characters.' : undefined}
          helperText={`${bio.trim().length}/16 characters`}
          leftIcon={<Ionicons name="create-outline" size={18} color={colors.ui.textMuted} />}
        />
      </Form>
    </Card>
  );
}