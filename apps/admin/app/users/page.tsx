'use client';

import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { MOCK_KYC_REQUESTS, MOCK_ADMIN_USERS } from '../data/mockData';
import { formatDate } from '../utils';
import { FileText } from 'lucide-react';

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

export default function UsersPage() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return MOCK_ADMIN_USERS.filter((user) => {
      const query = searchValue.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'All' ? true : user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchValue, statusFilter]);

  return (
    <div className="flex h-full flex-col">
      <Navbar title="User Management" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Card className="p-3">
            <p className="text-[11px] font-medium text-gray-500">Total Users</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{MOCK_ADMIN_USERS.length}</p>
            <p className="mt-1 text-[10px] font-bold text-gray-500">Clients + Workers</p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] font-medium text-gray-500">Pending KYC</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{MOCK_KYC_REQUESTS.length}</p>
            <p className="mt-1 text-[10px] font-bold text-amber-700">Needs review</p>
          </Card>
        </div>

        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by name, email, or phone"
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-2 ${
                statusFilter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              } text-[12px] font-semibold`}>
              {status}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-3 text-[13px] font-bold text-gray-900">Pending KYC Verifications</p>
          {MOCK_KYC_REQUESTS.map((item) => (
            <Card key={item.id} className="mb-3 flex flex-row items-center p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <FileText size={16} className="text-gray-600" strokeWidth={2} fill="none" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-[15px] font-bold text-gray-900">{item.handymanName}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{item.serviceCategory}</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Submitted {formatDate(item.submittedAt)}
                </p>
              </div>
              <div className="flex items-end gap-2">
                <Badge text={item.status} variant="warning" />
                <button className="text-primary-600 text-[11px] font-bold">Review</button>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p className="mb-3 text-[13px] font-bold text-gray-900">Recent Users</p>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedUserId === user.id;
              return (
                <Card
                  key={user.id}
                  className="mb-3 p-3"
                  onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                  style={{ cursor: 'pointer' }}>
                  <div className="flex flex-row items-center justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">{user.name}</p>
                      <p className="text-[11px] text-gray-500">{user.email}</p>
                    </div>
                    <Badge text={user.status} variant={statusBadge(user.status)} />
                  </div>
                  {isSelected && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-[12px] text-gray-600">Phone: {user.phone}</p>
                      <p className="text-[12px] text-gray-600">
                        Joined {formatDate(user.createdAt)}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Last active {formatDate(user.lastActive || user.createdAt)}
                      </p>
                      <div className="flex flex-row gap-2">
                        <button className="flex-1 items-center rounded-xl bg-gray-100 py-2 text-[12px] font-semibold text-gray-700">
                          Suspend
                        </button>
                        <button className="bg-primary-600 flex-1 items-center rounded-xl py-2 text-[12px] font-semibold text-white">
                          Message
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <p className="text-[12px] text-gray-500">No users match your search or filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}
