'use client';

import { useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { MOCK_BOOKINGS } from '../data/mockData';
import { formatCurrency, formatDate } from '../utils';
import { getServiceIcon } from '../utils/icons';

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

export default function BookingsPage() {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    return MOCK_BOOKINGS.filter((booking) => {
      const query = searchValue.toLowerCase();
      const matchesSearch =
        booking.id.toLowerCase().includes(query) ||
        booking.clientName.toLowerCase().includes(query) ||
        booking.handymanName.toLowerCase().includes(query) ||
        booking.serviceCategory.toLowerCase().includes(query) ||
        booking.location.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'All' ? true : booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchValue, statusFilter]);

  return (
    <div className="flex h-full flex-col">
      <Navbar title="Bookings Management" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="mb-3 px-2 text-[13px] font-bold text-gray-900">
          Booking queue and history
        </div>
        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by booking, client, worker, or service"
        />
        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          {BOOKING_STATUS_OPTIONS.map((status) => (
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

        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const isExpanded = expandedBookingId === booking.id;
            const CategoryIcon = getServiceIcon(booking.serviceCategory);
            return (
              <div
                key={booking.id}
                onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                className="mb-3 cursor-pointer">
                <Card className="p-4">
                  <div className="mb-2 flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
                        <CategoryIcon
                          size={14}
                          className="text-white"
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      </div>
                      <p className="text-[15px] font-bold text-gray-900">
                        {booking.serviceCategory}
                      </p>
                    </div>
                    <Badge text={booking.bookingType} variant={typeVariant(booking.bookingType)} />
                  </div>
                  <p className="mb-2 text-[13px] text-gray-600">{booking.description}</p>
                  <div className="mb-2 flex flex-row items-center justify-between">
                    <Badge text={booking.status} variant={statusVariant(booking.status)} />
                    <p className="text-[12px] text-gray-500">
                      {formatDate(booking.scheduledAt || booking.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-between">
                    <p className="text-[13px] font-semibold text-gray-900">
                      {formatCurrency(booking.amount)}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Net {formatCurrency(booking.netAmount)}
                    </p>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-[12px] text-gray-600">Client: {booking.clientName}</p>
                      <p className="text-[12px] text-gray-600">Worker: {booking.handymanName}</p>
                      <p className="text-[12px] text-gray-600">Location: {booking.location}</p>
                      <p className="text-[12px] text-gray-600">
                        Status updated: {formatDate(booking.updatedAt)}
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
          {filteredBookings.length === 0 && (
            <p className="px-1 text-[12px] text-gray-500">
              No bookings match your search or filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
