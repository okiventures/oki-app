import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DrawerItem {
  label: string;
  icon: string;
  route: string;
  onPress: () => void;
}

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  items: DrawerItem[];
  userName: string;
  userSubtitle?: string;
}

export function Drawer({ visible, onClose, items, userName, userSubtitle }: DrawerProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <View className="w-[75%] max-w-[300px] bg-white pt-12 shadow-lg">
          <View className="px-5 pb-5 border-b border-gray-100">
            <View className="w-14 h-14 rounded-full bg-primary-100 items-center justify-center mb-3">
              <Text className="text-xl font-bold text-primary-700">{userName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text className="text-[17px] font-bold text-gray-900">{userName}</Text>
            {userSubtitle && <Text className="text-xs text-gray-500 mt-0.5">{userSubtitle}</Text>}
          </View>
          <View className="pt-2">
            {items.map((item) => (
              <TouchableOpacity key={item.label} onPress={() => { item.onPress(); onClose(); }} className="flex-row items-center px-5 py-3.5 gap-3.5">
                <Ionicons name={item.icon as never} size={20} color="#374151" />
                <Text className="text-[15px] text-gray-700 font-medium">{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  );
}
