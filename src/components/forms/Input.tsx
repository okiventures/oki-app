import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormLabel } from './FormLabel';
import { FormError } from './FormError';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureToggle?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  required,
  leftIcon,
  rightIcon,
  secureToggle,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);

  const borderClass = error ? 'border-red-500' : focused ? 'border-primary-500' : 'border-gray-200';

  return (
    <View className="mb-2">
      {label && <FormLabel label={label} required={required} />}
      <View className={`flex-row items-center border ${borderClass} rounded-xl bg-gray-50 px-3`}>
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? secure : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          className="flex-1 py-3 text-[15px] text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setSecure((s) => !s)}
            accessibilityLabel="Toggle password visibility">
            <Ionicons name={secure ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {rightIcon && !secureToggle && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error ? (
        <FormError error={error} />
      ) : helperText ? (
        <Text className="mt-1 text-xs text-gray-500">{helperText}</Text>
      ) : null}
    </View>
  );
}
