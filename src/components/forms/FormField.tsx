import React from 'react';
import { View } from 'react-native';

interface FormFieldProps {
  children: React.ReactNode;
}

export function FormField({ children }: FormFieldProps) {
  return <View className="mb-1">{children}</View>;
}
