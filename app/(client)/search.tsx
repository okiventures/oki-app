import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceRequest() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [description, setDescription] = useState('');
  const [timeMode, setTimeMode] = useState<'asap' | 'schedule'>('asap');

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title={`Request ${category || 'Service'}`} showBack />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text className="font-heading text-xl text-gray-900 mb-2">Describe the issue</Text>
        <Text className="text-[13px] text-gray-500 mb-4">This helps us match you with the right professional for the job.</Text>

        <Input 
          label="Issue Description"
          required
          value={description} 
          onChangeText={setDescription} 
          placeholder="E.g., The sink is leaking from the P-trap..." 
          multiline 
          numberOfLines={4}
          className="h-32"
        />

        <Text className="font-heading text-base text-gray-900 mt-4 mb-2">When do you need it?</Text>
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity 
            onPress={() => setTimeMode('asap')}
            className={`flex-1 items-center justify-center py-4 rounded-xl border-2 ${timeMode === 'asap' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
          >
            <Ionicons name="flash" size={24} color={timeMode === 'asap' ? '#4F46E5' : '#9CA3AF'} className="mb-2" />
            <Text className={`text-[15px] font-bold ${timeMode === 'asap' ? 'text-primary-700' : 'text-gray-500'}`}>ASAP</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setTimeMode('schedule')}
            className={`flex-1 items-center justify-center py-4 rounded-xl border-2 ${timeMode === 'schedule' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
          >
            <Ionicons name="calendar" size={24} color={timeMode === 'schedule' ? '#4F46E5' : '#9CA3AF'} className="mb-2" />
            <Text className={`text-[15px] font-bold ${timeMode === 'schedule' ? 'text-primary-700' : 'text-gray-500'}`}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {timeMode === 'schedule' && (
          <Input 
            label="Preferred Date & Time"
            value="Tomorrow, 10:00 AM" 
            editable={false} 
            rightIcon={<Ionicons name="chevron-down" size={18} color="#9CA3AF" />} 
          />
        )}
      </ScrollView>

      <View className="border-t border-gray-200 bg-white p-3">
        <Button 
          label="Find Available Worker" 
          onPress={() => router.replace('/(client)/bookings')}
          fullWidth
          disabled={!description.trim()}
        />
        <Text className="text-[11px] text-center text-gray-400 mt-3">
          You will be randomly paired with a qualified worker.
        </Text>
      </View>
    </View>
  );
}
