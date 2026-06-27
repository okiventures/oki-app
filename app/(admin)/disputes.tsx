import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { Table, TableColumn } from '../../src/components/admin/Table';
import { useAdmin } from '../../src/context/AdminContext';
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

export default function AdminDisputes() {
  const { disputes } = useAdmin();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);

  const filteredDisputes = useMemo(
    () =>
      disputes.filter((item) => {
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
    [searchValue, statusFilter, disputes]
  );

  const disputeColumns: TableColumn<(typeof filteredDisputes)[number]>[] = [
    {
      key: 'status',
      title: 'Status',
      width: 120,
      render: (item) => <Badge text={item.status} variant={statusVariant(item.status)} />,
    },
    {
      key: 'booking',
      title: 'Booking',
      width: 100,
      render: (item) => <Text className="text-[13px] text-gray-700">{item.bookingId}</Text>,
    },
    {
      key: 'client',
      title: 'Client',
      width: 140,
      render: (item) => <Text className="text-[13px] text-gray-700">{item.clientName}</Text>,
    },
    {
      key: 'worker',
      title: 'Worker',
      width: 140,
      render: (item) => <Text className="text-[13px] text-gray-700">{item.handymanName}</Text>,
    },
    {
      key: 'reason',
      title: 'Reason',
      width: 200,
      render: (item) => (
        <Text className="text-[13px] text-gray-700" numberOfLines={2}>
          {item.reason}
        </Text>
      ),
    },
    {
      key: 'createdAt',
      title: 'Reported',
      width: 120,
      render: (item) => (
        <Text className="text-[12px] text-gray-600">{formatDateTime(item.createdAt)}</Text>
      ),
    },
  ];

  const expandedDispute = filteredDisputes.find((item) => item.id === expandedDisputeId) ?? null;

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Disputes" />
      <View className="px-4 py-4">
        <Text className="mb-3 text-[13px] font-bold text-gray-900">Active Resolutions</Text>
        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by dispute ID, booking, client, or worker"
        />

        <View className="mt-3 mb-4 flex-row flex-wrap gap-2">
          {DISPUTE_STATUS_OPTIONS.map((status) => (
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

        <Table
          columns={disputeColumns}
          data={filteredDisputes}
          keyExtractor={(item) => item.id}
          onRowPress={(item) =>
            setExpandedDisputeId(expandedDisputeId === item.id ? null : item.id)
          }
        />

        {!filteredDisputes.length && (
          <Text className="mt-4 text-[12px] text-gray-500">
            No disputes match your search or filter.
          </Text>
        )}

        {expandedDispute && (
          <Card className="mt-4 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[15px] font-bold text-gray-900">{expandedDispute.reason}</Text>
              <Badge
                text={expandedDispute.status}
                variant={statusVariant(expandedDispute.status)}
              />
            </View>
            <Text className="mb-1 text-[12px] text-gray-600">
              Booking reference: {expandedDispute.bookingId}
            </Text>
            <Text className="mb-1 text-[12px] text-gray-600">
              Client: {expandedDispute.clientName}
            </Text>
            <Text className="mb-1 text-[12px] text-gray-600">
              Worker: {expandedDispute.handymanName}
            </Text>
            <Text className="mb-1 text-[12px] text-gray-600">
              Reported at: {formatDateTime(expandedDispute.createdAt)}
            </Text>
            <Text className="mt-3 text-[12px] text-gray-600">
              Evidence: Chat log and uploaded photos available.
            </Text>
            <Text className="text-[12px] text-gray-600">
              Admin actions: Confirm refund, request more information, or close dispute.
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
}
