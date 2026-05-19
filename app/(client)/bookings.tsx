import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { TabBar } from '../../src/components/navigation/TabBar';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { MOCK_BOOKINGS } from '../../src/mocks';

export default function ClientBookings() {
  const [activeTab, setActiveTab] = useState('upcoming');

  const filteredBookings = MOCK_BOOKINGS.filter((b) => {
    if (activeTab === 'upcoming')
      return b.status !== 'Completed' && b.status !== 'Paid' && b.status !== 'Cancelled';
    return b.status === 'Paid' || b.status === 'Completed' || b.status === 'Cancelled';
  });

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="My Bookings" />
      <View className="bg-white">
        <TabBar
          tabs={[
            { key: 'upcoming', label: 'Active & Upcoming' },
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
            userType="client"
            onPress={() => {}}
            onRebook={activeTab === 'history' ? () => {} : undefined}
          />
        )}
      />
    </View>
  );
}
