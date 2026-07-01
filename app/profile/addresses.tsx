import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';

type AddressType = 'Home' | 'Work' | 'Custom';

interface Address {
  id: string;
  type: AddressType;
  customName?: string;
  street: string;
  details: string;
}

const INITIAL_ADDRESSES: Address[] = [
  {
    id: '1',
    type: 'Home',
    street: '123 Main St',
    details: 'Apt 4B, New York, NY 10001',
  },
  {
    id: '2',
    type: 'Work',
    street: '456 Market St',
    details: 'Suite 900, San Francisco, CA 94105',
  },
  {
    id: '3',
    type: 'Custom',
    customName: "Mom's House",
    street: '789 Elm St',
    details: 'Los Angeles, CA 90001',
  },
];

export default function SavedAddresses() {
  const { colors } = useTheme();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Address action menu state
  const [actionAddress, setActionAddress] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  // Modal state
  const [newType, setNewType] = useState<AddressType>('Home');
  const [newCustomName, setNewCustomName] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newDetails, setNewDetails] = useState('');

  const getIconForType = (type: AddressType) => {
    switch (type) {
      case 'Home':
        return 'home';
      case 'Work':
        return 'briefcase';
      default:
        return 'location';
    }
  };

  const handleSave = () => {
    const newAddress: Address = {
      id: Math.random().toString(),
      type: newType,
      customName: newType === 'Custom' ? newCustomName : undefined,
      street: newStreet,
      details: newDetails,
    };
    setAddresses([...addresses, newAddress]);
    setIsAddModalVisible(false);
    // Reset form
    setNewType('Home');
    setNewCustomName('');
    setNewStreet('');
    setNewDetails('');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Saved Addresses" showBack onBackPress={() => router.back()} />

      <View
        className="-mt-8 flex-1 overflow-hidden rounded-t-4xl"
        style={{ backgroundColor: colors.ui.background }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          {addresses.map((address) => (
            <View
              key={address.id}
              className="mb-4 flex-row items-center rounded-2xl border p-4"
              style={{
                backgroundColor: colors.ui.surface,
                borderColor: colors.ui.border,
              }}>
              <View
                className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${colors.primary['500']}15` }}>
                <Ionicons
                  name={getIconForType(address.type)}
                  size={24}
                  color={colors.primary['500']}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-base font-bold" style={{ color: colors.ui.text }}>
                  {address.type === 'Custom' ? address.customName : address.type}
                </Text>
                <Text className="mb-0.5 text-sm font-medium" style={{ color: colors.ui.textMuted }}>
                  {address.street}
                </Text>
                <Text className="text-xs" style={{ color: colors.ui.textLight }}>
                  {address.details}
                </Text>
              </View>
              <Pressable className="p-2" onPress={() => setActionAddress(address)}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.ui.textLight} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View
          className="border-t p-5"
          style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
          <Button
            label="Add New Address"
            onPress={() => setIsAddModalVisible(true)}
            fullWidth
            leftIcon={<Ionicons name="add" size={20} color="#FFF" />}
          />
        </View>
      </View>

      <Modal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        title="Add New Address">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View>
                <Text className="mb-2 text-sm font-semibold" style={{ color: colors.ui.textMuted }}>
                  Type
                </Text>
                <View className="flex-row gap-2">
                  {(['Home', 'Work', 'Custom'] as AddressType[]).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setNewType(type)}
                      className="flex-1 items-center rounded-xl border py-2"
                      style={{
                        backgroundColor:
                          newType === type ? `${colors.primary['500']}15` : colors.ui.surface,
                        borderColor: newType === type ? colors.primary['500'] : colors.ui.border,
                      }}>
                      <Text
                        className="font-medium"
                        style={{
                          color: newType === type ? colors.primary['600'] : colors.ui.text,
                        }}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {newType === 'Custom' && (
                <Input
                  label="Custom Name"
                  value={newCustomName}
                  onChangeText={setNewCustomName}
                  placeholder="e.g. Gym, Partner's House"
                />
              )}

              <Input
                label="Street Address"
                value={newStreet}
                onChangeText={setNewStreet}
                placeholder="123 Main St"
              />

              <Input
                label="Apt, Suite, City, Zip"
                value={newDetails}
                onChangeText={setNewDetails}
                placeholder="Apt 4B, New York, NY 10001"
              />

              <View className="mt-4">
                <Button label="Save Address" onPress={handleSave} fullWidth />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Address action menu (3 dots) */}
      <Modal
        visible={!!actionAddress}
        onClose={() => setActionAddress(null)}
        title={
          actionAddress
            ? `Manage ${actionAddress.type === 'Custom' ? actionAddress.customName : actionAddress.type}`
            : ''
        }>
        <View className="gap-3">
          <Pressable
            onPress={() => {
              const addr = actionAddress;
              setActionAddress(null);
              setDeleteTarget(addr);
            }}
            className="flex-row items-center gap-3 rounded-xl p-4"
            style={{ backgroundColor: '#FEE2E2' }}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
            <Text className="text-[16px] font-semibold" style={{ color: '#EF4444' }}>
              Delete Address
            </Text>
          </Pressable>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Address"
        message={`Are you sure you want to delete "${deleteTarget?.type === 'Custom' ? deleteTarget?.customName : deleteTarget?.type}" at ${deleteTarget?.street}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (deleteTarget) {
            setAddresses(addresses.filter((a) => a.id !== deleteTarget.id));
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}
