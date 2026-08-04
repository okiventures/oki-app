import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { useBookings } from '../../src/context/BookingsContext';
import { formatCurrency, formatDate } from '../../src/utils';

const statusVariant = (status: string) => {
  switch (status) {
    case 'Pending':
    case 'Accepted':
      return 'warning';
    case 'InTransit':
    case 'Arrived':
    case 'WorkStarted':
      return 'primary';
    case 'Completed':
    case 'Paid':
      return 'success';
    case 'Cancelled':
      return 'error';
    default:
      return 'status';
  }
};

const typeVariant = (type: string) => (type === 'OnDemand' ? 'primary' : 'status');
const BOOKING_STATUS_OPTIONS = [
  'All',
  'Pending',
  'Accepted',
  'InTransit',
  'Arrived',
  'WorkStarted',
  'Completed',
  'Paid',
  'Cancelled',
];

export default function AdminBookings() {
  // RLS gives admins every booking through bookings_admin, so the shared
  // context is already the whole platform when an admin is signed in.
  const { bookings, isLoading } = useBookings();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          booking.id.toLowerCase().includes(query) ||
          booking.clientName.toLowerCase().includes(query) ||
          booking.handymanName.toLowerCase().includes(query) ||
          booking.serviceCategory.toLowerCase().includes(query) ||
          booking.location.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' ? true : booking.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [bookings, searchValue, statusFilter]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Bookings Management" />
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            <Text className="mb-3 px-1 text-[13px] font-bold text-gray-900">
              Booking queue and history
            </Text>
            <SearchBar
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search by booking, client, worker, or service"
            />
            <View className="mt-3 mb-4 flex-row flex-wrap gap-2">
              {BOOKING_STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-2 ${statusFilter === status ? 'bg-primary-600' : 'bg-gray-100'}`}>
                  <Text
                    className={`${statusFilter === status ? 'text-white' : 'text-gray-700'} text-[12px] font-semibold`}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#4F46E5" />
          ) : (
            <Text className="px-1 text-[12px] text-gray-500">
              No bookings match your search or filter.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const isExpanded = expandedBookingId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setExpandedBookingId(isExpanded ? null : item.id)}
              activeOpacity={0.9}
              className="mb-3">
              <Card className="p-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-gray-900">
                    {item.serviceCategory}
                  </Text>
                  <Badge text={item.bookingType} variant={typeVariant(item.bookingType)} />
                </View>
                <Text className="mb-2 text-[13px] text-gray-600">{item.description}</Text>
                <View className="mb-2 flex-row items-center justify-between">
                  <Badge text={item.status} variant={statusVariant(item.status)} />
                  <Text className="text-[12px] text-gray-500">
                    {formatDate(item.scheduledAt || item.createdAt)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] font-semibold text-gray-900">
                    {formatCurrency(item.amount)}
                  </Text>
                  <Text className="text-[12px] text-gray-500">
                    Net {formatCurrency(item.netAmount)}
                  </Text>
                </View>
                {isExpanded && (
                  <View className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <Text className="text-[12px] text-gray-600">Client: {item.clientName}</Text>
                    <Text className="text-[12px] text-gray-600">Worker: {item.handymanName}</Text>
                    <Text className="text-[12px] text-gray-600">Location: {item.location}</Text>
                    <Text className="text-[12px] text-gray-600">
                      Status updated: {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
