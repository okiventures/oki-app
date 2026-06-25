"use client";

import { useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Navbar } from "../components/Navbar";
import { SearchBar } from "../components/SearchBar";
import { MOCK_TRANSACTIONS } from "../data/mockData";
import { formatCurrency, formatDateTime } from "../utils";

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

export default function TransactionsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((item) => {
      const query = searchValue.toLowerCase();
      const matchesSearch =
        item.bookingId.toLowerCase().includes(query) ||
        item.clientName.toLowerCase().includes(query) ||
        item.handymanName.toLowerCase().includes(query) ||
        item.paymentMethod.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" ? true : item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchValue, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      <Navbar title="Transactions" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="mb-3 px-2 text-[13px] font-bold text-gray-900">
          Transaction log
        </div>
        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by booking, client, worker, or method"
        />
        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          {TRANSACTION_STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-2 ${
                statusFilter === status
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700"
              } text-[12px] font-semibold`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const isExpanded = expandedTransactionId === transaction.id;
            return (
              <div
                key={transaction.id}
                onClick={() => setExpandedTransactionId(isExpanded ? null : transaction.id)}
                className="mb-3 cursor-pointer"
              >
                <Card className="p-4">
                  <div className="mb-2 flex flex-row items-center justify-between">
                    <p className="text-[15px] font-bold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge text={transaction.status} variant={statusVariant(transaction.status)} />
                  </div>
                  <p className="mb-2 text-[13px] text-gray-600">
                    Booking {transaction.bookingId}
                  </p>
                  <div className="flex flex-row items-center justify-between">
                    <p className="text-[12px] text-gray-500">{transaction.paymentMethod}</p>
                    <p className="text-[11px] text-gray-400">
                      {formatDateTime(transaction.createdAt)}
                    </p>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-[12px] text-gray-600">
                        Authorized: {transaction.authorizedAt ? formatDateTime(transaction.authorizedAt) : 'N/A'}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Captured: {transaction.capturedAt ? formatDateTime(transaction.capturedAt) : 'N/A'}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Settled: {transaction.settledAt ? formatDateTime(transaction.settledAt) : 'N/A'}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Platform fee: {formatCurrency(transaction.platformFee)}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Net paid: {formatCurrency(transaction.netAmount)}
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <p className="px-1 text-[12px] text-gray-500">
              No transactions match your search or filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
