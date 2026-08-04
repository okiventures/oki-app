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
  error: string | null;
  refresh: () => Promise<void>;
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
  error: null,
  refresh: async () => {},
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
    throw new Error(`KYC list request failed (${res.status})`);
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

// The admin console reads through the same PostgREST endpoints as everyone
// else — users_admin_all / disputes_select_participant widen the row set once
// is_admin() is true, so no service-role key ever reaches the client.
const DB_USER_STATUS_TO_UI: Record<string, UserStatus> = {
  ACTIVE: UserStatus.Active,
  SUSPENDED: UserStatus.Suspended,
  BANNED: UserStatus.Banned,
};

const DB_DISPUTE_STATUS_TO_UI: Record<string, DisputeStatus> = {
  OPEN: DisputeStatus.Open,
  IN_REVIEW: DisputeStatus.InReview,
  RESOLVED: DisputeStatus.Resolved,
  CLOSED: DisputeStatus.Closed,
};

function mapUserRow(row: Record<string, any>): User {
  return {
    id: row.id,
    name: row.full_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    photoUrl: row.photo_url ?? undefined,
    userType: row.user_type,
    status: DB_USER_STATUS_TO_UI[row.user_status] ?? UserStatus.Active,
    createdAt: row.created_at,
    lastActive: row.last_active_at ?? undefined,
  };
}

function mapDisputeRow(row: Record<string, any>): AdminDispute {
  return {
    id: row.id,
    bookingId: row.booking_id,
    clientName: row.bookings?.client?.full_name ?? '',
    // bookings.handyman_id points at handymen, so the name is one hop further
    // down than the client's. Unassigned bookings embed handyman as null.
    handymanName: row.bookings?.handyman?.user?.full_name ?? '',
    reason: row.description ?? row.issue_type ?? '',
    status: DB_DISPUTE_STATUS_TO_UI[row.status] ?? DisputeStatus.Open,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

// Offline demo only — with no backend configured the console still renders.
const USE_MOCK =
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const isAdmin = session?.user?.userType === 'admin';

  const [users, setUsers] = useState<User[]>(USE_MOCK ? (MOCK_ADMIN_USERS as User[]) : []);
  const [disputes, setDisputes] = useState<AdminDispute[]>(
    USE_MOCK
      ? MOCK_DISPUTES.map((dispute) => ({
          ...dispute,
          status: dispute.status as DisputeStatus,
          updatedAt: dispute.createdAt,
        }))
      : []
  );
  const [kycRequests, setKycRequests] = useState<AdminKycRequest[]>([]);
  const [kycStatus, setKycStatus] = useState('PENDING');
  const [loadingKyc, setLoadingKyc] = useState(true);
  // Every read here is RLS-gated, so a policy regression or a bad embed hint
  // comes back as an error rather than as fewer rows. Swallowing that into a
  // console.warn made the console render "0 users, no disputes" and look
  // healthy, which is the worst possible failure mode for a moderation tool.
  //
  // Three slices rather than one, because the table reads and the KYC fetch run
  // in independent effects: a single setter would let whichever resolved last
  // clear the other's error.
  const [readError, setReadError] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? readError ?? kycError;

  const refresh = useCallback(async () => {
    if (USE_MOCK) return;
    if (!isAdmin) {
      setUsers([]);
      setDisputes([]);
      return;
    }

    const [usersResult, disputesResult] = await Promise.all([
      supabase
        .from('users')
        .select(
          'id, full_name, email, phone, photo_url, user_type, user_status, created_at, last_active_at'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('disputes')
        .select(
          'id, booking_id, issue_type, description, status, created_at, updated_at, ' +
            'bookings!booking_id(' +
            'client:users!client_id(full_name),' +
            // bookings.handyman_id references handymen(id), not users(id).
            // `users!handyman_id` named a constraint that does not exist, and a
            // bad hint fails the WHOLE request with PGRST200 — the console showed
            // an empty disputes tab rather than an error.
            'handyman:handymen!handyman_id(user:users!id(full_name))' +
            ')'
        )
        .order('created_at', { ascending: false }),
    ]);

    if (!usersResult.error) {
      setUsers((usersResult.data ?? []).map(mapUserRow));
    }
    if (!disputesResult.error) {
      setDisputes((disputesResult.data ?? []).map(mapDisputeRow));
    }

    const failures = [
      usersResult.error && `users: ${usersResult.error.message}`,
      disputesResult.error && `disputes: ${disputesResult.error.message}`,
    ].filter(Boolean);

    setReadError(failures.length > 0 ? `Could not load ${failures.join('; ')}` : null);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAdmin || !session) {
      setKycRequests([]);
      setLoadingKyc(false);
      return;
    }
    setLoadingKyc(true);
    fetchKycRequests(session.accessToken, kycStatus)
      .then((requests) => {
        setKycRequests(requests);
        setKycError(null);
      })
      .catch((err: Error) => {
        setKycRequests([]);
        setKycError(`Could not load KYC requests: ${err.message}`);
      })
      .finally(() => setLoadingKyc(false));
  }, [isAdmin, session, kycStatus]);

  const suspendUser = useCallback(
    async (userId: string) => {
      const previousStatus = users.find((user) => user.id === userId)?.status ?? UserStatus.Active;

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, status: UserStatus.Suspended } : user))
      );

      if (USE_MOCK) return;

      const { error } = await supabase
        .from('users')
        .update({ user_status: 'SUSPENDED' })
        .eq('id', userId);

      if (error) {
        setActionError(`Could not suspend user: ${error.message}`);
        // Roll back this row only. Restoring a whole pre-call snapshot discarded
        // any other suspension that landed while this request was in flight.
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, status: previousStatus } : user))
        );
      } else {
        setActionError(null);
      }
    },
    [users]
  );

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

  const resolveDispute = useCallback(
    async (disputeId: string) => {
      const previous = disputes.find((dispute) => dispute.id === disputeId);

      setDisputes((prev) =>
        prev.map((dispute) =>
          dispute.id === disputeId
            ? { ...dispute, status: DisputeStatus.Resolved, updatedAt: new Date().toISOString() }
            : dispute
        )
      );

      if (USE_MOCK) return;

      const { error } = await supabase
        .from('disputes')
        .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
        .eq('id', disputeId);

      if (error) {
        setActionError(`Could not resolve dispute: ${error.message}`);
        // Roll back this row only, same reason as suspendUser.
        if (previous) {
          setDisputes((prev) =>
            prev.map((dispute) => (dispute.id === disputeId ? previous : dispute))
          );
        }
      } else {
        setActionError(null);
      }
    },
    [disputes]
  );

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
      error,
      refresh,
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
      error,
      refresh,
      suspendUser,
      resolveDispute,
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
