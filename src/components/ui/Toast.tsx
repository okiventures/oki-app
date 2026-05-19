import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToastMessage } from '../../types';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG = {
  success: { bg: 'bg-green-100', text: 'text-green-800', icon: 'checkmark-circle' as const, iconColor: '#15803D' },
  error:   { bg: 'bg-red-100', text: 'text-red-800', icon: 'close-circle' as const, iconColor: '#DC2626' },
  info:    { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'information-circle' as const, iconColor: '#1D4ED8' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'warning' as const, iconColor: '#92400E' },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  }, [toast.id, opacity, onDismiss]);

  return (
    <Animated.View style={{ opacity }} className={`flex-row items-center ${config.bg} rounded-lg px-3 py-2 gap-2.5 shadow-sm mb-2`}>
      <Ionicons name={config.icon} size={18} color={config.iconColor} />
      <Text className={`flex-1 text-[13px] font-medium ${config.text} leading-5`}>{toast.message}</Text>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <View className="absolute top-14 left-4 right-4 z-50">
      {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </View>
  );
}
