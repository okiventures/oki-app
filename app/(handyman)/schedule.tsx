import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { TabBar } from '../../src/components/navigation/TabBar';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { MOCK_BOOKINGS } from '../../src/mocks';

export default function HandymanSchedule() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const myBookings = MOCK_BOOKINGS.filter(b => b.handymanId === 'h1');
  
  const filteredBookings = myBookings.filter((b) => {
    if (activeTab === 'upcoming')
      return b.status !== 'Completed' && b.status !== 'Paid' && b.status !== 'Cancelled';
    return b.status === 'Paid' || b.status === 'Completed' || b.status === 'Cancelled';
  });

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="My Schedule" />
      <View className="bg-white">
        <TabBar
          tabs={[
            { key: 'upcoming', label: 'Upcoming Jobs' },
            { key: 'history', label: 'History' },
          ]}
          activeKey={activeTab}
          onTabPress={setActiveTab}
        />
      </View>
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <BookingCard 
            booking={item} 
            userType="handyman" 
            onPress={() => {}} 
          />
        )}
      />
    </View>
  );
}
