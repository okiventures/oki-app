import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormLabel } from './FormLabel';
import { FormError } from './FormError';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  required,
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-2">
      {label && <FormLabel label={label} required={required} />}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityLabel={label ?? 'Select option'}
        className={`flex-row items-center justify-between border ${error ? 'border-red-500' : 'border-gray-200'} rounded-xl bg-gray-50 px-3 py-3.5`}>
        <Text className={`text-[15px] ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>
      {error && <FormError error={error} />}

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          className="flex-1 justify-end bg-black/40"
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View className="rounded-t-3xl bg-white pt-2 pb-8">
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-gray-200" />
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`px-5 py-3.5 ${item.value === value ? 'bg-primary-50' : 'transparent'}`}>
                  <Text
                    className={`text-[15px] ${item.value === value ? 'text-primary-700 font-semibold' : 'text-gray-900'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}
