import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { MOCK_KYC_REQUESTS, MOCK_ADMIN_USERS } from '../../src/mocks';
import { formatDate } from '../../src/utils';

const statusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Suspended':
      return 'warning';
    case 'Banned':
      return 'error';
    default:
      return 'status';
  }
};

const STATUS_OPTIONS = ['All', 'Active', 'Suspended', 'Banned'];

type SuspendTarget = { id: string; name: string } | null;
type KycTarget = { id: string; name: string; action: 'approve' | 'reject' } | null;

export default function AdminUsers() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget>(null);
  const [kycTarget, setKycTarget] = useState<KycTarget>(null);

  const filteredUsers = useMemo(
    () =>
      MOCK_ADMIN_USERS.filter((user) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phone.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === 'All' ? true : user.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [searchValue, statusFilter]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="User Management" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Text className="text-[11px] text-gray-500 font-medium">Total Users</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{MOCK_ADMIN_USERS.length}</Text>
            <Text className="text-[10px] text-gray-500 font-bold mt-1">Clients + Workers</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Text className="text-[11px] text-gray-500 font-medium">Pending KYC</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{MOCK_KYC_REQUESTS.length}</Text>
            <Text className="text-[10px] text-amber-700 font-bold mt-1">Needs review</Text>
          </Card>
        </View>

        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by name, email, or phone"
          accessibilityLabel="Search users"
        />

        <View className="flex-row flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
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

        {/* KYC Queue */}
        <View>
          <Text className="text-[13px] font-bold text-gray-900 mb-3">Pending KYC Verifications</Text>
          {MOCK_KYC_REQUESTS.map((item) => (
            <Card key={item.id} className="mb-3 p-3 flex-row items-center">
              <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-[15px] font-bold text-gray-900">{item.handymanName}</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">{item.serviceCategory}</Text>
                <Text className="text-[11px] text-gray-400 mt-1">Submitted {formatDate(item.submittedAt)}</Text>
              </View>
              <View className="items-end gap-2">
                <Badge text={item.status} variant="warning" />
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    accessibilityLabel={`Approve KYC for ${item.handymanName}`}
                    onPress={() => setKycTarget({ id: item.id, name: item.handymanName, action: 'approve' })}
                    className="rounded-lg bg-green-100 px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-green-700">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel={`Reject KYC for ${item.handymanName}`}
                    onPress={() => setKycTarget({ id: item.id, name: item.handymanName, action: 'reject' })}
                    className="rounded-lg bg-red-100 px-2.5 py-1">
                    <Text className="text-[11px] font-bold text-red-700">Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* User List */}
        <View>
          <Text className="text-[13px] font-bold text-gray-900 mb-3">Recent Users</Text>
          {filteredUsers.map((user) => {
            const isSelected = selectedUserId === user.id;
            return (
              <Card key={user.id} className="mb-3 p-3">
                <TouchableOpacity
                  onPress={() => setSelectedUserId(isSelected ? null : user.id)}
                  accessibilityLabel={`${user.name} user details`}
                  className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[15px] font-bold text-gray-900">{user.name}</Text>
                    <Text className="text-[11px] text-gray-500">{user.email}</Text>
                  </View>
                  <Badge text={user.status} variant={statusBadge(user.status)} />
                </TouchableOpacity>
                {isSelected && (
                  <View className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <Text className="text-[12px] text-gray-600">Phone: {user.phone}</Text>
                    <Text className="text-[12px] text-gray-600">Joined {formatDate(user.createdAt)}</Text>
                    <Text className="text-[12px] text-gray-600">Last active {formatDate(user.lastActive || user.createdAt)}</Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        accessibilityLabel={`Suspend ${user.name}`}
                        onPress={() => setSuspendTarget({ id: user.id, name: user.name })}
                        className="flex-1 bg-red-50 border border-red-100 rounded-xl py-2 items-center">
                        <Text className="text-[12px] font-semibold text-red-600">Suspend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityLabel={`Message ${user.name}`}
                        className="flex-1 bg-primary-600 rounded-xl py-2 items-center">
                        <Text className="text-[12px] font-semibold text-white">Message</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            );
          })}
          {filteredUsers.length === 0 && (
            <Text className="text-[12px] text-gray-500">No users match your search or filter.</Text>
          )}
        </View>
      </ScrollView>

      {/* Suspend Confirm Dialog */}
      <ConfirmDialog
        visible={suspendTarget !== null}
        title="Suspend this user?"
        message={`${suspendTarget?.name ?? 'This user'} will lose access to the platform immediately. You can reinstate them at any time.`}
        confirmLabel="Yes, Suspend"
        cancelLabel="Cancel"
        danger
        onConfirm={() => setSuspendTarget(null)}
        onCancel={() => setSuspendTarget(null)}
      />

      {/* KYC Action Confirm Dialog */}
      <ConfirmDialog
        visible={kycTarget !== null}
        title={kycTarget?.action === 'approve' ? 'Approve KYC submission?' : 'Reject KYC submission?'}
        message={
          kycTarget?.action === 'approve'
            ? `${kycTarget?.name ?? 'This handyman'} will be marked as verified and become searchable by clients.`
            : `${kycTarget?.name ?? 'This handyman'} will be notified of the rejection and asked to resubmit their documents.`
        }
        confirmLabel={kycTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        cancelLabel="Cancel"
        danger={kycTarget?.action === 'reject'}
        onConfirm={() => setKycTarget(null)}
        onCancel={() => setKycTarget(null)}
      />
    </View>
  );
}
