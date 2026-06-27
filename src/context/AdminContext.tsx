import React, { createContext, useContext, useMemo, useState } from 'react';
import { MOCK_ADMIN_USERS, MOCK_DISPUTES, MOCK_KYC_REQUESTS } from '../mocks';
import { User, DisputeStatus, KycStatus, UserStatus } from '../types';

export interface AdminDispute {
  id: string;
  bookingId: string;
  clientName: string;
  handymanName: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminKycRequest {
  id: string;
  handymanName: string;
  serviceCategory: string;
  submittedAt: string;
  status: KycStatus;
  riskScore: string;
}

interface AdminContextValue {
  users: User[];
  disputes: AdminDispute[];
  kycRequests: AdminKycRequest[];
  suspendUser: (userId: string) => void;
  approveKyc: (requestId: string) => void;
  rejectKyc: (requestId: string) => void;
  resolveDispute: (disputeId: string) => void;
  getUserById: (userId: string) => User | undefined;
  getDisputeById: (disputeId: string) => AdminDispute | undefined;
  pendingKycCount: number;
  activeDisputesCount: number;
  activeUsersCount: number;
  suspendedUsersCount: number;
}

const AdminContext = createContext<AdminContextValue>({
  users: [],
  disputes: [],
  kycRequests: [],
  suspendUser: () => {},
  approveKyc: () => {},
  rejectKyc: () => {},
  resolveDispute: () => {},
  getUserById: () => undefined,
  getDisputeById: () => undefined,
  pendingKycCount: 0,
  activeDisputesCount: 0,
  activeUsersCount: 0,
  suspendedUsersCount: 0,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(MOCK_ADMIN_USERS as User[]);
  const [disputes, setDisputes] = useState<AdminDispute[]>(
    MOCK_DISPUTES.map((dispute) => ({
      ...dispute,
      status: dispute.status as DisputeStatus,
      updatedAt: dispute.createdAt,
    }))
  );
  const [kycRequests, setKycRequests] = useState<AdminKycRequest[]>(
    MOCK_KYC_REQUESTS.map((request) => ({
      ...request,
      status: request.status as KycStatus,
    }))
  );

  const suspendUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, status: UserStatus.Suspended } : user))
    );
  };

  const approveKyc = (requestId: string) => {
    setKycRequests((prev) => prev.filter((request) => request.id !== requestId));
  };

  const rejectKyc = (requestId: string) => {
    setKycRequests((prev) => prev.filter((request) => request.id !== requestId));
  };

  const resolveDispute = (disputeId: string) => {
    setDisputes((prev) =>
      prev.map((dispute) =>
        dispute.id === disputeId
          ? { ...dispute, status: DisputeStatus.Resolved, updatedAt: new Date().toISOString() }
          : dispute
      )
    );
  };

  const pendingKycCount = kycRequests.length;
  const activeDisputesCount = disputes.filter(
    (dispute) => dispute.status === DisputeStatus.Open || dispute.status === DisputeStatus.InReview
  ).length;
  const activeUsersCount = users.filter((user) => user.status === UserStatus.Active).length;
  const suspendedUsersCount = users.filter((user) => user.status === UserStatus.Suspended).length;

  const value = useMemo(
    () => ({
      users,
      disputes,
      kycRequests,
      suspendUser,
      approveKyc,
      rejectKyc,
      resolveDispute,
      getUserById: (userId: string) => users.find((user) => user.id === userId),
      getDisputeById: (disputeId: string) => disputes.find((dispute) => dispute.id === disputeId),
      pendingKycCount,
      activeDisputesCount,
      activeUsersCount,
      suspendedUsersCount,
    }),
    [
      users,
      disputes,
      kycRequests,
      pendingKycCount,
      activeDisputesCount,
      activeUsersCount,
      suspendedUsersCount,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
