import React from 'react';
import { Text } from 'react-native';

interface FormErrorProps {
  error?: string;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;

  return <Text className="mt-1 text-xs text-red-500">{error}</Text>;
}
