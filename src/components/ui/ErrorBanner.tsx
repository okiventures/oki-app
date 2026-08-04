import React from 'react';
import { Text } from 'react-native';
import { Card } from './Card';

interface ErrorBannerProps {
  message?: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <Card className="border border-red-100 bg-red-50 p-3">
      <Text className="text-[12px] text-red-600">{message}</Text>
    </Card>
  );
}
