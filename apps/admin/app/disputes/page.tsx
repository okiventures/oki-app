"use client";

import { useMemo, useState } from "react";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Navbar } from "../components/Navbar";
import { SearchBar } from "../components/SearchBar";
import { MOCK_DISPUTES } from "../data/mockData";
import { formatDateTime } from "../utils";

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

export default function DisputesPage() {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);

  const filteredDisputes = useMemo(() => {
    return MOCK_DISPUTES.filter((item) => {
      const query = searchValue.toLowerCase();
      const matchesSearch =
        item.id.toLowerCase().includes(query) ||
        item.bookingId.toLowerCase().includes(query) ||
        item.clientName.toLowerCase().includes(query) ||
        item.handymanName.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" ? true : item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchValue, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      <Navbar title="Disputes" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="mb-3 px-2 text-[13px] font-bold text-gray-900">
          Active Resolutions
        </div>
        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by dispute ID, booking, client, or worker"
        />
        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          {DISPUTE_STATUS_OPTIONS.map((status) => (
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
          {filteredDisputes.map((dispute) => {
            const isExpanded = expandedDisputeId === dispute.id;
            return (
              <div
                key={dispute.id}
                onClick={() => setExpandedDisputeId(isExpanded ? null : dispute.id)}
                className="mb-3 cursor-pointer"
              >
                <Card className="p-3">
                  <div className="mb-2 flex flex-row items-center justify-between">
                    <Badge text={dispute.status} variant={statusVariant(dispute.status)} />
                    <p className="text-[11px] text-gray-400">ID: {dispute.id}</p>
                  </div>
                  <p className="mb-1 text-[15px] font-bold text-gray-900">{dispute.reason}</p>
                  <p className="mb-3 text-[13px] text-gray-600">
                    <span className="font-semibold text-gray-800">{dispute.clientName}</span> reported{' '}
                    <span className="font-semibold text-gray-800">{dispute.handymanName}</span>
                  </p>
                  <div className="flex flex-row gap-2">
                    <button
                      className="flex-1 items-center rounded-md bg-gray-100 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-200"
                    >
                      Details
                    </button>
                    <button
                      className="flex-1 items-center rounded-md bg-gray-900 py-2 text-[13px] font-bold text-white hover:bg-gray-800"
                    >
                      Resolve
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-[12px] text-gray-600">
                        Booking reference: {dispute.bookingId}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Reported at: {formatDateTime(dispute.createdAt)}
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Evidence: Chat log and uploaded photos available.
                      </p>
                      <p className="text-[12px] text-gray-600">
                        Admin actions: Confirm refund, request more information, or close dispute.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
          {filteredDisputes.length === 0 && (
            <p className="px-1 text-[12px] text-gray-500">
              No disputes match your search or filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
