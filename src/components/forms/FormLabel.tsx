import React from 'react';
import { Text } from 'react-native';

interface FormLabelProps {
  label: string;
  required?: boolean;
}

export function FormLabel({ label, required }: FormLabelProps) {
  return (
    <Text className="mb-1.5 text-[13px] font-semibold text-gray-700">
      {label}
      {required && <Text className="text-red-500"> *</Text>}
    </Text>
  );
}
