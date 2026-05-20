import React, { useState } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { TabBar } from '../../src/components/navigation/TabBar';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { MOCK_BOOKINGS } from '../../src/mocks';
import { SearchBar } from '../../src/components/forms/SearchBar';

export default function ClientBookings() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredBookings = MOCK_BOOKINGS.filter((b) => {
    if (activeTab === 'upcoming')
      return b.status !== 'Completed' && b.status !== 'Paid' && b.status !== 'Cancelled';
    return b.status === 'Paid' || b.status === 'Completed' || b.status === 'Cancelled';
  });

  const visibleBookings = filteredBookings
    .filter((b) => {
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        b.description?.toLowerCase().includes(s) ||
        b.handymanName?.toLowerCase().includes(s) ||
        b.clientName?.toLowerCase().includes(s) ||
        String(b.serviceCategory).toLowerCase().includes(s)
      );
    })
    .filter((b) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return b.status !== 'Completed' && b.status !== 'Paid' && b.status !== 'Cancelled';
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
        <View className="px-4 py-3">
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search bookings, services or provider…"
            onFilterPress={() => setShowFilters((s) => !s)}
          />

          {showFilters && (
            <View className="flex-row items-center gap-2 mt-3">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'completed', label: 'Completed' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setStatusFilter(f.key as any)}
                  className={`px-3 py-1 rounded-full ${statusFilter === f.key ? 'bg-primary-600' : 'bg-gray-200'}`}>
                  <Text className={`${statusFilter === f.key ? 'text-white' : 'text-gray-800'}`}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      <FlatList
        data={visibleBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            userType="client"
            onPress={() => { }}
            onRebook={activeTab === 'history' ? () => { } : undefined}
          />
        )}
      />
    </View>
  );
}
