import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { Modal } from '../../src/components/ui/Modal';
import { Table, TableColumn } from '../../src/components/admin/Table';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { useAdmin, type AdminKycDocument } from '../../src/context/AdminContext';
import { formatDate } from '../../src/utils';

type DialogInfo = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

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

export default function AdminUsers() {
  const {
    users,
    kycRequests,
    loadingKyc,
    kycStatus,
    setKycStatus,
    suspendUser,
    approveHandyman,
    rejectHandyman,
  } = useAdmin();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dialogInfo, setDialogInfo] = useState<DialogInfo>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    danger: false,
    onConfirm: () => {},
  });

  // KYC preview state
  const [previewDoc, setPreviewDoc] = useState<AdminKycDocument | null>(null);

  // Rejection modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.phone.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' ? true : user.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [users, searchValue, statusFilter]
  );

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const openDialog = (dialog: Omit<DialogInfo, 'visible'>) => {
    setDialogInfo({ visible: true, ...dialog });
  };

  const closeDialog = () => setDialogInfo((prev) => ({ ...prev, visible: false }));

  const handleSuspendUser = (userId: string) => {
    openDialog({
      title: 'Suspend user',
      message: 'Suspend this user and block access until the account is reinstated.',
      confirmLabel: 'Suspend user',
      danger: true,
      onConfirm: () => {
        suspendUser(userId);
        closeDialog();
      },
    });
  };

  const handleApproveRequest = (handymanId: string) => {
    openDialog({
      title: 'Approve KYC submission',
      message: 'Approve all documents for this handyman and mark them as verified.',
      confirmLabel: 'Approve All',
      danger: false,
      onConfirm: () => {
        approveHandyman(handymanId);
        closeDialog();
      },
    });
  };

  const handleRejectStart = (handymanId: string) => {
    setRejectTarget(handymanId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;
    rejectHandyman(rejectTarget, rejectReason.trim() || undefined);
    setRejectModalVisible(false);
    setRejectTarget(null);
    setRejectReason('');
  };

  const userColumns: TableColumn<(typeof users)[number]>[] = [
    {
      key: 'name',
      title: 'Name',
      width: 180,
      render: (user) => (
        <View>
          <Text className="text-[13px] font-semibold text-gray-900">{user.name}</Text>
          <Text className="text-[11px] text-gray-500">{user.userType}</Text>
        </View>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      width: 220,
      render: (user) => <Text className="text-[13px] text-gray-700">{user.email}</Text>,
    },
    { key: 'phone', title: 'Phone', width: 150 },
    {
      key: 'status',
      title: 'Status',
      width: 120,
      render: (user) => <Badge text={user.status} variant={statusBadge(user.status)} />,
    },
    {
      key: 'joined',
      title: 'Joined',
      width: 120,
      render: (user) => (
        <Text className="text-[12px] text-gray-600">{formatDate(user.createdAt)}</Text>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 160,
      render: (user) => (
        <TouchableOpacity
          onPress={() => handleSuspendUser(user.id)}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-2">
          <Text className="text-[12px] font-semibold text-red-600">Suspend</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="User Management" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Text className="text-[11px] font-medium text-gray-500">Total Users</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">{users.length}</Text>
            <Text className="mt-1 text-[10px] font-bold text-gray-500">Clients + Workers</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Text className="text-[11px] font-medium text-gray-500">Pending KYC</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">{kycRequests.length}</Text>
          </Card>
        </View>

        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by name, email, or phone"
        />

        <View className="flex-row flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
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

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[13px] font-bold text-gray-900">KYC Verifications</Text>
          </View>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setKycStatus(status)}
                className={`rounded-full px-3 py-1.5 ${kycStatus === status ? (status === 'APPROVED' ? 'bg-emerald-600' : status === 'REJECTED' ? 'bg-red-600' : 'bg-gray-800') : 'bg-gray-100'}`}>
                <Text
                  className={`${kycStatus === status ? 'text-white' : 'text-gray-600'} text-[11px] font-semibold`}>
                  {status === 'PENDING'
                    ? 'Pending'
                    : status === 'APPROVED'
                      ? 'Approved'
                      : 'Rejected'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loadingKyc ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#6366F1" />
              <Text className="mt-2 text-[12px] text-gray-500">Loading KYC requests...</Text>
            </View>
          ) : kycRequests.length === 0 ? (
            <Text className="text-[12px] text-gray-500">
              No {kycStatus.toLowerCase()} KYC requests available.
            </Text>
          ) : (
            kycRequests.map((item) => (
              <Card key={item.handymanId} className="mb-3 p-3">
                <View className="flex-row items-start gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Ionicons name="person-outline" size={18} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-gray-900">{item.handymanName}</Text>
                    <Text className="text-[11px] text-gray-500">{item.handymanEmail}</Text>
                    <Text className="mt-1 text-[11px] text-gray-400">
                      Submitted {formatDate(item.submittedAt)}
                    </Text>
                  </View>
                </View>

                {item.documents.map((doc) => (
                  <View
                    key={doc.id}
                    className="mt-3 flex-row items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <TouchableOpacity
                      onPress={() => (doc.url ? setPreviewDoc(doc) : null)}
                      disabled={!doc.url}
                      className="h-16 w-16 items-center justify-center overflow-hidden rounded-lg"
                      style={{ backgroundColor: '#E5E7EB' }}>
                      {doc.url ? (
                        <Image
                          source={{ uri: doc.url }}
                          style={{ width: 64, height: 64 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="cloud-offline-outline" size={24} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold text-gray-900">{doc.label}</Text>
                      {doc.status !== 'PENDING' ? (
                        <Text
                          className={`mt-0.5 text-[11px] font-medium ${doc.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {doc.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => setPreviewDoc(doc)}
                      className="rounded-full border border-gray-300 px-3 py-1.5">
                      <Ionicons name="eye-outline" size={14} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                ))}

                {kycStatus === 'PENDING' ? (
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleApproveRequest(item.handymanId)}
                      className="flex-1 items-center rounded-full bg-emerald-600 py-2">
                      <Text className="text-[12px] font-semibold text-white">Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRejectStart(item.handymanId)}
                      className="flex-1 items-center rounded-full bg-red-50 py-2">
                      <Text className="text-[12px] font-semibold text-red-600">Reject</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </View>

        <View>
          <Text className="mb-3 text-[13px] font-bold text-gray-900">Recent Users</Text>
          <Table
            columns={userColumns}
            data={filteredUsers}
            keyExtractor={(user) => user.id}
            onRowPress={(user) => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
          />

          {selectedUser && (
            <Card className="mt-4 p-4">
              <Text className="mb-2 text-[14px] font-bold text-gray-900">{selectedUser.name}</Text>
              <Text className="mb-1 text-[12px] text-gray-600">Email: {selectedUser.email}</Text>
              <Text className="mb-1 text-[12px] text-gray-600">Phone: {selectedUser.phone}</Text>
              <Text className="mb-1 text-[12px] text-gray-600">
                Joined: {formatDate(selectedUser.createdAt)}
              </Text>
              <Text className="mb-3 text-[12px] text-gray-600">
                Last active: {formatDate(selectedUser.lastActive || selectedUser.createdAt)}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => handleSuspendUser(selectedUser.id)}
                  className="flex-1 items-center rounded-full bg-red-50 py-2">
                  <Text className="text-[12px] font-semibold text-red-600">Suspend</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-primary-600 flex-1 items-center rounded-full py-2">
                  <Text className="text-[12px] font-semibold text-white">Message</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={dialogInfo.visible}
        title={dialogInfo.title}
        message={dialogInfo.message}
        confirmLabel={dialogInfo.confirmLabel}
        cancelLabel={dialogInfo.cancelLabel}
        danger={dialogInfo.danger}
        onConfirm={dialogInfo.onConfirm}
        onCancel={closeDialog}
      />

      {/* Document preview modal */}
      <Modal
        visible={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={`${previewDoc?.label ?? 'Document'} Preview`}>
        {previewDoc?.url ? (
          <View className="items-center">
            <Image
              source={{ uri: previewDoc.url }}
              className="h-72 w-full rounded-lg bg-gray-100"
              resizeMode="contain"
            />
          </View>
        ) : (
          <View className="items-center py-8">
            <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
            <Text className="mt-2 text-[13px] text-gray-500">Document preview not available</Text>
          </View>
        )}
      </Modal>

      {/* Rejection reason modal */}
      <Modal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setRejectTarget(null);
        }}
        title="Reject KYC Submission">
        <View className="gap-3">
          <Text className="text-[13px] text-gray-600">
            Provide a reason for rejection so the handyman knows how to resubmit.
          </Text>
          <TextInput
            className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 text-[14px] text-gray-900"
            placeholder="e.g., Unreadable image, ID does not match name..."
            placeholderTextColor="#9CA3AF"
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                setRejectModalVisible(false);
                setRejectTarget(null);
              }}
              className="flex-1 rounded-full bg-gray-100 py-3">
              <Text className="text-center text-[13px] font-semibold text-gray-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRejectConfirm}
              className="flex-1 rounded-full bg-red-600 py-3">
              <Text className="text-center text-[13px] font-semibold text-white">Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
