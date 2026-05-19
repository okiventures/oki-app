import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const { colors } = useTheme();

  const sizeClasses = {
    sm: 'px-4 py-2 text-[11px] rounded-full',
    md: 'px-5 py-3 text-[13px] rounded-full',
    lg: 'px-8 py-4 text-sm rounded-full',
  };

  const variantClasses = {
    primary: 'bg-primary-600 border-primary-600',
    secondary: 'bg-secondary-500 border-secondary-500',
    tertiary: 'bg-transparent border-primary-600 border',
    danger: 'bg-red-600 border-red-600',
  };

  const textColors = {
    primary: 'text-white',
    secondary: 'text-white',
    tertiary: 'text-primary-600',
    danger: 'text-white',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center justify-center ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : 'self-auto'} ${disabled ? 'opacity-50 bg-gray-300 border-gray-300' : 'opacity-100'}`}
      style={!disabled && variant === 'primary' ? { backgroundColor: colors.primary['600'], borderColor: colors.primary['600'] } : {}}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'tertiary' ? colors.primary['600'] : '#FFFFFF'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`${textColors[variant]} font-semibold tracking-wide`}>
            {label}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
