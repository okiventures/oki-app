import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface BackButtonProps {
  onPress?: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
}

export function BackButton({ onPress, size = 22, color = '#111827', accessibilityLabel = 'Go back' }: BackButtonProps) {
  const router = useRouter();
  const handle = onPress ?? (() => router.back());

  return (
    <TouchableOpacity onPress={handle} accessibilityLabel={accessibilityLabel} className="mr-2">
      <Ionicons name="arrow-back" size={size} color={color} />
    </TouchableOpacity>
  );
}

export default BackButton;
