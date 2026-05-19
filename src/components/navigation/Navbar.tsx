import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface NavbarProps {
  title: string;
  showBack?: boolean;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  transparent?: boolean;
}

export function Navbar({
  title,
  showBack = false,
  rightIcon,
  onRightPress,
  transparent = false,
}: NavbarProps) {
  const router = useRouter();

  return (
    <View
      className={`flex-row items-center px-4 pt-10 pb-4 ${transparent ? 'bg-transparent' : 'border-b border-gray-200 bg-white'}`}>
      {showBack ? (
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          className="mr-2">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      ) : (
        <View className="w-[30px]" />
      )}
      <Text className="font-heading flex-1 text-center text-[17px] text-gray-900">{title}</Text>
      {rightIcon && onRightPress ? (
        <TouchableOpacity
          onPress={onRightPress}
          accessibilityLabel="Navbar action"
          className="w-[30px] items-end">
          {rightIcon}
        </TouchableOpacity>
      ) : (
        <View className="w-[30px]" />
      )}
    </View>
  );
}
