import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  style,
  className = '',
  containerClassName = '',
  ...props
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && (
        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.ui.textMuted }}>
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.ui.textLight}
        className={`rounded-xl border p-4 text-base ${className}`}
        style={[
          {
            backgroundColor: colors.ui.surface,
            borderColor: error ? '#EF4444' : colors.ui.border,
            color: colors.ui.text,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text className="mt-1 text-xs" style={{ color: '#EF4444' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
