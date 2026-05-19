import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'ghost' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  danger?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  danger = false,
  disabled = false,
}: IconButtonProps) {
  const dimensionClasses = {
    sm: 'w-8 h-8 rounded-md',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl',
  };

  const bgClass = 
    variant === 'filled'
      ? danger ? 'bg-red-600' : 'bg-primary-600'
      : variant === 'outline'
      ? 'bg-transparent border border-primary-600'
      : 'bg-transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`${dimensionClasses[size]} ${bgClass} items-center justify-center ${disabled ? 'opacity-50' : 'opacity-100'}`}
    >
      <View>{icon}</View>
    </TouchableOpacity>
  );
}
