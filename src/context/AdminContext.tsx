import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MOCK_ADMIN_USERS, MOCK_DISPUTES } from '../mocks';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { User, DisputeStatus, UserStatus } from '../types';

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

export interface AdminKycDocument {
  id: string;
  type: string;
  label: string;
  url: string | null;
  status: string;
}

export interface AdminKycRequest {
  handymanId: string;
  handymanName: string;
  handymanEmail: string;
  submittedAt: string;
  documents: AdminKycDocument[];
}

interface AdminContextValue {
  users: User[];
  disputes: AdminDispute[];
  kycRequests: AdminKycRequest[];
  suspendUser: (userId: string) => void;
  approveKyc: (requestId: string) => Promise<void>;
  rejectKyc: (requestId: string, reason?: string) => Promise<void>;
  approveHandyman: (handymanId: string) => Promise<void>;
  rejectHandyman: (handymanId: string, reason?: string) => Promise<void>;
  resolveDispute: (disputeId: string) => void;
  getUserById: (userId: string) => User | undefined;
  getDisputeById: (disputeId: string) => AdminDispute | undefined;
  pendingKycCount: number;
  kycStatus: string;
  setKycStatus: (status: string) => void;
  activeDisputesCount: number;
  activeUsersCount: number;
  suspendedUsersCount: number;
  loadingKyc: boolean;
}

const AdminContext = createContext<AdminContextValue>({
  users: [],
  disputes: [],
  kycRequests: [],
  suspendUser: () => {},
  approveKyc: async () => {},
  rejectKyc: async () => {},
  approveHandyman: async () => {},
  rejectHandyman: async () => {},
  resolveDispute: () => {},
  getUserById: () => undefined,
  getDisputeById: () => undefined,
  pendingKycCount: 0,
  kycStatus: 'PENDING',
  setKycStatus: () => {},
  activeDisputesCount: 0,
  activeUsersCount: 0,
  suspendedUsersCount: 0,
  loadingKyc: false,
});

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not authenticated');
  return data.session.access_token;
}

async function fetchKycRequests(token: string, status = 'PENDING'): Promise<AdminKycRequest[]> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/kyc-admin-list?status=${encodeURIComponent(status)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    console.error('[Admin] KYC fetch failed:', res.status);
    return [];
  }
  const body = await res.json();
  return (body.data ?? []).map((item: Record<string, unknown>) => ({
    handymanId: (item.handyman_id as string) ?? '',
    handymanName: (item.handyman_name as string) ?? 'Unknown',
    handymanEmail: (item.handyman_email as string) ?? '',
    submittedAt: (item.submitted_at as string) ?? '',
    documents: Array.isArray(item.documents)
      ? (item.documents as Record<string, unknown>[]).map((doc) => ({
          id: doc.id as string,
          type: doc.type as string,
          label: doc.label as string,
          url: (doc.url as string) ?? null,
          status: (doc.status as string) ?? 'PENDING',
        }))
      : [],
  }));
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>(MOCK_ADMIN_USERS as User[]);
  const [disputes, setDisputes] = useState<AdminDispute[]>(
    MOCK_DISPUTES.map((dispute) => ({
      ...dispute,
      status: dispute.status as DisputeStatus,
      updatedAt: dispute.createdAt,
    }))
  );
  const [kycRequests, setKycRequests] = useState<AdminKycRequest[]>([]);
  const [kycStatus, setKycStatus] = useState('PENDING');
  const [loadingKyc, setLoadingKyc] = useState(true);

  useEffect(() => {
    const isAdmin = session?.user?.userType === 'admin';
    if (!isAdmin) {
      setKycRequests([]);
      setLoadingKyc(false);
      return;
    }
    setLoadingKyc(true);
    fetchKycRequests(session.accessToken, kycStatus)
      .then(setKycRequests)
      .catch((err) => console.error('[Admin] KYC fetch error:', err))
      .finally(() => setLoadingKyc(false));
  }, [session, kycStatus]);

  const suspendUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, status: UserStatus.Suspended } : user))
    );
  };

  const approveKyc = useCallback(async (docId: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kyc-admin-review/${docId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      if (!res.ok) throw new Error('Failed to approve KYC');
      setKycRequests((prev) =>
        prev
          .map((r) => ({
            ...r,
            documents: r.documents.filter((d) => d.id !== docId),
          }))
          .filter((r) => r.documents.length > 0)
      );
    } catch (err) {
      console.error('Approve KYC error:', err);
    }
  }, []);

  const rejectKyc = useCallback(async (docId: string, reason?: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kyc-admin-review/${docId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'REJECT', reason: reason ?? 'Rejected by admin' }),
      });
      if (!res.ok) throw new Error('Failed to reject KYC');
      setKycRequests((prev) =>
        prev
          .map((r) => ({
            ...r,
            documents: r.documents.filter((d) => d.id !== docId),
          }))
          .filter((r) => r.documents.length > 0)
      );
    } catch (err) {
      console.error('Reject KYC error:', err);
    }
  }, []);

  const approveHandyman = useCallback(async (handymanId: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kyc-admin-bulk-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handyman_id: handymanId, action: 'APPROVE' }),
      });
      if (!res.ok) throw new Error('Failed to approve handyman');
      setKycRequests((prev) => prev.filter((r) => r.handymanId !== handymanId));
    } catch (err) {
      console.error('Approve handyman error:', err);
    }
  }, []);

  const rejectHandyman = useCallback(async (handymanId: string, reason?: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kyc-admin-bulk-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          handyman_id: handymanId,
          action: 'REJECT',
          reason: reason ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to reject handyman');
      setKycRequests((prev) => prev.filter((r) => r.handymanId !== handymanId));
    } catch (err) {
      console.error('Reject handyman error:', err);
    }
  }, []);

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
      approveHandyman,
      rejectHandyman,
      resolveDispute,
      getUserById: (userId: string) => users.find((user) => user.id === userId),
      getDisputeById: (disputeId: string) => disputes.find((dispute) => dispute.id === disputeId),
      pendingKycCount,
      kycStatus,
      setKycStatus,
      activeDisputesCount,
      activeUsersCount,
      suspendedUsersCount,
      loadingKyc,
    }),
    [
      users,
      disputes,
      kycRequests,
      approveKyc,
      rejectKyc,
      approveHandyman,
      rejectHandyman,
      pendingKycCount,
      kycStatus,
      activeDisputesCount,
      activeUsersCount,
      suspendedUsersCount,
      loadingKyc,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
