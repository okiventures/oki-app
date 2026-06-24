import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { MOCK_DISPUTES } from '../../src/mocks';
import { formatDateTime } from '../../src/utils';

const statusVariant = (status: string) => {
  switch (status) {
    case 'Open':
      return 'error';
    case 'Investigating':
      return 'warning';
    case 'Resolved':
      return 'success';
    case 'Closed':
      return 'status';
    default:
      return 'status';
  }
};

const DISPUTE_STATUS_OPTIONS = ['All', 'Open', 'Investigating', 'Resolved', 'Closed'];

type ResolveTarget = { id: string; reason: string } | null;

export default function AdminDisputes() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget>(null);

  const filteredDisputes = useMemo(
    () =>
      MOCK_DISPUTES.filter((item) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          item.id.toLowerCase().includes(query) ||
          item.bookingId.toLowerCase().includes(query) ||
          item.clientName.toLowerCase().includes(query) ||
          item.handymanName.toLowerCase().includes(query) ||
          item.reason.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [searchValue, statusFilter]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Disputes" />
      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            <Text className="text-[13px] font-bold text-gray-900 mb-3 px-1">Active Resolutions</Text>
            <SearchBar
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search by dispute ID, booking, client, or worker"
              accessibilityLabel="Search disputes"
            />
            <View className="flex-row flex-wrap gap-2 mt-3 mb-4">
              {DISPUTE_STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  accessibilityLabel={`Filter by ${status}`}
                  className={`rounded-full px-3 py-2 ${statusFilter === status ? 'bg-primary-600' : 'bg-gray-100'}`}>
                  <Text className={`${statusFilter === status ? 'text-white' : 'text-gray-700'} text-[12px] font-semibold`}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <Text className="text-[12px] text-gray-500 px-1">No disputes match your search or filter.</Text>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedDisputeId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setExpandedDisputeId(isExpanded ? null : item.id)}
              activeOpacity={0.9}
              accessibilityLabel={`Dispute: ${item.reason}`}
              className="mb-3">
              <Card className="p-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Badge text={item.status} variant={statusVariant(item.status)} />
                  <Text className="text-[11px] text-gray-400">ID: {item.id}</Text>
                </View>
                <Text className="text-[15px] font-bold text-gray-900 mb-1">{item.reason}</Text>
                <Text className="text-[13px] text-gray-600 mb-3">
                  <Text className="font-semibold text-gray-800">{item.clientName}</Text>
                  {' reported '}
                  <Text className="font-semibold text-gray-800">{item.handymanName}</Text>
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    accessibilityLabel="View dispute details"
                    className="flex-1 bg-gray-100 py-2 rounded-md items-center">
                    <Text className="text-[13px] font-bold text-gray-700">Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Resolve dispute"
                    onPress={() => setResolveTarget({ id: item.id, reason: item.reason })}
                    className="flex-1 bg-gray-900 py-2 rounded-md items-center">
                    <Text className="text-[13px] font-bold text-white">Resolve</Text>
                  </TouchableOpacity>
                </View>
                {isExpanded && (
                  <View className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <Text className="text-[12px] text-gray-600">Booking reference: {item.bookingId}</Text>
                    <Text className="text-[12px] text-gray-600">Reported at: {formatDateTime(item.createdAt)}</Text>
                    <Text className="text-[12px] text-gray-600">Evidence: Chat log and uploaded photos available.</Text>
                    <Text className="text-[12px] text-gray-600">Admin actions: Confirm refund, request more information, or close dispute.</Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <ConfirmDialog
        visible={resolveTarget !== null}
        title="Resolve this dispute?"
        message={`Mark "${resolveTarget?.reason ?? 'this dispute'}" as resolved? This action will notify both parties and close the case.`}
        confirmLabel="Yes, Resolve"
        cancelLabel="Cancel"
        onConfirm={() => setResolveTarget(null)}
        onCancel={() => setResolveTarget(null)}
      />
    </View>
  );
}
