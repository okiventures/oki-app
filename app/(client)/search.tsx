import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Navbar } from '../../src/components/navigation/Navbar';
import { FormField } from '../../src/components/forms/FormField';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceRequest() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [description, setDescription] = useState('');
  const [timeMode, setTimeMode] = useState<'asap' | 'schedule'>('asap');

  return (
    <View className="flex-1 bg-white">
      <Navbar title={`Request ${category || 'Service'}`} showBack />
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text className="font-heading text-2xl text-gray-900 mb-2">Describe the issue</Text>
        <Text className="text-sm text-gray-500 mb-6">This helps us match you with the right professional for the job.</Text>

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

        <Text className="font-heading text-lg text-gray-900 mt-6 mb-3">When do you need it?</Text>
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity 
            onPress={() => setTimeMode('asap')}
            className={`flex-1 items-center justify-center py-6 rounded-2xl border-2 ${timeMode === 'asap' ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-gray-50'}`}
          >
            <Ionicons name="flash" size={28} color={timeMode === 'asap' ? '#4F46E5' : '#9CA3AF'} className="mb-2" />
            <Text className={`text-[15px] font-bold ${timeMode === 'asap' ? 'text-primary-700' : 'text-gray-500'}`}>ASAP</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setTimeMode('schedule')}
            className={`flex-1 items-center justify-center py-6 rounded-2xl border-2 ${timeMode === 'schedule' ? 'border-primary-500 bg-primary-50' : 'border-transparent bg-gray-50'}`}
          >
            <Ionicons name="calendar" size={28} color={timeMode === 'schedule' ? '#4F46E5' : '#9CA3AF'} className="mb-2" />
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

      <View className="p-5 bg-white border-t border-gray-100 absolute bottom-0 left-0 right-0">
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
