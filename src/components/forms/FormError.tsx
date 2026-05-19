import React from 'react';
import { Text } from 'react-native';

interface FormErrorProps {
  error?: string;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;

  return <Text className="mt-1 text-[11px] text-red-500">{error}</Text>;
}
