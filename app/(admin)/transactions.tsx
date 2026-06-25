import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { MOCK_TRANSACTIONS } from '../../src/mocks';
import { formatCurrency, formatDateTime } from '../../src/utils';

const statusVariant = (status: string) => {
  switch (status) {
    case 'Authorized':
      return 'warning';
    case 'Captured':
      return 'success';
    case 'Failed':
      return 'error';
    case 'Refunded':
      return 'error';
    default:
      return 'status';
  }
};

const TRANSACTION_STATUS_OPTIONS = ['All', 'Authorized', 'Captured', 'Failed', 'Refunded'];

export default function AdminTransactions() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  const filteredTransactions = useMemo(
    () =>
      MOCK_TRANSACTIONS.filter((item) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          item.bookingId.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query) ||
          item.handymanName.toLowerCase().includes(query) ||
          item.paymentMethod.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [searchValue, statusFilter]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Transactions" />
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            <Text className="mb-3 px-1 text-[13px] font-bold text-gray-900">Transaction log</Text>
            <SearchBar
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search by booking, client, worker, or method"
            />
            <View className="mt-3 mb-4 flex-row flex-wrap gap-2">
              {TRANSACTION_STATUS_OPTIONS.map((status) => (
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
          <Text className="px-1 text-[12px] text-gray-500">
            No transactions match your search or filter.
          </Text>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedTransactionId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setExpandedTransactionId(isExpanded ? null : item.id)}
              activeOpacity={0.9}
              className="mb-3">
              <Card className="p-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[15px] font-bold text-gray-900">
                    {formatCurrency(item.amount)}
                  </Text>
                  <Badge text={item.status} variant={statusVariant(item.status)} />
                </View>
                <Text className="mb-2 text-[13px] text-gray-600">Booking {item.bookingId}</Text>
                <Text className="mb-2 text-[13px] text-gray-600">
                  {item.clientName} → {item.handymanName}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] text-gray-500">{item.paymentMethod}</Text>
                  <Text className="text-[11px] text-gray-400">
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                {isExpanded && (
                  <View className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <Text className="text-[12px] text-gray-600">
                      Authorized: {item.authorizedAt ? formatDateTime(item.authorizedAt) : 'N/A'}
                    </Text>
                    <Text className="text-[12px] text-gray-600">
                      Captured: {item.capturedAt ? formatDateTime(item.capturedAt) : 'N/A'}
                    </Text>
                    <Text className="text-[12px] text-gray-600">
                      Settled: {item.settledAt ? formatDateTime(item.settledAt) : 'N/A'}
                    </Text>
                    <Text className="text-[12px] text-gray-600">
                      Platform fee: {formatCurrency(item.platformFee)}
                    </Text>
                    <Text className="text-[12px] text-gray-600">
                      Net paid: {formatCurrency(item.netAmount)}
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
