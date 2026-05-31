import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/context/ThemeContext';

export default function MessagesScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.ui.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Ionicons name="chatbubble-outline" size={40} color="#B0AEA8" />
        <Text style={{ color: '#8A8780', fontSize: 14, fontWeight: '400' }}>
          No messages yet
        </Text>
      </View>
    </SafeAreaView>
  );
}
