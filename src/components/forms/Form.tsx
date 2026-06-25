import React from 'react';
import { View } from 'react-native';

interface FormProps {
  children: React.ReactNode;
  gap?: number;
}

export function Form({ children, gap = 4 }: FormProps) {
  return <View className={`gap-${gap}`}>{children}</View>;
}
