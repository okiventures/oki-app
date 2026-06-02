import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';

type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover';

interface PaymentMethod {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

const INITIAL_METHODS: PaymentMethod[] = [
  {
    id: '1',
    brand: 'Visa',
    last4: '4242',
    expiry: '12/26',
    isDefault: true,
  },
  {
    id: '2',
    brand: 'Mastercard',
    last4: '5555',
    expiry: '08/25',
    isDefault: false,
  },
];

export default function PaymentMethods() {
  const { colors } = useTheme();
  const router = useRouter();

  const [methods, setMethods] = useState<PaymentMethod[]>(INITIAL_METHODS);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Modal state
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newCvv, setNewCvv] = useState('');
  const [newName, setNewName] = useState('');

  const getBrandIcon = (brand: CardBrand): 'card-outline' => {
    switch (brand) {
      case 'Visa':
        return 'card-outline';
      case 'Mastercard':
        return 'card-outline';
      case 'Amex':
        return 'card-outline';
      default:
        return 'card-outline';
    }
  };

  const handleSave = () => {
    const newMethod: PaymentMethod = {
      id: Math.random().toString(),
      brand: 'Visa', // Mocking brand detection
      last4: newCardNumber.slice(-4) || '1234',
      expiry: newExpiry || '12/28',
      isDefault: methods.length === 0,
    };
    setMethods([...methods, newMethod]);
    setIsAddModalVisible(false);
    // Reset form
    setNewCardNumber('');
    setNewExpiry('');
    setNewCvv('');
    setNewName('');
  };

  const setAsDefault = (id: string) => {
    setMethods(
      methods.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1"
      style={{ backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Payment Methods" showBack onBackPress={() => router.back()} />

      <View
        className="-mt-8 flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          {methods.map((method) => (
            <Pressable
              key={method.id}
              onPress={() => setAsDefault(method.id)}
              className="mb-4 flex-row items-center rounded-2xl border p-4"
              style={{
                backgroundColor: method.isDefault
                  ? `${colors.primary['500']}0A`
                  : colors.ui.surface,
                borderColor: method.isDefault ? colors.primary['500'] : colors.ui.border,
              }}>
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <Ionicons name={getBrandIcon(method.brand)} size={24} color="#333" />
              </View>
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="text-base font-bold" style={{ color: colors.ui.text }}>
                    {method.brand} •••• {method.last4}
                  </Text>
                  {method.isDefault && (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: `${colors.primary['500']}20` }}>
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: colors.primary['600'] }}>
                        DEFAULT
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm font-medium" style={{ color: colors.ui.textMuted }}>
                  Expires {method.expiry}
                </Text>
              </View>
              {method.isDefault ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary['500']} />
              ) : (
                <View
                  className="h-6 w-6 rounded-full border"
                  style={{ borderColor: colors.ui.border }}
                />
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View
          className="border-t p-5"
          style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
          <Button
            label="Add New Card"
            onPress={() => setIsAddModalVisible(true)}
            fullWidth
            leftIcon={<Ionicons name="add" size={20} color="#FFF" />}
          />
        </View>
      </View>

      <Modal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        title="Add New Card">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <Input
                label="Card Number"
                value={newCardNumber}
                onChangeText={setNewCardNumber}
                placeholder="0000 0000 0000 0000"
                keyboardType="numeric"
                maxLength={19}
              />

              <View className="flex-row gap-4">
                <Input
                  label="Expiry Date"
                  value={newExpiry}
                  onChangeText={setNewExpiry}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                  containerClassName="flex-1"
                />
                <Input
                  label="CVV"
                  value={newCvv}
                  onChangeText={setNewCvv}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  containerClassName="flex-1"
                />
              </View>

              <Input
                label="Cardholder Name"
                value={newName}
                onChangeText={setNewName}
                placeholder="John Doe"
                autoCapitalize="words"
              />

              <View className="mt-4">
                <Button label="Save Card" onPress={handleSave} fullWidth />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
