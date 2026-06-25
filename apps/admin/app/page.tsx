'use client';

import { Card } from './components/Card';
import { Chart } from './components/Chart';
import { Navbar } from './components/Navbar';
import {
  MOCK_ADMIN_STATS,
  MOCK_ADMIN_CHART_DATA,
  MOCK_ADMIN_FEED,
  MOCK_TRANSACTIONS,
} from './data/mockData';
import { formatCurrency, formatDateTime } from './utils';
import { Users, CreditCard, AlertTriangle, FileCheck } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <Navbar title="Admin Panel" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Card className="p-3">
            <Users size={20} className="mb-2 text-indigo-600" strokeWidth={2} fill="none" />
            <p className="text-[11px] font-medium text-gray-500">Active Users</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {MOCK_ADMIN_STATS.activeUsers.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] font-bold text-green-600">
              {MOCK_ADMIN_STATS.activeUsersGrowth}
            </p>
          </Card>
          <Card className="p-3">
            <CreditCard size={20} className="mb-2 text-emerald-600" strokeWidth={2} fill="none" />
            <p className="text-[11px] font-medium text-gray-500">Revenue</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(MOCK_ADMIN_STATS.totalRevenue)}
            </p>
            <p className="mt-1 text-[10px] font-bold text-green-600">
              {MOCK_ADMIN_STATS.revenueGrowth}
            </p>
          </Card>
          <Card className="p-3">
            <AlertTriangle size={20} className="mb-2 text-red-500" strokeWidth={2} fill="none" />
            <p className="text-[11px] font-medium text-gray-500">Active Disputes</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {MOCK_ADMIN_STATS.activeDisputes}
            </p>
            <p className="mt-1 text-[10px] font-bold text-red-600">Needs Attention</p>
          </Card>
          <Card className="p-3">
            <FileCheck size={20} className="mb-2 text-amber-500" strokeWidth={2} fill="none" />
            <p className="text-[11px] font-medium text-gray-500">Pending KYC</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{MOCK_ADMIN_STATS.pendingKYC}</p>
            <p className="mt-1 text-[10px] font-bold text-gray-500">In Queue</p>
          </Card>
        </div>

        <Chart
          title="Bookings + Revenue (7 days)"
          data={MOCK_ADMIN_CHART_DATA.revenue}
          labels={MOCK_ADMIN_CHART_DATA.labels}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex flex-row items-center justify-between">
              <p className="text-[13px] font-bold text-gray-900">Pending Transactions</p>
              <p className="text-[11px] text-gray-500">Latest updates</p>
            </div>
            {MOCK_TRANSACTIONS.slice(0, 3).map((transaction) => (
              <Card key={transaction.id} className="mb-3 p-3">
                <div className="mb-2 flex flex-row items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    {transaction.clientName} → {transaction.handymanName}
                  </p>
                  <p className="text-[11px] text-gray-500">{transaction.paymentMethod}</p>
                </div>
                <p className="mb-2 text-[13px] text-gray-600">Booking {transaction.bookingId}</p>
                <div className="flex flex-row items-center justify-between">
                  <p className="text-[13px] text-gray-800">{formatCurrency(transaction.amount)}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <div>
            <p className="mb-3 text-[13px] font-bold text-gray-900">Recent Activity</p>
            {MOCK_ADMIN_FEED.map((item) => (
              <Card key={item.id} className="mb-3 p-3">
                <p className="mb-1 text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mb-2 text-[13px] text-gray-600">{item.description}</p>
                <p className="text-[11px] text-gray-500">{formatDateTime(item.createdAt)}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <button className="bg-primary-600 hover:bg-primary-700 w-full cursor-pointer items-center rounded-2xl py-3 text-sm font-bold text-white transition-colors">
            View full analytics
          </button>
        </div>
      </div>
    </div>
  );
}
